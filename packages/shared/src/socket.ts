import { z } from 'zod';
import { RoomCodeSchema, type RoomSettingsPatch, type RoomView } from './api';
import type { AppErrorBody } from './errors';
import { GameCommandSchema, type GameEventPayloads, type PlayerView } from './game';
import { CHANNELS, type Channel } from './phases';

/** Every client→server event acknowledges with either `{ ok: true, data }` or `{ ok: false, error }`. */
export type AckResult<T = null> = { ok: true; data: T } | { ok: false; error: AppErrorBody };
export type Ack<T = null> = (result: AckResult<T>) => void;

// ── Client → server payloads (validated on the server with these schemas) ────

export const RoomJoinSchema = z.object({ code: RoomCodeSchema });
export const RoomReadySchema = z.object({ ready: z.boolean() });
export const RoomKickSchema = z.object({ userId: z.string().min(1) });
export const EmptySchema = z.object({}).strict();
export const GameActionSchema = z.object({
  gameId: z.string().min(1),
  command: GameCommandSchema,
});
export const GameSyncSchema = z.object({
  gameId: z.string().min(1),
  /** Highest event seq the client has seen (0 = none). */
  lastSeq: z.number().int().min(0),
});
export const ChatSendSchema = z.object({
  channel: z.enum(CHANNELS),
  text: z.string().trim().min(1).max(300),
});

// ── Server → client payloads ─────────────────────────────────────────────────

/** A game event as delivered to one client (audience already applied by the server). */
export type DeliveredGameEvent = {
  [K in keyof GameEventPayloads]: {
    gameId: string;
    seq: number;
    type: K;
    payload: GameEventPayloads[K];
  };
}[keyof GameEventPayloads];

export interface ChatMessageView {
  id: string;
  channel: Channel;
  senderId: string;
  senderName: string;
  text: string;
  at: number;
}

export interface GameSyncResult {
  view: PlayerView;
  events: DeliveredGameEvent[];
  chat: ChatMessageView[];
}

export interface ClientToServerEvents {
  'room:join': (payload: z.input<typeof RoomJoinSchema>, ack: Ack<RoomView>) => void;
  'room:leave': (payload: Record<string, never>, ack: Ack) => void;
  'room:ready': (payload: z.input<typeof RoomReadySchema>, ack: Ack) => void;
  'room:updateSettings': (payload: RoomSettingsPatch, ack: Ack<RoomView>) => void;
  'room:kick': (payload: z.input<typeof RoomKickSchema>, ack: Ack) => void;
  'game:start': (payload: Record<string, never>, ack: Ack<{ gameId: string }>) => void;
  'game:action': (payload: z.input<typeof GameActionSchema>, ack: Ack) => void;
  'game:sync': (payload: z.input<typeof GameSyncSchema>, ack: Ack<GameSyncResult>) => void;
  'chat:send': (payload: z.input<typeof ChatSendSchema>, ack: Ack) => void;
}

export interface ServerToClientEvents {
  'server:hello': (payload: { serverTime: string; userId: string }) => void;
  'room:state': (room: RoomView) => void;
  'room:kicked': (payload: { roomId: string }) => void;
  'game:started': (payload: { gameId: string }) => void;
  /** The receiver's full projected view after every change. */
  'game:state': (payload: { gameId: string; view: PlayerView }) => void;
  'game:event': (event: DeliveredGameEvent) => void;
  'chat:message': (message: ChatMessageView) => void;
}

export interface SocketData {
  userId: string;
  displayName: string;
  roomId: string | null;
}
