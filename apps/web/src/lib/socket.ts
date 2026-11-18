import type {
  AckResult,
  AppErrorBody,
  ClientToServerEvents,
  GameSyncResult,
  RoomView,
  ServerToClientEvents,
} from '@werewolf/shared';
import { io, type Socket } from 'socket.io-client';
import { useGame } from '../stores/game';
import { freshAccessToken, refreshSession } from './api';
import { API_URL } from './config';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export class SocketError extends Error {
  constructor(readonly body: AppErrorBody) {
    super(body.message);
  }
  get code() {
    return this.body.code;
  }
}

/** Single shared connection. WebSocket only (matches the server). The token is read on every (re)connect. */
export const socket: AppSocket = io(API_URL, {
  transports: ['websocket'],
  autoConnect: false,
  auth: (cb) => {
    void freshAccessToken().then((token) => cb({ token }));
  },
});

const store = () => useGame.getState();

socket.on('connect', () => {
  store().setConnected(true);
  void resync();
});
socket.on('disconnect', () => store().setConnected(false));
socket.on('connect_error', async (err) => {
  store().setConnected(false);
  if (err.message === 'UNAUTHORIZED' && (await refreshSession())) socket.connect();
});

socket.on('room:state', (room) => {
  if (store().room?.id === room.id) store().setRoom(room);
});
socket.on('room:kicked', () => store().leaveRoom());
socket.on('game:started', ({ gameId }) => store().onGameStarted(gameId));
socket.on('game:state', ({ gameId, view }) => store().onState(gameId, view));
socket.on('game:event', (event) => store().onEvent(event));
socket.on('chat:message', (message) => store().onChat(message));

/** Emits an event and resolves with its data, or throws a SocketError. */
export function call<T = null>(event: keyof ClientToServerEvents, payload: unknown): Promise<T> {
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

export function ensureConnected(): Promise<void> {
  if (socket.connected) return Promise.resolve();
  return new Promise((resolve) => {
    socket.once('connect', () => resolve());
    socket.connect();
  });
}

export async function joinRoom(code: string): Promise<RoomView> {
  await ensureConnected();
  const room = await call<RoomView>('room:join', { code });
  store().setRoom(room);
  if (room.status === 'in_game' && room.currentGameId) await syncGame(room.currentGameId);
  return room;
}

export async function syncGame(gameId: string) {
  const sync = await call<GameSyncResult>('game:sync', { gameId, lastSeq: store().lastSeq });
  store().applySync(gameId, sync);
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
