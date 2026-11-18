import { timingSafeEqual } from 'node:crypto';
import { CaptionIngestSchema } from '@werewolf/shared';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { AppError } from '../../lib/errors';
import type { CaptionsService } from './captions.service';

/**
 * Internal API for the captions worker (apps/captions). Authenticated with a shared secret
 * (`CAPTIONS_SECRET`), never with user tokens. Not registered when the secret is unset.
 */
export const captionsRoutes =
  (captions: CaptionsService, secret: string): FastifyPluginAsyncZod =>
  async (app) => {
    const expected = Buffer.from(`Bearer ${secret}`);
    const workerOnly = async (req: FastifyRequest) => {
      const given = Buffer.from(req.headers.authorization ?? '');
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
        throw new AppError('UNAUTHORIZED', 'Invalid worker secret');
      }
    };

    // The worker polls every few seconds: exempt from the per-IP rate limit.
    const config = { rateLimit: false } as const;

    app.get('/internal/captions/rooms', { onRequest: workerOnly, config }, () =>
      captions.activeRooms(),
    );

    app.post(
      '/internal/captions',
      { onRequest: workerOnly, config, schema: { body: CaptionIngestSchema } },
      (req) => captions.ingest(req.body),
    );
  };
