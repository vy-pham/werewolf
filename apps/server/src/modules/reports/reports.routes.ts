import { CreateReportBodySchema } from '@werewolf/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { ReportsService } from './reports.service';

export const reportsRoutes =
  (reports: ReportsService): FastifyPluginAsyncZod =>
  async (app) => {
    app.post(
      '/reports',
      { onRequest: app.authenticate, schema: { body: CreateReportBodySchema } },
      async (req, reply) => reply.status(201).send(await reports.create(req.user.userId, req.body)),
    );

    /** Recent games (ended < 24 h ago) whose players this user can still report. */
    app.get('/reports/reportable', { onRequest: app.authenticate }, (req) =>
      reports.reportable(req.user.userId),
    );
  };
