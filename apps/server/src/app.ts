import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { Env } from './config/env';
import { healthRoutes } from './modules/health/health.routes';
import { registerErrorHandler } from './plugins/error-handler';
import { connectMongo } from './plugins/mongoose';
import { registerSocket } from './plugins/socket';

export interface BuildAppOptions {
  env: Env;
  /** Tests can skip the DB connection or use mongodb-memory-server. */
  connectDb?: boolean;
}

export async function buildApp({ env, connectDb = true }: BuildAppOptions) {
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
  await app.register(cors, { origin: env.CORS_ORIGINS, credentials: true });
  // In-memory store: fine for a single instance (docs/03-technical-design.md §3.8).
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });

  if (connectDb) await connectMongo(app, env.MONGO_URI);
  registerSocket(app, env.CORS_ORIGINS);

  // Feature modules — one Fastify plugin per module (docs/03-technical-design.md §3.2).
  await app.register(healthRoutes);

  return app;
}
