import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireWorkspace } from '../auth/auth.middleware.js';
import { metricsService } from './metrics.service.js';

export async function registerMetricsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/dashboard/summary', { preHandler: [requireAuth, requireWorkspace] }, async (req) => {
    const qSchema = z.object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    });
    const q = qSchema.parse(req.query);

    return metricsService.dashboardSummary({
      workspaceId: req.workspace!.workspaceId,
      from: q.from,
      to: q.to,
    });
  });
}

