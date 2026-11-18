import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '@werewolf/shared';
import type { FastifyInstance } from 'fastify';
import { Server, type Socket } from 'socket.io';
import type { TokenService } from '../modules/auth/token.service';
import { User, type UserDoc } from '../modules/users/user.model';

export type IO = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;
export type AppSocket = Socket<
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

/** Socket.IO on the Fastify HTTP server. WebSocket only (no long-polling, no sticky sessions). */
export function createSocketServer(app: FastifyInstance, corsOrigins: string[]): IO {
  const io: IO = new Server(app.server, {
    transports: ['websocket'],
    cors: { origin: corsOrigins, credentials: true },
  });
  app.decorate('io', io);
  app.addHook('onClose', async () => {
    await io.close();
  });
  return io;
}

/** Handshake auth: `io(url, { auth: { token: accessToken } })`. */
export function useSocketAuth(io: IO, tokens: TokenService) {
  io.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth as { token?: string } | undefined)?.token;
      const { userId } = await tokens.verifyAccess(token);
      const user = await User.findById(userId).lean<UserDoc>();
      if (!user) throw new Error('unknown user');
      socket.data = { userId, displayName: user.displayName, roomId: null };
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });
}
