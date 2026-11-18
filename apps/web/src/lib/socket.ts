import type { ClientToServerEvents, ServerToClientEvents } from '@werewolf/shared';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from './config';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Single shared connection. WebSocket transport only (matches the server). */
export const socket: AppSocket = io(API_URL, {
  transports: ['websocket'],
  autoConnect: false,
});
