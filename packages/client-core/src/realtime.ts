import type {
  AckResult,
  AppErrorBody,
  ClientToServerEvents,
  GameSyncResult,
  RoomView,
  ServerToClientEvents,
  VoiceGrants,
} from '@werewolf/shared';
import { io, type Socket } from 'socket.io-client';
import type { ApiClient } from './api';
import { useGame } from './game-store';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export class SocketError extends Error {
  constructor(readonly body: AppErrorBody) {
    super(body.message);
  }
  get code() {
    return this.body.code;
  }
}

export interface RealtimeHandlers {
  onVoiceUpdate?: (grants: VoiceGrants) => void;
  onKicked?: () => void;
}

/**
 * The Socket.IO connection (WebSocket only, token read on every (re)connect) wired to the game
 * store, plus helpers to join a room and catch up after a reconnect.
 */
export function createRealtime({
  apiUrl,
  auth,
}: {
  apiUrl: string;
  auth: Pick<ApiClient, 'freshAccessToken' | 'refreshSession'>;
}) {
  const handlers: RealtimeHandlers = {};
  const store = () => useGame.getState();

  const socket: AppSocket = io(apiUrl, {
    transports: ['websocket'],
    autoConnect: false,
    auth: (cb) => {
      void auth.freshAccessToken().then((token) => cb({ token }));
    },
  });

  function call<T = null>(event: keyof ClientToServerEvents, payload: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      (socket as unknown as { emit: (...args: unknown[]) => void }).emit(
        event,
        payload,
        (result: AckResult<T>) => {
          if (result.ok) resolve(result.data);
          else reject(new SocketError(result.error));
        },
      );
    });
  }

  function ensureConnected(): Promise<void> {
    if (socket.connected) return Promise.resolve();
    return new Promise((resolve) => {
      socket.once('connect', () => resolve());
      socket.connect();
    });
  }

  async function syncGame(gameId: string) {
    const sync = await call<GameSyncResult>('game:sync', { gameId, lastSeq: store().lastSeq });
    store().applySync(gameId, sync);
  }

  async function joinRoom(code: string): Promise<RoomView> {
    await ensureConnected();
    const room = await call<RoomView>('room:join', { code });
    store().setRoom(room);
    if (room.status === 'in_game' && room.currentGameId) await syncGame(room.currentGameId);
    return room;
  }

  /** After a reconnect: re-join the room (socket rooms are per connection) and catch up. */
  async function resync() {
    const room = store().room;
    if (!room) return;
    try {
      await joinRoom(room.code);
    } catch {
      store().leaveRoom();
    }
  }

  socket.on('connect', () => {
    store().setConnected(true);
    void resync();
  });
  socket.on('disconnect', () => store().setConnected(false));
  socket.on('connect_error', async (err) => {
    store().setConnected(false);
    if (err.message === 'UNAUTHORIZED' && (await auth.refreshSession())) socket.connect();
  });
  socket.on('room:state', (room) => {
    if (store().room?.id === room.id) store().setRoom(room);
  });
  socket.on('room:kicked', () => {
    store().leaveRoom();
    handlers.onKicked?.();
  });
  socket.on('game:started', ({ gameId }) => store().onGameStarted(gameId));
  socket.on('game:state', ({ gameId, view }) => store().onState(gameId, view));
  socket.on('game:event', (event) => store().onEvent(event));
  socket.on('chat:message', (message) => store().onChat(message));
  socket.on('caption:message', (caption) => store().onCaption(caption));
  socket.on('voice:update', ({ grants }) => handlers.onVoiceUpdate?.(grants));

  return {
    socket,
    call,
    ensureConnected,
    joinRoom,
    syncGame,
    setHandlers: (next: RealtimeHandlers) => Object.assign(handlers, next),
  };
}

export type Realtime = ReturnType<typeof createRealtime>;
