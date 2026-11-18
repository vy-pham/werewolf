import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@werewolf/shared';
import type { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';

export type IO = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

declare module 'fastify' {
  interface FastifyInstance {
    io: IO;
  }
}

/**
 * Attaches Socket.IO to the Fastify HTTP server. WebSocket transport only (no long-polling,
 * no sticky sessions needed). JWT handshake auth and feature handlers are added in M2.
 */
export function registerSocket(app: FastifyInstance, corsOrigins: string[]) {
  const io: IO = new Server(app.server, {
    transports: ['websocket'],
    cors: { origin: corsOrigins, credentials: true },
  });

  io.on('connection', (socket) => {
    socket.emit('server:hello', { serverTime: new Date().toISOString() });
  });

  app.decorate('io', io);
  app.addHook('onClose', async () => {
    await io.close();
  });
}
