import { UpdateMeBodySchema } from '@werewolf/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { AppError } from '../../lib/errors';
import { toUserView, User, type UserDoc } from './user.model';

export const usersRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/me', { onRequest: app.authenticate }, async (req) => {
    const user = await User.findById(req.user.userId).lean<UserDoc>();
    if (!user) throw new AppError('NOT_FOUND', 'User not found');
    return toUserView(user);
  });

  app.patch(
    '/me',
    { onRequest: app.authenticate, schema: { body: UpdateMeBodySchema } },
    async (req) => {
      const user = await User.findByIdAndUpdate(
        req.user.userId,
        { $set: { ...req.body, lastSeenAt: new Date() } },
        { new: true },
      ).lean<UserDoc>();
      if (!user) throw new AppError('NOT_FOUND', 'User not found');
      return toUserView(user);
    },
  );
};
