import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireWorkspace } from '../auth/auth.middleware.js';
import { leadsService } from '../leads/leads.service.js';
import { messagingService } from './messaging.service.js';

export async function registerMessagingRoutes(app: FastifyInstance): Promise<void> {
  /**
   * Sprint 1: Gera wa.me e já registra message.sent (log operacional).
   * Isso garante rastreabilidade: lead → whatsapp → timeline → métricas.
   */
  app.post('/leads/:id/whatsapp', { preHandler: [requireAuth, requireWorkspace] }, async (req, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      text: z.string().min(1),
      idempotency_key: z.string().optional(),
    });
    const params = paramsSchema.parse(req.params);
    const body = bodySchema.parse(req.body);

    const lead = await leadsService.getLead({ workspaceId: req.workspace!.workspaceId, leadId: params.id });
    if (!lead) {
      await reply.code(404).send({ error: 'not_found' });
      return;
    }

    const url = messagingService.buildWaMeLink({ whatsapp: lead.whatsapp, text: body.text });

    await messagingService.logMessage({
      workspaceId: req.workspace!.workspaceId,
      leadId: params.id,
      channel: 'whatsapp',
      direction: 'outbound',
      body: body.text,
      actorUserId: req.auth!.userId,
      correlationId: req.correlationId,
      idempotencyKey: body.idempotency_key ?? (req.headers['idempotency-key'] as string | undefined),
    });

    return { url };
  });
}

