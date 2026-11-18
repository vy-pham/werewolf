import { type GameState, voicePermissions } from '@werewolf/game-engine';
import type { Channel, ChannelGrant, VoiceGrants, VoiceJoinInfo } from '@werewolf/shared';
import type { FastifyBaseLogger } from 'fastify';
import { AppError } from '../../lib/errors';
import type { IO } from '../../plugins/socket';
import type { GameDoc } from '../games/game.model';
import type { RoomDoc } from '../rooms/room.model';
import { userChannel } from '../rooms/rooms.service';
import type { VoiceProvider } from './voice.provider';

const TALK: ChannelGrant = { publish: true, subscribe: true };
const NONE: ChannelGrant = { publish: false, subscribe: false };

export const lobbyVoiceRoom = (roomId: string) => `room-${roomId}-lobby`;
export const gameVoiceRoom = (gameId: string, channel: Channel) => `game-${gameId}-${channel}`;

/** Voice rooms a player may connect to in a game. Permissions inside them change by phase. */
export function eligibleChannels(state: GameState, userId: string): Channel[] {
  const p = state.players.find((x) => x.id === userId);
  if (!p) return [];
  const channels: Channel[] = ['main'];
  if (p.role === 'werewolf') channels.push('wolves');
  if (!p.alive) channels.push('dead');
  return channels;
}

/**
 * Voice chat (docs/03-technical-design.md §6). The engine decides who may speak / listen
 * (`voicePermissions`); this service turns that into LiveKit tokens and pushes permission changes
 * to connected participants, so a client can never hear or speak where the rules forbid it.
 */
export class VoiceService {
  /** gameId → userId → last grants pushed (JSON), to avoid redundant LiveKit calls. */
  private readonly pushed = new Map<string, Map<string, string>>();

  constructor(
    private readonly provider: VoiceProvider,
    private readonly io: IO,
    private readonly log: FastifyBaseLogger,
  ) {}

  /** Tokens + grants for the player's current context (lobby or game). */
  async joinInfo(
    user: { userId: string; displayName: string },
    room: RoomDoc,
    game: GameDoc | null,
  ): Promise<VoiceJoinInfo> {
    if (!room.members.some((m) => String(m.userId) === user.userId)) {
      throw new AppError('FORBIDDEN', 'You are not in this room');
    }
    if (!room.settings.voice) {
      return { enabled: false, url: this.provider.url, connections: [], grants: {} };
    }
    const plan: { channel: Channel; room: string; grant: ChannelGrant }[] =
      game && game.status === 'running'
        ? this.gamePlan(game, user.userId)
        : [{ channel: 'lobby', room: lobbyVoiceRoom(String(room._id)), grant: TALK }];

    const connections = await Promise.all(
      plan.map(async (p) => ({
        channel: p.channel,
        room: p.room,
        token: await this.provider.createToken({
          room: p.room,
          identity: user.userId,
          name: user.displayName,
          grant: p.grant,
        }),
      })),
    );
    return {
      enabled: true,
      url: this.provider.url,
      connections,
      grants: Object.fromEntries(plan.map((p) => [p.channel, p.grant])),
    };
  }

  /** After every game state change: push changed permissions to LiveKit and notify clients. */
  async syncGame(game: GameDoc, roomId: string) {
    const gameId = String(game._id);
    const cache = this.pushed.get(gameId) ?? new Map<string, string>();
    this.pushed.set(gameId, cache);
    const firstSync = cache.size === 0;

    const jobs: Promise<void>[] = [];
    for (const player of game.state.players) {
      const plan = this.gamePlan(game, player.id);
      const grants: VoiceGrants = Object.fromEntries(plan.map((p) => [p.channel, p.grant]));
      const key = JSON.stringify(grants);
      if (cache.get(player.id) === key) continue;
      cache.set(player.id, key);
      for (const p of plan) jobs.push(this.provider.setPermissions(p.room, player.id, p.grant));
      // Starting the game: nobody keeps talking in the lobby voice room.
      if (firstSync)
        jobs.push(this.provider.setPermissions(lobbyVoiceRoom(roomId), player.id, NONE));
      this.io.to(userChannel(player.id)).emit('voice:update', { grants });
    }
    await this.settle(jobs, gameId);
    if (game.status === 'finished') this.pushed.delete(gameId);
  }

  /** Back in the lobby after a game: game voice rooms close, lobby voice reopens. */
  async syncLobby(room: RoomDoc, finishedGame: GameDoc | null) {
    const jobs: Promise<void>[] = [];
    for (const m of room.members) {
      const userId = String(m.userId);
      if (finishedGame) {
        for (const channel of eligibleChannels(finishedGame.state, userId)) {
          jobs.push(
            this.provider.setPermissions(
              gameVoiceRoom(String(finishedGame._id), channel),
              userId,
              NONE,
            ),
          );
        }
      }
      jobs.push(this.provider.setPermissions(lobbyVoiceRoom(String(room._id)), userId, TALK));
      this.io.to(userChannel(userId)).emit('voice:update', { grants: { lobby: TALK } });
    }
    await this.settle(jobs, String(room._id));
  }

  private gamePlan(game: GameDoc, userId: string) {
    const grants = voicePermissions(game.state, userId);
    return eligibleChannels(game.state, userId).map((channel) => ({
      channel,
      room: gameVoiceRoom(String(game._id), channel),
      grant: grants[channel as keyof typeof grants] ?? NONE,
    }));
  }

  private async settle(jobs: Promise<void>[], context: string) {
    const results = await Promise.allSettled(jobs);
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      this.log.warn(
        { context, failed: failed.length, reason: (failed[0] as PromiseRejectedResult).reason },
        'voice permission sync failed',
      );
    }
  }
}
