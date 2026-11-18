import type {
  AckResult,
  AuthResponse,
  ChannelGrant,
  ChatMessageView,
  ClientToServerEvents,
  DeliveredGameEvent,
  PlayerView,
  RoomView,
  ServerToClientEvents,
  VoiceGrants,
} from '@werewolf/shared';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { io as connect, type Socket } from 'socket.io-client';
import { buildApp } from '../app';
import { loadEnv } from '../config/env';
import type { Clock } from '../lib/clock';
import { AppError } from '../lib/errors';
import type { GoogleVerifier } from '../modules/auth/google';
import type { PhaseScheduler, TimeoutHandler } from '../modules/games/phase-scheduler';
import type { VoiceProvider } from '../modules/voice/voice.provider';

export const T0 = Date.UTC(2026, 10, 18, 12, 0, 0);

export class FakeClock implements Clock {
  constructor(public t = T0) {}
  now() {
    return this.t;
  }
}

/** Records timers instead of running them; tests fire them explicitly. */
export class ManualScheduler implements PhaseScheduler {
  readonly entries = new Map<string, { version: number; endsAt: number }>();
  private handler: TimeoutHandler = async () => {};

  constructor(private readonly clock: FakeClock) {}

  setHandler(handler: TimeoutHandler) {
    this.handler = handler;
  }
  schedule(gameId: string, version: number, endsAt: number) {
    this.entries.set(gameId, { version, endsAt });
  }
  cancel(gameId: string) {
    this.entries.delete(gameId);
  }
  close() {
    this.entries.clear();
  }

  /** Advances the fake clock to the phase end and runs the timeout. */
  async fire(gameId: string) {
    const entry = this.entries.get(gameId);
    if (!entry) throw new Error(`no timer scheduled for ${gameId}`);
    this.entries.delete(gameId);
    this.clock.t = Math.max(this.clock.t, entry.endsAt);
    await this.handler(gameId, entry.version);
  }
}

/** Accepts ID tokens of the form `google:<sub>`. */
export const fakeGoogle: GoogleVerifier = {
  async verify(idToken) {
    if (!idToken.startsWith('google:'))
      throw new AppError('UNAUTHORIZED', 'Invalid Google ID token');
    const sub = idToken.slice('google:'.length);
    return { sub, email: `${sub}@example.com`, name: `Google ${sub}` };
  },
};

let mongod: MongoMemoryServer | undefined;

export async function startMongo() {
  mongod ??= await MongoMemoryServer.create();
  return `${mongod.getUri()}werewolf-${Math.random().toString(36).slice(2)}`;
}

export async function stopMongo() {
  await mongod?.stop();
  mongod = undefined;
}

export interface TestServer {
  url: string;
  clock: FakeClock;
  scheduler: ManualScheduler;
  voice: FakeVoice;
  close(): Promise<void>;
}

export async function startServer(dbUri: string, clock = new FakeClock()): Promise<TestServer> {
  const scheduler = new ManualScheduler(clock);
  const voice = new FakeVoice();
  const env = loadEnv({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    MONGO_URI: dbUri,
    JWT_SECRET: 'test-secret-test-secret-test-secret!!',
    LIVEKIT_URL: 'ws://localhost:7880',
    LIVEKIT_API_KEY: 'devkey',
    LIVEKIT_API_SECRET: 'secret',
    CORS_ORIGINS: 'http://localhost:5173',
  });
  const app = await buildApp({
    env,
    rateLimit: false,
    deps: { clock, scheduler, google: fakeGoogle, voice },
  });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const address = app.server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  return { url: `http://127.0.0.1:${port}`, clock, scheduler, voice, close: () => app.close() };
}

// ── HTTP ─────────────────────────────────────────────────────────────────────

export async function http<T = unknown>(
  url: string,
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; body: T }> {
  const res = await fetch(`${url}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: (text ? JSON.parse(text) : null) as T };
}

export async function guest(url: string, displayName: string): Promise<AuthResponse> {
  const res = await http<AuthResponse>(url, 'POST', '/auth/guest', { displayName });
  if (res.status !== 200) throw new Error(`guest login failed: ${JSON.stringify(res.body)}`);
  return res.body;
}

// ── Socket client ────────────────────────────────────────────────────────────

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** A socket.io client that remembers everything it received. */
export class TestClient {
  readonly socket: ClientSocket;
  view: PlayerView | null = null;
  readonly views: PlayerView[] = [];
  readonly events: DeliveredGameEvent[] = [];
  readonly chat: ChatMessageView[] = [];
  readonly voiceUpdates: VoiceGrants[] = [];
  room: RoomView | null = null;
  gameId: string | null = null;
  kicked = false;

  constructor(
    url: string,
    readonly auth: AuthResponse,
  ) {
    this.socket = connect(url, {
      transports: ['websocket'],
      auth: { token: auth.accessToken },
      forceNew: true,
      reconnection: false,
    });
    this.socket.on('game:state', ({ gameId, view }) => {
      this.gameId = gameId;
      this.view = view;
      this.views.push(view);
    });
    this.socket.on('game:started', ({ gameId }) => {
      this.gameId = gameId;
    });
    this.socket.on('game:event', (e) => this.events.push(e));
    this.socket.on('chat:message', (m) => this.chat.push(m));
    this.socket.on('room:state', (r) => {
      this.room = r;
    });
    this.socket.on('voice:update', ({ grants }) => this.voiceUpdates.push(grants));
    this.socket.on('room:kicked', () => {
      this.kicked = true;
    });
  }

  get id() {
    return this.auth.user.id;
  }

  connected(): Promise<void> {
    if (this.socket.connected) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.socket.once('connect', () => resolve());
      this.socket.once('connect_error', reject);
    });
  }

  /** Emits with an ack and returns the raw result. */
  request<T = unknown>(event: keyof ClientToServerEvents, payload: unknown): Promise<AckResult<T>> {
    return new Promise((resolve) => {
      (this.socket as unknown as { emit: (...a: unknown[]) => void }).emit(
        event,
        payload,
        (r: AckResult<T>) => resolve(r),
      );
    });
  }

  /** Emits and throws on `{ ok: false }`. */
  async call<T = unknown>(event: keyof ClientToServerEvents, payload: unknown): Promise<T> {
    const r = await this.request<T>(event, payload);
    if (!r.ok) throw new Error(`${String(event)} failed: ${r.error.code} ${r.error.message}`);
    return r.data;
  }

  close() {
    this.socket.disconnect();
  }
}

export async function until(check: () => boolean, timeoutMs = 3000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('until(): timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

export const settle = (ms = 40) => new Promise((r) => setTimeout(r, ms));

/** N guests connected, host creates a room, everyone joins and readies up. */
export async function setupLobby(server: TestServer, n: number) {
  const clients: TestClient[] = [];
  for (let i = 0; i < n; i++) {
    const c = new TestClient(server.url, await guest(server.url, `Player${i + 1}`));
    await c.connected();
    clients.push(c);
  }
  const [host] = clients;
  if (!host) throw new Error('no host');
  const created = await http<RoomView>(
    server.url,
    'POST',
    '/rooms',
    { visibility: 'private' },
    host.auth.accessToken,
  );
  const code = created.body.code;
  for (const c of clients) await c.call('room:join', { code });
  for (const c of clients.slice(1)) await c.call('room:ready', { ready: true });
  return { clients, host, code, roomId: created.body.id };
}

// ── Voice ────────────────────────────────────────────────────────────────────

/** Records LiveKit calls instead of making them. */
export class FakeVoice implements VoiceProvider {
  readonly url = 'ws://fake-livekit';
  readonly tokens: { room: string; identity: string; grant: ChannelGrant }[] = [];
  readonly calls: { room: string; identity: string; grant: ChannelGrant }[] = [];

  async createToken(input: { room: string; identity: string; name: string; grant: ChannelGrant }) {
    this.tokens.push({ room: input.room, identity: input.identity, grant: input.grant });
    return `token:${input.room}:${input.identity}`;
  }

  async setPermissions(room: string, identity: string, grant: ChannelGrant) {
    this.calls.push({ room, identity, grant });
  }

  /** The last permission pushed for this participant in this room. */
  latest(room: string, identity: string): ChannelGrant | undefined {
    return this.calls.filter((c) => c.room === room && c.identity === identity).at(-1)?.grant;
  }
}
