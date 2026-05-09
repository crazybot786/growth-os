import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireWorkspace } from '../auth/auth.middleware.js';
import { leadsService } from './leads.service.js';

export async function registerLeadRoutes(app: FastifyInstance): Promise<void> {
  // Listagem (tabela)
  app.get('/leads', { preHandler: [requireAuth, requireWorkspace] }, async (req) => {
    const querySchema = z.object({
      status: z.string().optional(),
      q: z.string().optional(),
      page: z.coerce.number().optional(),
      pageSize: z.coerce.number().optional(),
    });
    const q = querySchema.parse(req.query);

    return leadsService.listLeads({
      workspaceId: req.workspace!.workspaceId,
      status: q.status,
      q: q.q,
      page: q.page,
      pageSize: q.pageSize,
    });
  });

  // Create (captura LP/webhook/manual)
  app.post('/leads', { preHandler: [requireAuth, requireWorkspace] }, async (req, reply) => {
    const bodySchema = z.object({
      name: z.string().min(1),
      whatsapp: z.string().min(6),
      company: z.string().optional(),
      source_channel: z.string().optional(),
      campaign_id: z.string().uuid().optional(),
      variant_id: z.string().uuid().optional(),
      hook: z.string().optional(),
      cta: z.string().optional(),
      creative_label: z.string().optional(),
      utm: z.record(z.string(), z.any()).optional(),
      notes: z.string().optional(),
      idempotency_key: z.string().optional(),
    });
    const body = bodySchema.parse(req.body);

    const lead = await leadsService.createLead({
      workspaceId: req.workspace!.workspaceId,
      actorUserId: req.auth!.userId,
      correlationId: req.correlationId,
      idempotencyKey: body.idempotency_key ?? (req.headers['idempotency-key'] as string | undefined),
      ...body,
    });

    await reply.code(201).send({ lead });
  });

  // Detalhe do lead
  app.get('/leads/:id', { preHandler: [requireAuth, requireWorkspace] }, async (req, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.parse(req.params);

    const lead = await leadsService.getLead({ workspaceId: req.workspace!.workspaceId, leadId: params.id });
    if (!lead) {
      await reply.code(404).send({ error: 'not_found' });
      return;
    }
    return { lead };
  });

  // Timeline (eventos + mensagens)
  app.get('/leads/:id/timeline', { preHandler: [requireAuth, requireWorkspace] }, async (req) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const querySchema = z.object({ limit: z.coerce.number().optional() });
    const params = paramsSchema.parse(req.params);
    const query = querySchema.parse(req.query);

    return leadsService.timeline({
      workspaceId: req.workspace!.workspaceId,
      leadId: params.id,
      limit: query.limit,
    });
  });
}
