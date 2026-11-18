import { realtime } from './client';

export { type AppSocket, SocketError } from '@werewolf/client-core';
export const { socket, call, ensureConnected, joinRoom, syncGame } = realtime;
