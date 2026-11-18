import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AccessClaims, TokenService } from '../modules/auth/token.service';

declare module 'fastify' {
  interface FastifyRequest {
    user: AccessClaims;
  }
  interface FastifyInstance {
    /** Use as `onRequest: app.authenticate` on protected routes. */
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
}

export function registerAuth(app: FastifyInstance, tokens: TokenService) {
  app.decorateRequest('user', null as unknown as AccessClaims);
  app.decorate('authenticate', async (request: FastifyRequest) => {
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    request.user = await tokens.verifyAccess(token);
  });
}
