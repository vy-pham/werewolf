import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { isMongoConnected } from '../../plugins/mongoose';

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        response: {
          200: z.object({
            status: z.literal('ok'),
            db: z.enum(['up', 'down']),
            time: z.string(),
          }),
        },
      },
    },
    async () => ({
      status: 'ok' as const,
      db: isMongoConnected() ? ('up' as const) : ('down' as const),
      time: new Date().toISOString(),
    }),
  );
};
