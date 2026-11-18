import { UpdateMeBodySchema, type UserStats } from '@werewolf/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AppError } from '../../lib/errors';
import { toUserView, User, type UserDoc } from './user.model';

export const usersRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/me', { onRequest: app.authenticate }, async (req) => {
    const user = await User.findById(req.user.userId).lean<UserDoc>();
    if (!user) throw new AppError('NOT_FOUND', 'User not found');
    return toUserView(user);
  });

  /** Personal statistics (FR-MISC-03): games and wins, overall and by dealt role. */
  app.get(
    '/users/:id/stats',
    { onRequest: app.authenticate, schema: { params: z.object({ id: z.string() }) } },
    async (req): Promise<UserStats> => {
      const user = Types.ObjectId.isValid(req.params.id)
        ? await User.findById(req.params.id).select({ stats: 1 }).lean<UserDoc>()
        : null;
      if (!user) throw new AppError('NOT_FOUND', 'User not found');
      const stats = user.stats ?? { games: 0, wins: 0, byRole: {} };
      return { games: stats.games ?? 0, wins: stats.wins ?? 0, byRole: stats.byRole ?? {} };
    },
  );

  app.patch(
    '/me',
    { onRequest: app.authenticate, schema: { body: UpdateMeBodySchema } },
    async (req) => {
      const user = await User.findByIdAndUpdate(
        req.user.userId,
        { $set: { ...req.body, lastSeenAt: new Date() } },
        { returnDocument: 'after' },
      ).lean<UserDoc>();
      if (!user) throw new AppError('NOT_FOUND', 'User not found');
      return toUserView(user);
    },
  );
};
