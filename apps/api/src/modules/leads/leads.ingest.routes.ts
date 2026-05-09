import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireIngestSecret } from '../auth/ingest.middleware.js';
import { leadsService } from './leads.service.js';

/**
 * Endpoint de captura (LP/webhook) — sem login.
 * Proteção: x-ingest-secret + workspace_id no body.
 */
export async function registerLeadIngestRoutes(app: FastifyInstance): Promise<void> {
  app.post('/ingest/leads', { preHandler: [requireIngestSecret] }, async (req, reply) => {
    const bodySchema = z.object({
      workspace_id: z.string().uuid(),
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
      correlation_id: z.string().uuid().optional(),
    });

    const body = bodySchema.parse(req.body);

    const lead = await leadsService.createLead({
      workspaceId: body.workspace_id,
      correlationId: body.correlation_id,
      idempotencyKey: body.idempotency_key ?? (req.headers['idempotency-key'] as string | undefined),
      name: body.name,
      whatsapp: body.whatsapp,
      company: body.company,
      source_channel: body.source_channel,
      campaign_id: body.campaign_id,
      variant_id: body.variant_id,
      hook: body.hook,
      cta: body.cta,
      creative_label: body.creative_label,
      utm: body.utm,
      notes: body.notes,
    });

    await reply.code(201).send({ lead });
  });
}

