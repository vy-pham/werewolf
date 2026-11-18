import { randomInt } from 'node:crypto';
import {
  createGame,
  createRng,
  dispatch,
  type EngineInput,
  type GameState,
  projectFor,
} from '@werewolf/game-engine';
import {
  type ChatMessageView,
  type DeliveredGameEvent,
  type GameCommand,
  type GameEvent,
  type GameSyncResult,
  ROLE_TEAM,
  type RoleCounts,
} from '@werewolf/shared';
import type { FastifyBaseLogger } from 'fastify';
import { Types } from 'mongoose';
import type { Clock } from '../../lib/clock';
import { AppError } from '../../lib/errors';
import type { IO } from '../../plugins/socket';
import type { RoomDoc } from '../rooms/room.model';
import { userChannel } from '../rooms/rooms.service';
import { User } from '../users/user.model';
import { canSee, recipientsOf } from './delivery';
import { Game, type GameDoc, type GameEventDoc, GameEventLog } from './game.model';
import type { PhaseScheduler } from './phase-scheduler';

const MAX_WRITE_ATTEMPTS = 3;

export interface GamesDeps {
  io: IO;
  clock: Clock;
  scheduler: PhaseScheduler;
  log: FastifyBaseLogger;
  /** After every state change (voice permissions follow the game). */
  onStateChanged?: (game: GameDoc) => Promise<void>;
  onFinished: (game: GameDoc) => Promise<void>;
  recentChat: (game: GameDoc, userId: string) => Promise<ChatMessageView[]>;
}

/**
 * Runs games: loads state, calls the pure engine, writes atomically (version check), logs events,
 * then routes each event by audience and sends every player their own projected view.
 */
export class GamesService {
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(private readonly deps: GamesDeps) {
    deps.scheduler.setHandler((gameId, version) => this.onTimeout(gameId, version));
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async start(room: RoomDoc, roles: RoleCounts): Promise<string> {
    const members = [...room.members].sort((a, b) => a.seat - b.seat);
    const seed = randomInt(2 ** 31);
    const result = createGame(
      {
        players: members.map((m) => ({ id: String(m.userId), seat: m.seat })),
        settings: { roles, rules: room.settings.rules, timers: room.settings.timers },
      },
      { now: this.deps.clock.now(), rng: createRng(seed) },
    );
    if (!result.ok)
      throw new AppError(result.error.code, result.error.message, result.error.details);

    if (!room.currentGameId) throw new AppError('INTERNAL', 'Room has no game id');
    const game = await Game.create({
      _id: room.currentGameId,
      roomId: room._id,
      seed,
      version: 0,
      eventSeq: result.events.length,
      players: members.map((m) => ({ userId: m.userId, displayName: m.displayName, seat: m.seat })),
      state: result.state,
    });
    const doc = game.toObject() as GameDoc;
    const gameId = String(doc._id);
    for (const p of result.state.players) {
      this.deps.io.to(userChannel(p.id)).emit('game:started', { gameId });
    }
    await this.recordAndPublish(doc, result.events, 0);
    await this.deps.onStateChanged?.(doc);
    this.deps.scheduler.schedule(gameId, doc.version, result.state.phase.endsAt);
    return gameId;
  }

  /** Re-arms phase timers for every running game (server restart, NFR-05). */
  async recoverTimers(): Promise<number> {
    const running = await Game.find({ status: 'running' }, { version: 1, 'state.phase': 1 }).lean<
      Pick<GameDoc, '_id' | 'version' | 'state'>[]
    >();
    for (const g of running) {
      this.deps.scheduler.schedule(String(g._id), g.version, g.state.phase.endsAt);
    }
    return running.length;
  }

  // ── Inputs ─────────────────────────────────────────────────────────────────

  async act(userId: string, gameId: string, command: GameCommand) {
    await this.apply(gameId, { kind: 'command', actorId: userId, command });
  }

  async onTimeout(gameId: string, version: number) {
    try {
      await this.apply(gameId, { kind: 'timeout' }, version);
    } catch (error) {
      this.deps.log.error({ err: error, gameId }, 'phase timeout failed');
    }
  }

  // ── Reads ──────────────────────────────────────────────────────────────────

  async load(gameId: string): Promise<GameDoc> {
    const game = Types.ObjectId.isValid(gameId)
      ? await Game.findById(gameId).lean<GameDoc>()
      : null;
    if (!game) throw new AppError('NOT_FOUND', 'Game not found');
    return game;
  }

  /** Reconnect catch-up (FR-GAME-10): current view + missed events + recent chat. */
  async sync(userId: string, gameId: string, lastSeq: number): Promise<GameSyncResult> {
    const game = await this.load(gameId);
    if (!game.state.players.some((p) => p.id === userId)) {
      throw new AppError('FORBIDDEN', 'You are not a player in this game');
    }
    const logged = await GameEventLog.find({ gameId: game._id, seq: { $gt: lastSeq } })
      .sort({ seq: 1 })
      .limit(500)
      .lean<GameEventDoc[]>();
    const events = logged
      .filter((e) => canSee(e.audience, game.state, userId))
      .map((e) => ({ gameId, seq: e.seq, type: e.type, payload: e.payload }) as DeliveredGameEvent);
    return {
      view: projectFor(game.state, userId),
      events,
      chat: await this.deps.recentChat(game, userId),
    };
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  /** Serializes work per game inside this instance; the version check covers other instances. */
  private serialize<T>(gameId: string, work: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(gameId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(work);
    this.queues.set(gameId, next);
    void next
      .catch(() => undefined)
      .finally(() => {
        if (this.queues.get(gameId) === next) this.queues.delete(gameId);
      });
    return next;
  }

  private apply(gameId: string, input: EngineInput, expectedVersion?: number): Promise<void> {
    return this.serialize(gameId, async () => {
      for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
        const game = await this.load(gameId);
        if (expectedVersion !== undefined && game.version !== expectedVersion) return; // stale timer
        if (game.status !== 'running') {
          if (input.kind === 'timeout') return;
          throw new AppError('CONFLICT', 'The game is over');
        }

        const now = this.deps.clock.now();
        const result = dispatch(game.state, input, {
          now,
          rng: createRng((game.seed + game.version * 2654435761) >>> 0),
        });
        if (!result.ok) {
          if (input.kind === 'timeout') {
            // Fired a little early (clock skew): try again at endsAt.
            this.deps.scheduler.schedule(gameId, game.version, game.state.phase.endsAt);
            return;
          }
          throw new AppError(result.error.code, result.error.message, result.error.details);
        }

        const finished = result.state.phase.name === 'GAME_OVER';
        const updated = await Game.findOneAndUpdate(
          { _id: game._id, version: game.version },
          {
            $set: {
              state: result.state,
              ...(finished
                ? { status: 'finished', winner: result.state.winner, endedAt: new Date(now) }
                : {}),
            },
            $inc: { version: 1, eventSeq: result.events.length },
          },
          { returnDocument: 'after' },
        ).lean<GameDoc>();
        if (!updated) continue; // someone else wrote first: reload and re-validate

        await this.recordAndPublish(updated, result.events, game.eventSeq);
        await this.deps.onStateChanged?.(updated);
        if (finished) {
          this.deps.scheduler.cancel(gameId);
          await this.finish(updated);
        } else {
          this.deps.scheduler.schedule(gameId, updated.version, updated.state.phase.endsAt);
        }
        return;
      }
      throw new AppError('CONFLICT', 'The game is busy, please retry');
    });
  }

  private async recordAndPublish(game: GameDoc, events: GameEvent[], baseSeq: number) {
    const gameId = String(game._id);
    const at = new Date(this.deps.clock.now());
    const docs = events.map((e, i) => ({
      gameId: game._id,
      seq: baseSeq + i + 1,
      type: e.type,
      audience: e.audience,
      payload: e.payload,
      at,
    }));
    if (docs.length > 0) await GameEventLog.insertMany(docs);

    const { io } = this.deps;
    for (const doc of docs) {
      const delivered = {
        gameId,
        seq: doc.seq,
        type: doc.type,
        payload: doc.payload,
      } as DeliveredGameEvent;
      for (const userId of recipientsOf(doc.audience, game.state)) {
        io.to(userChannel(userId)).emit('game:event', delivered);
      }
    }
    for (const p of game.state.players) {
      io.to(userChannel(p.id)).emit('game:state', { gameId, view: projectFor(game.state, p.id) });
    }
  }

  private async finish(game: GameDoc) {
    await updateStats(game.state);
    await this.deps.onFinished(game);
  }
}

async function updateStats(state: GameState) {
  if (!state.winner) return;
  await User.bulkWrite(
    state.players.map((p) => {
      const won = ROLE_TEAM[p.role] === state.winner ? 1 : 0;
      return {
        updateOne: {
          filter: { _id: new Types.ObjectId(p.id) },
          update: {
            $inc: {
              'stats.games': 1,
              'stats.wins': won,
              [`stats.byRole.${p.role}.games`]: 1,
              [`stats.byRole.${p.role}.wins`]: won,
            },
          },
        },
      };
    }),
  );
}
