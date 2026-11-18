import type { FastifyBaseLogger } from 'fastify';
import { z } from 'zod';
import type { AppSocket } from '../plugins/socket';
import { AppError, toErrorBody } from './errors';

type Listener = (...args: unknown[]) => void;

/**
 * Registers a client→server event: validates the payload with Zod, runs the handler and always
 * answers through the ack as `{ ok: true, data }` or `{ ok: false, error }`.
 */
export function onEvent<S extends z.ZodType>(
  socket: AppSocket,
  log: FastifyBaseLogger,
  event: string,
  schema: S,
  handler: (payload: z.output<S>) => Promise<unknown>,
) {
  const listener: Listener = async (payload, ack) => {
    const reply = typeof ack === 'function' ? (ack as (r: unknown) => void) : () => {};
    const parsed = schema.safeParse(payload ?? {});
    if (!parsed.success) {
      reply({
        ok: false,
        error: { code: 'VALIDATION_FAILED', message: z.prettifyError(parsed.error) },
      });
      return;
    }
    try {
      const data = await handler(parsed.data);
      reply({ ok: true, data: data ?? null });
    } catch (error) {
      if (!(error instanceof AppError)) log.error({ err: error, event }, 'socket handler failed');
      reply({ ok: false, error: toErrorBody(error) });
    }
  };
  (socket as unknown as { on(event: string, listener: Listener): void }).on(event, listener);
}
