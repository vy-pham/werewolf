import type { GameState } from '@werewolf/game-engine';
import type { EventAudience, GameEventType } from '@werewolf/shared';
import { model, Schema, type Types } from 'mongoose';

const gameSchema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, required: true },
    status: { type: String, enum: ['running', 'finished'], default: 'running' },
    /** Optimistic concurrency: every write is `findOneAndUpdate({ _id, version })` + `$inc`. */
    version: { type: Number, default: 0 },
    /** RNG seed; the engine RNG for each step is derived from (seed, version). */
    seed: { type: Number, required: true },
    /** Number of events written to game_events so far (= last seq). */
    eventSeq: { type: Number, default: 0 },
    players: {
      type: [
        new Schema(
          {
            userId: { type: Schema.Types.ObjectId, required: true },
            displayName: { type: String, required: true },
            seat: { type: Number, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    /** Authoritative engine state (plain JSON). Never sent to clients — see projectFor. */
    state: { type: Schema.Types.Mixed, required: true },
    winner: { type: String, default: null },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false },
);

gameSchema.index({ roomId: 1, createdAt: -1 });
gameSchema.index({ status: 1 });
gameSchema.index({ 'players.userId': 1, status: 1 });

export interface GameDoc {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  status: 'running' | 'finished';
  version: number;
  seed: number;
  eventSeq: number;
  players: { userId: Types.ObjectId; displayName: string; seat: number }[];
  state: GameState;
  winner: string | null;
  endedAt: Date | null;
  createdAt: Date;
}

export const Game = model('Game', gameSchema);

/** Append-only event log: reconnect catch-up, replay and debugging (NFR-11). */
const gameEventSchema = new Schema(
  {
    gameId: { type: Schema.Types.ObjectId, required: true },
    seq: { type: Number, required: true },
    type: { type: String, required: true },
    audience: { type: Schema.Types.Mixed, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    at: { type: Date, required: true },
  },
  { minimize: false, versionKey: false },
);
gameEventSchema.index({ gameId: 1, seq: 1 }, { unique: true });

export interface GameEventDoc {
  gameId: Types.ObjectId;
  seq: number;
  type: GameEventType;
  audience: EventAudience;
  payload: unknown;
  at: Date;
}

export const GameEventLog = model('GameEvent', gameEventSchema, 'game_events');
