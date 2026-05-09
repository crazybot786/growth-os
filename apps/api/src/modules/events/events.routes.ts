import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireWorkspace } from '../auth/auth.middleware.js';
import { eventsService } from './events.service.js';

export async function registerEventRoutes(app: FastifyInstance): Promise<void> {
  // Inserção “controlada” (externo via webhooks/n8n) — sempre passa pelo módulo events.
  app.post('/events', { preHandler: [requireAuth, requireWorkspace] }, async (req, reply) => {
    const bodySchema = z.object({
      event_type: z.string().min(1),
      entity_type: z.string().min(1),
      entity_id: z.string().uuid(),
      actor_type: z.enum(['user', 'system', 'automation']).optional(),
      actor_id: z.string().uuid().optional(),
      payload: z.record(z.string(), z.any()).optional(),
      idempotency_key: z.string().min(1).optional(),
      correlation_id: z.string().uuid().optional(),
    });
    const body = bodySchema.parse(req.body);

    const inserted = await eventsService.emitEvent({
      workspaceId: req.workspace!.workspaceId,
      correlationId: body.correlation_id ?? req.correlationId,
      idempotencyKey: body.idempotency_key,
      eventType: body.event_type,
      entity: { type: body.entity_type, id: body.entity_id },
      actor: { type: body.actor_type ?? 'automation', id: body.actor_id ?? undefined },
      payload: body.payload ?? {},
    });

    await reply.code(201).send({ event: inserted });
  });

  // Timeline por entidade (Sprint 1: lead timeline)
  app.get('/events', { preHandler: [requireAuth, requireWorkspace] }, async (req) => {
    const querySchema = z.object({
      entity_type: z.string().min(1),
      entity_id: z.string().uuid(),
      limit: z.coerce.number().optional(),
    });
    const q = querySchema.parse(req.query);

    const events = await eventsService.timeline({
      workspaceId: req.workspace!.workspaceId,
      entityType: q.entity_type,
      entityId: q.entity_id,
      limit: q.limit,
    });

    return { events };
  });
}
