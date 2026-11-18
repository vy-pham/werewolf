import { GoogleLoginBodySchema, GuestLoginBodySchema, RefreshBodySchema } from '@werewolf/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { AuthService } from './auth.service';

export const authRoutes =
  (auth: AuthService): FastifyPluginAsyncZod =>
  async (app) => {
    // Stricter limit on endpoints that create users / sessions.
    const rateLimit = { max: 20, timeWindow: '1 minute' };

    app.post(
      '/auth/guest',
      { schema: { body: GuestLoginBodySchema }, config: { rateLimit } },
      async (req) =>
        auth.loginGuest(req.body.displayName, req.body.locale, req.headers['user-agent']),
    );

    app.post(
      '/auth/google',
      { schema: { body: GoogleLoginBodySchema }, config: { rateLimit } },
      async (req) => auth.loginGoogle(req.body.idToken, req.body.locale, req.headers['user-agent']),
    );

    app.post(
      '/auth/refresh',
      { schema: { body: RefreshBodySchema }, config: { rateLimit } },
      async (req) => auth.refresh(req.body.refreshToken, req.headers['user-agent']),
    );

    app.post('/auth/logout', { schema: { body: RefreshBodySchema } }, async (req, reply) => {
      await auth.logout(req.body.refreshToken);
      return reply.status(204).send();
    });
  };
