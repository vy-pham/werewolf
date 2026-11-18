import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

export async function connectMongo(app: FastifyInstance, uri: string) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  app.log.info('MongoDB connected');
  app.addHook('onClose', async () => {
    await mongoose.disconnect();
  });
}

export const isMongoConnected = () => mongoose.connection.readyState === 1;
