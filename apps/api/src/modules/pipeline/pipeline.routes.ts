import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireWorkspace } from '../auth/auth.middleware.js';
import { pipelineService } from './pipeline.service.js';

export async function registerPipelineRoutes(app: FastifyInstance): Promise<void> {
  // Update status (Kanban drag & drop)
  app.patch('/leads/:id/status', { preHandler: [requireAuth, requireWorkspace] }, async (req) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      to_status: z.enum(['new', 'contacted', 'replied', 'qualified', 'scheduled', 'won', 'lost']),
      reason: z.string().optional(),
      idempotency_key: z.string().optional(),
    });
    const params = paramsSchema.parse(req.params);
    const body = bodySchema.parse(req.body);

    const lead = await pipelineService.updateLeadStatus({
      workspaceId: req.workspace!.workspaceId,
      leadId: params.id,
      toStatus: body.to_status,
      reason: body.reason,
      actorUserId: req.auth!.userId,
      correlationId: req.correlationId,
      idempotencyKey: body.idempotency_key ?? (req.headers['idempotency-key'] as string | undefined),
    });

    return { lead };
  });
}

