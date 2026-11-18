import type { AppErrorBody } from '@werewolf/shared';
import type { FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { AppError } from '../lib/errors';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(error.toBody());
    }
    if (hasZodFastifySchemaValidationErrors(error)) {
      const body: AppErrorBody = {
        code: 'VALIDATION_FAILED',
        message: 'Request validation failed',
        details: error.validation,
      };
      return reply.status(400).send(body);
    }
    const status =
      typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 500;
    if (status === 429) {
      return reply.status(429).send({ code: 'RATE_LIMITED', message: 'Too many requests' });
    }
    if (status >= 500) request.log.error(error);
    const body: AppErrorBody = {
      code: status >= 500 ? 'INTERNAL' : 'VALIDATION_FAILED',
      message: status >= 500 ? 'Internal server error' : String((error as Error).message),
    };
    return reply.status(status).send(body);
  });

  app.setNotFoundHandler((_request, reply) => {
    reply
      .status(404)
      .send({ code: 'NOT_FOUND', message: 'Route not found' } satisfies AppErrorBody);
  });
}
