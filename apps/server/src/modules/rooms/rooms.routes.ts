import { CreateRoomBodySchema, LocaleSchema, RoomCodeSchema } from '@werewolf/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AppError } from '../../lib/errors';
import { User, type UserDoc } from '../users/user.model';
import type { RoomsService } from './rooms.service';

export const roomsRoutes =
  (rooms: RoomsService): FastifyPluginAsyncZod =>
  async (app) => {
    /** Public rooms waiting for players (FR-ROOM-03). */
    app.get(
      '/rooms',
      { schema: { querystring: z.object({ lang: LocaleSchema.optional() }) } },
      async (req) => rooms.listPublic(req.query.lang),
    );

    app.post(
      '/rooms',
      { onRequest: app.authenticate, schema: { body: CreateRoomBodySchema } },
      async (req, reply) => {
        const user = await User.findById(req.user.userId).lean<UserDoc>();
        if (!user) throw new AppError('UNAUTHORIZED', 'User not found');
        const room = await rooms.create(
          { userId: req.user.userId, displayName: user.displayName },
          req.body,
        );
        return reply.status(201).send(room);
      },
    );

    app.get(
      '/rooms/:code',
      { onRequest: app.authenticate, schema: { params: z.object({ code: RoomCodeSchema }) } },
      async (req) => rooms.toView(await rooms.getByCode(req.params.code)),
    );
  };
