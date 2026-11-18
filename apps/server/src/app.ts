import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { Env } from './config/env';
import { type Clock, systemClock } from './lib/clock';
import { Presence } from './lib/presence';
import { authRoutes } from './modules/auth/auth.routes';
import { AuthService } from './modules/auth/auth.service';
import { createGoogleVerifier, type GoogleVerifier } from './modules/auth/google';
import { TokenService } from './modules/auth/token.service';
import { captionsRoutes } from './modules/captions/captions.routes';
import { CaptionsService } from './modules/captions/captions.service';
import { ChatService } from './modules/chat/chat.service';
import { GamesService } from './modules/games/games.service';
import { InProcessScheduler, type PhaseScheduler } from './modules/games/phase-scheduler';
import { healthRoutes } from './modules/health/health.routes';
import { registerRealtime } from './modules/realtime';
import { roomsRoutes } from './modules/rooms/rooms.routes';
import { RoomsService } from './modules/rooms/rooms.service';
import { usersRoutes } from './modules/users/users.routes';
import { LiveKitVoice, type VoiceProvider } from './modules/voice/voice.provider';
import { VoiceService } from './modules/voice/voice.service';
import { registerAuth } from './plugins/auth';
import { registerErrorHandler } from './plugins/error-handler';
import { connectMongo } from './plugins/mongoose';
import { createSocketServer, useSocketAuth } from './plugins/socket';

export interface BuildAppOptions {
  env: Env;
  /** Tests can skip the DB connection. */
  connectDb?: boolean;
  /** HTTP rate limiting (on by default; integration tests create many users from one IP). */
  rateLimit?: boolean;
  /** Overridable dependencies (tests inject a fake clock, a manual scheduler, a fake Google). */
  deps?: {
    clock?: Clock;
    scheduler?: PhaseScheduler;
    google?: GoogleVerifier;
    voice?: VoiceProvider;
  };
}

export async function buildApp({
  env,
  connectDb = true,
  rateLimit: rateLimitEnabled = true,
  deps = {},
}: BuildAppOptions) {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    },
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandler(app);

  await app.register(helmet);
  await app.register(cors, {
    origin: env.CORS_ORIGINS,
    credentials: true,
    // @fastify/cors only allows GET/HEAD/POST by default: PATCH /me needs to be listed.
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });
  // In-memory store: fine for a single instance (docs/03-technical-design.md §3.8).
  if (rateLimitEnabled) await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });

  if (connectDb) await connectMongo(app, env.MONGO_URI);

  // ── Wiring ─────────────────────────────────────────────────────────────────
  const clock = deps.clock ?? systemClock;
  const scheduler = deps.scheduler ?? new InProcessScheduler(clock);
  app.addHook('onClose', async () => scheduler.close());

  const tokens = new TokenService(env.JWT_SECRET);
  const auth = new AuthService(tokens, deps.google ?? createGoogleVerifier(env.GOOGLE_CLIENT_IDS));
  registerAuth(app, tokens);

  const io = createSocketServer(app, env.CORS_ORIGINS);
  useSocketAuth(io, tokens);
  const presence = new Presence();
  const rooms = new RoomsService(io, presence);
  const chat = new ChatService(io, clock, rooms);
  const voiceProvider =
    deps.voice ?? new LiveKitVoice(env.LIVEKIT_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
  const voice = new VoiceService(voiceProvider, io, app.log);
  const captions = new CaptionsService(io, clock, rooms, presence, voiceProvider);
  const games = new GamesService({
    io,
    clock,
    scheduler,
    log: app.log,
    onStateChanged: (game) => voice.syncGame(game, String(game.roomId)),
    onFinished: async (game) => {
      await rooms.backToLobby(String(game.roomId));
      await voice.syncLobby(await rooms.getById(String(game.roomId)), game);
    },
    recentChat: (game, userId) => chat.recentForGame(game, userId),
  });
  rooms.setGameStarter(games);
  chat.setGames(games);
  captions.setGames(games);
  registerRealtime({ io, log: app.log, presence, rooms, games, chat, voice });

  // ── HTTP routes (one Fastify plugin per module, docs §3.2) ─────────────────
  await app.register(healthRoutes);
  await app.register(authRoutes(auth));
  await app.register(usersRoutes);
  await app.register(roomsRoutes(rooms));
  if (env.CAPTIONS_SECRET) await app.register(captionsRoutes(captions, env.CAPTIONS_SECRET));

  if (connectDb) {
    const recovered = await games.recoverTimers();
    if (recovered > 0) app.log.info({ recovered }, 'phase timers recovered');
  }

  return app;
}
