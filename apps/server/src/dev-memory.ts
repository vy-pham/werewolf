/**
 * Local development without Docker: starts an in-memory MongoDB and the server on :4000.
 * Data is lost when the process stops. Usage: `pnpm dev:local`
 * (`pnpm dev:local` at the repo root starts it together with the web app).
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import { buildApp } from './app';
import { loadEnv } from './config/env';

const mongod = await MongoMemoryServer.create();
const env = loadEnv({
  NODE_ENV: 'development',
  PORT: process.env.PORT ?? '4000',
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
  MONGO_URI: `${mongod.getUri()}werewolf`,
  JWT_SECRET: 'dev-only-secret-dev-only-secret-dev-only',
  CORS_ORIGINS: process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173',
  LIVEKIT_URL: 'ws://localhost:7880',
  LIVEKIT_API_KEY: 'devkey',
  LIVEKIT_API_SECRET: 'secret',
  GOOGLE_CLIENT_IDS: process.env.GOOGLE_CLIENT_IDS ?? '',
});

const app = await buildApp({ env });

const shutdown = async () => {
  await app.close();
  await mongod.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: env.PORT, host: '0.0.0.0' });
app.log.warn('Using an in-memory MongoDB: data is lost when the server stops.');
