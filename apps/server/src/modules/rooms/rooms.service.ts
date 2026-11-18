import { presetFor } from '@werewolf/game-engine';
import {
  defaultRoomSettings,
  type Locale,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type RoleCounts,
  type RoomSettings,
  type RoomSettingsPatch,
  RoomSettingsSchema,
  type RoomSummary,
  type RoomView,
} from '@werewolf/shared';
import { Types } from 'mongoose';
import { AppError } from '../../lib/errors';
import { newRoomCode } from '../../lib/ids';
import type { Presence } from '../../lib/presence';
import type { IO } from '../../plugins/socket';
import { Room, type RoomDoc } from './room.model';

export interface Actor {
  userId: string;
  displayName: string;
}

/** What RoomsService needs from the game module (avoids a circular import). */
export interface GameStarter {
  /** Creates the game with `room.currentGameId` as its id (set atomically when the room was locked). */
  start(room: RoomDoc, roles: RoleCounts): Promise<string>;
}

export const roomChannel = (roomId: string) => `room:${roomId}`;
export const userChannel = (userId: string) => `user:${userId}`;

function mergeSettings(current: RoomSettings, patch: RoomSettingsPatch | undefined): RoomSettings {
  const result = RoomSettingsSchema.safeParse({
    roles: patch?.roles ?? current.roles,
    rules: { ...current.rules, ...patch?.rules },
    timers: { ...current.timers, ...patch?.timers },
    voice: patch?.voice ?? current.voice,
    captions: patch?.captions ?? current.captions,
  });
  if (!result.success) {
    throw new AppError('VALIDATION_FAILED', 'Invalid room settings', result.error.issues);
  }
  return result.data;
}

export class RoomsService {
  private games: GameStarter | null = null;

  constructor(
    private readonly io: IO,
    private readonly presence: Presence,
  ) {}

  setGameStarter(games: GameStarter) {
    this.games = games;
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  toView(room: RoomDoc): RoomView {
    return {
      id: String(room._id),
      code: room.code,
      name: room.name,
      hostId: String(room.hostId),
      visibility: room.visibility,
      lang: room.lang,
      status: room.status,
      settings: room.settings,
      autoRoles: room.autoRoles,
      members: [...room.members]
        .sort((a, b) => a.seat - b.seat)
        .map((m) => ({
          userId: String(m.userId),
          displayName: m.displayName,
          seat: m.seat,
          ready: m.ready,
          online: this.presence.isOnline(String(m.userId)),
        })),
      maxPlayers: MAX_PLAYERS,
      currentGameId: room.currentGameId ? String(room.currentGameId) : null,
    };
  }

  async getById(roomId: string): Promise<RoomDoc> {
    const room = Types.ObjectId.isValid(roomId)
      ? await Room.findById(roomId).lean<RoomDoc>()
      : null;
    if (!room) throw new AppError('NOT_FOUND', 'Room not found');
    return room;
  }

  async getByCode(code: string): Promise<RoomDoc> {
    const room = await Room.findOne({ code: code.toUpperCase() }).lean<RoomDoc>();
    if (!room || room.status === 'closed') throw new AppError('NOT_FOUND', 'Room not found');
    return room;
  }

  async listPublic(lang?: string): Promise<RoomSummary[]> {
    const rooms = await Room.find({
      visibility: 'public',
      status: 'lobby',
      ...(lang ? { lang } : {}),
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean<RoomDoc[]>();
    return rooms.map((r) => ({
      code: r.code,
      name: r.name,
      lang: r.lang,
      players: r.members.length,
      maxPlayers: MAX_PLAYERS,
    }));
  }

  async broadcast(roomId: string) {
    const room = await Room.findById(roomId).lean<RoomDoc>();
    if (room) this.io.to(roomChannel(roomId)).emit('room:state', this.toView(room));
  }

  // ── Commands ───────────────────────────────────────────────────────────────

  async create(
    actor: Actor,
    input: {
      name?: string;
      visibility: 'public' | 'private';
      lang?: Locale;
      settings?: RoomSettingsPatch;
    },
  ): Promise<RoomView> {
    const settings = mergeSettings(defaultRoomSettings(), input.settings);
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const room = await Room.create({
          code: newRoomCode(),
          name: input.name ?? `${actor.displayName}'s room`,
          hostId: actor.userId,
          visibility: input.visibility,
          lang: input.lang ?? 'en',
          settings,
          autoRoles: !input.settings?.roles,
          members: [{ userId: actor.userId, displayName: actor.displayName, seat: 1 }],
        });
        return this.toView(room.toObject() as RoomDoc);
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error; // retry on code collision
      }
    }
    throw new AppError('INTERNAL', 'Could not allocate a room code');
  }

  /** Joins (or re-joins) a room. Members may always re-join; new members only in the lobby. */
  async join(actor: Actor, code: string): Promise<RoomDoc> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const room = await this.getByCode(code);
      if (room.members.some((m) => String(m.userId) === actor.userId)) return room;
      if (room.status !== 'lobby') throw new AppError('ROOM_NOT_IN_LOBBY', 'The game has started');
      if (room.members.length >= MAX_PLAYERS) throw new AppError('ROOM_FULL', 'Room is full');

      const taken = new Set(room.members.map((m) => m.seat));
      const seat = Array.from({ length: MAX_PLAYERS }, (_, i) => i + 1).find((s) => !taken.has(s));
      const updated = await Room.findOneAndUpdate(
        {
          _id: room._id,
          status: 'lobby',
          'members.userId': { $ne: new Types.ObjectId(actor.userId) },
          'members.seat': { $ne: seat },
          [`members.${MAX_PLAYERS - 1}`]: { $exists: false },
        },
        {
          $push: {
            members: { userId: actor.userId, displayName: actor.displayName, seat, ready: false },
          },
        },
        { returnDocument: 'after' },
      ).lean<RoomDoc>();
      if (updated) {
        await this.broadcast(String(updated._id));
        return updated;
      }
    }
    throw new AppError('CONFLICT', 'Room changed while joining, try again');
  }

  async leave(actor: Actor, roomId: string) {
    const room = await this.getById(roomId);
    if (room.status === 'in_game') {
      throw new AppError('CONFLICT', 'You cannot leave while the game is running');
    }
    const remaining = room.members.filter((m) => String(m.userId) !== actor.userId);
    const update: Record<string, unknown> = {
      $pull: { members: { userId: new Types.ObjectId(actor.userId) } },
    };
    if (remaining.length === 0) {
      update.$set = { status: 'closed' };
    } else if (String(room.hostId) === actor.userId) {
      const nextHost = [...remaining].sort((a, b) => +a.joinedAt - +b.joinedAt)[0];
      update.$set = { hostId: nextHost?.userId };
    }
    await Room.updateOne({ _id: room._id }, update);
    await this.broadcast(roomId);
  }

  async setReady(actor: Actor, roomId: string, ready: boolean) {
    const res = await Room.updateOne(
      { _id: roomId, status: 'lobby', 'members.userId': new Types.ObjectId(actor.userId) },
      { $set: { 'members.$.ready': ready } },
    );
    if (res.matchedCount === 0) throw new AppError('ROOM_NOT_IN_LOBBY', 'Not in a lobby');
    await this.broadcast(roomId);
  }

  /**
   * Validates the merged result, but writes ONLY the fields present in the patch. Writing the
   * whole settings object would let concurrent updates (a host editing several fields quickly)
   * overwrite each other.
   */
  async updateSettings(actor: Actor, roomId: string, patch: RoomSettingsPatch): Promise<RoomView> {
    const room = await this.requireHostInLobby(actor, roomId);
    const merged = mergeSettings(room.settings, patch);
    const $set: Record<string, unknown> = {};
    for (const key of Object.keys(patch.rules ?? {}) as (keyof RoomSettings['rules'])[]) {
      $set[`settings.rules.${key}`] = merged.rules[key];
    }
    for (const key of Object.keys(patch.timers ?? {}) as (keyof RoomSettings['timers'])[]) {
      $set[`settings.timers.${key}`] = merged.timers[key];
    }
    if (patch.roles) $set['settings.roles'] = merged.roles;
    if (patch.voice !== undefined) $set['settings.voice'] = merged.voice;
    if (patch.captions !== undefined) $set['settings.captions'] = merged.captions;
    if (patch.autoRoles !== undefined) $set.autoRoles = patch.autoRoles;
    else if (patch.roles) $set.autoRoles = false;

    const updated = await Room.findOneAndUpdate(
      { _id: room._id, status: 'lobby' },
      { $set },
      { returnDocument: 'after' },
    ).lean<RoomDoc>();
    if (!updated) throw new AppError('ROOM_NOT_IN_LOBBY', 'The game has started');
    await this.broadcast(roomId);
    return this.toView(updated);
  }

  async kick(actor: Actor, roomId: string, targetId: string) {
    const room = await this.requireHostInLobby(actor, roomId);
    if (targetId === actor.userId) throw new AppError('VALIDATION_FAILED', 'Cannot kick yourself');
    if (!room.members.some((m) => String(m.userId) === targetId)) {
      throw new AppError('NOT_FOUND', 'Player is not in this room');
    }
    await Room.updateOne(
      { _id: room._id },
      { $pull: { members: { userId: new Types.ObjectId(targetId) } } },
    );
    this.io.to(userChannel(targetId)).emit('room:kicked', { roomId });
    this.io.in(userChannel(targetId)).socketsLeave(roomChannel(roomId));
    await this.broadcast(roomId);
  }

  /** Host starts the game: ≥ 6 players, everyone else ready, valid role set. */
  async start(actor: Actor, roomId: string): Promise<{ gameId: string }> {
    if (!this.games) throw new AppError('INTERNAL', 'Game module not wired');
    const room = await this.requireHostInLobby(actor, roomId);
    const count = room.members.length;
    if (count < MIN_PLAYERS) {
      throw new AppError('INVALID_ROLE_SET', `At least ${MIN_PLAYERS} players are needed`);
    }
    const notReady = room.members.filter((m) => !m.ready && String(m.userId) !== actor.userId);
    if (notReady.length > 0) {
      throw new AppError('CONFLICT', 'Not everyone is ready', {
        notReady: notReady.map((m) => String(m.userId)),
      });
    }
    const roles = room.autoRoles ? presetFor(count) : room.settings.roles;

    const locked = await Room.findOneAndUpdate(
      { _id: room._id, status: 'lobby' },
      { $set: { status: 'in_game', currentGameId: new Types.ObjectId() } },
      { returnDocument: 'after' },
    ).lean<RoomDoc>();
    if (!locked) throw new AppError('CONFLICT', 'The game has already started');

    try {
      const gameId = await this.games.start(locked, roles);
      await this.broadcast(roomId);
      return { gameId };
    } catch (error) {
      await Room.updateOne({ _id: room._id }, { $set: { status: 'lobby', currentGameId: null } });
      throw error;
    }
  }

  /** Called when a game ends: everyone returns to the lobby, not ready (FR-ROOM-07). */
  async backToLobby(roomId: string) {
    await Room.updateOne(
      { _id: roomId },
      { $set: { status: 'lobby', currentGameId: null, 'members.$[].ready': false } },
    );
    await this.broadcast(roomId);
  }

  private async requireHostInLobby(actor: Actor, roomId: string) {
    const room = await this.getById(roomId);
    if (String(room.hostId) !== actor.userId)
      throw new AppError('NOT_HOST', 'Only the host can do this');
    if (room.status !== 'lobby') throw new AppError('ROOM_NOT_IN_LOBBY', 'The game has started');
    return room;
  }
}
