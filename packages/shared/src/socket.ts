import type { AppErrorBody } from './errors';
import type { RoomSettings } from './settings';

/** Every client→server event acknowledges with either `{ ok: true, data }` or `{ ok: false, error }`. */
export type AckResult<T = undefined> = { ok: true; data: T } | { ok: false; error: AppErrorBody };
export type Ack<T = undefined> = (result: AckResult<T>) => void;

// Payload schemas are added per milestone (M2+). This file stays the single socket contract source.
export interface ClientToServerEvents {
  'room:join': (payload: { code: string }, ack: Ack) => void;
  'room:leave': (payload: Record<string, never>, ack: Ack) => void;
  'room:ready': (payload: { ready: boolean }, ack: Ack) => void;
  'room:updateSettings': (payload: Partial<RoomSettings>, ack: Ack) => void;
}

export interface ServerToClientEvents {
  'server:hello': (payload: { serverTime: string }) => void;
}

export interface SocketData {
  userId: string;
}
