import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireWorkspace } from '../auth/auth.middleware.js';
import { trackingService } from './tracking.service.js';

export async function registerTrackingRoutes(app: FastifyInstance): Promise<void> {
  app.post('/tracking/query', { preHandler: [requireAuth, requireWorkspace] }, async (req) => {
    const bodySchema = z.object({
      campaign_id: z.string().uuid().optional(),
      variant_id: z.string().uuid().optional(),
      utm_source: z.string().optional(),
      utm_campaign: z.string().optional(),
      utm_content: z.string().optional(),
      extra: z.record(z.string(), z.string()).optional(),
    });
    const body = bodySchema.parse(req.body);
    return { query: trackingService.buildTrackingQuery(body) };
  });
}

