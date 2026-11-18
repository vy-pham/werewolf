import {
  ChatSendSchema,
  EmptySchema,
  GameActionSchema,
  GameSyncSchema,
  RoomJoinSchema,
  RoomKickSchema,
  RoomReadySchema,
  RoomSettingsPatchSchema,
} from '@werewolf/shared';
import type { FastifyBaseLogger } from 'fastify';
import { AppError } from '../lib/errors';
import type { Presence } from '../lib/presence';
import { onEvent } from '../lib/socket-handler';
import type { AppSocket, IO } from '../plugins/socket';
import type { ChatService } from './chat/chat.service';
import type { GamesService } from './games/games.service';
import { type RoomsService, roomChannel, userChannel } from './rooms/rooms.service';

interface RealtimeDeps {
  io: IO;
  log: FastifyBaseLogger;
  presence: Presence;
  rooms: RoomsService;
  games: GamesService;
  chat: ChatService;
}

/** Socket.IO event handlers. Thin: validate (Zod) → service → ack. */
export function registerRealtime({ io, log, presence, rooms, games, chat }: RealtimeDeps) {
  io.on('connection', (socket: AppSocket) => {
    const { userId } = socket.data;
    const actor = () => ({ userId, displayName: socket.data.displayName });
    const currentRoom = () => {
      if (!socket.data.roomId) throw new AppError('CONFLICT', 'Join a room first');
      return socket.data.roomId;
    };

    void socket.join(userChannel(userId));
    presence.connect(userId);
    socket.emit('server:hello', { serverTime: new Date().toISOString(), userId });

    socket.on('disconnect', () => {
      presence.disconnect(userId);
      if (socket.data.roomId) void rooms.broadcast(socket.data.roomId).catch(() => undefined);
    });

    // ── Rooms ────────────────────────────────────────────────────────────────
    onEvent(socket, log, 'room:join', RoomJoinSchema, async ({ code }) => {
      const room = await rooms.join(actor(), code);
      const roomId = String(room._id);
      if (socket.data.roomId && socket.data.roomId !== roomId) {
        await socket.leave(roomChannel(socket.data.roomId));
      }
      socket.data.roomId = roomId;
      await socket.join(roomChannel(roomId));
      await rooms.broadcast(roomId); // presence changed
      return rooms.toView(room);
    });

    onEvent(socket, log, 'room:leave', EmptySchema, async () => {
      const roomId = currentRoom();
      await rooms.leave(actor(), roomId);
      await socket.leave(roomChannel(roomId));
      socket.data.roomId = null;
    });

    onEvent(socket, log, 'room:ready', RoomReadySchema, ({ ready }) =>
      rooms.setReady(actor(), currentRoom(), ready),
    );

    onEvent(socket, log, 'room:updateSettings', RoomSettingsPatchSchema, (patch) =>
      rooms.updateSettings(actor(), currentRoom(), patch),
    );

    onEvent(socket, log, 'room:kick', RoomKickSchema, ({ userId: target }) =>
      rooms.kick(actor(), currentRoom(), target),
    );

    // ── Game ─────────────────────────────────────────────────────────────────
    onEvent(socket, log, 'game:start', EmptySchema, () => rooms.start(actor(), currentRoom()));

    onEvent(socket, log, 'game:action', GameActionSchema, ({ gameId, command }) =>
      games.act(userId, gameId, command),
    );

    onEvent(socket, log, 'game:sync', GameSyncSchema, ({ gameId, lastSeq }) =>
      games.sync(userId, gameId, lastSeq),
    );

    // ── Chat ─────────────────────────────────────────────────────────────────
    onEvent(socket, log, 'chat:send', ChatSendSchema, ({ channel, text }) =>
      chat.send({ ...actor(), roomId: socket.data.roomId }, channel, text),
    );
  });
}
