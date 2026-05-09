import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireWorkspace } from '../auth/auth.middleware.js';
import { campaignsService } from './campaigns.service.js';

export async function registerCampaignRoutes(app: FastifyInstance): Promise<void> {
  app.get('/campaigns', { preHandler: [requireAuth, requireWorkspace] }, async (req) => {
    return { campaigns: await campaignsService.listCampaigns({ workspaceId: req.workspace!.workspaceId }) };
  });

  app.post('/campaigns', { preHandler: [requireAuth, requireWorkspace] }, async (req, reply) => {
    const bodySchema = z.object({
      name: z.string().min(1),
      channel: z.enum(['meta', 'google', 'tiktok', 'organic', 'referral', 'whatsapp', 'landing_page']),
      objective: z.string().optional(),
    });
    const body = bodySchema.parse(req.body);
    const campaign = await campaignsService.createCampaign({
      workspaceId: req.workspace!.workspaceId,
      actorUserId: req.auth!.userId,
      correlationId: req.correlationId,
      ...body,
    });
    await reply.code(201).send({ campaign });
  });

  app.get('/variants', { preHandler: [requireAuth, requireWorkspace] }, async (req) => {
    const qSchema = z.object({ campaign_id: z.string().uuid().optional() });
    const q = qSchema.parse(req.query);
    return {
      variants: await campaignsService.listVariants({
        workspaceId: req.workspace!.workspaceId,
        campaignId: q.campaign_id,
      }),
    };
  });

  app.post('/variants', { preHandler: [requireAuth, requireWorkspace] }, async (req, reply) => {
    const bodySchema = z.object({
      campaign_id: z.string().uuid().optional(),
      hook: z.string().min(1),
      angle: z.string().optional(),
      pain: z.string().optional(),
      mechanism: z.string().optional(),
      cta: z.string().min(1),
      version: z.string().min(1),
      test_date: z.string().optional(),
      creative_label: z.string().optional(),
      headline: z.string().optional(),
      guarantee: z.string().optional(),
      promise_time: z.string().optional(),
    });
    const body = bodySchema.parse(req.body);
    const variant = await campaignsService.createVariant({
      workspaceId: req.workspace!.workspaceId,
      actorUserId: req.auth!.userId,
      correlationId: req.correlationId,
      campaignId: body.campaign_id,
      hook: body.hook,
      angle: body.angle,
      pain: body.pain,
      mechanism: body.mechanism,
      cta: body.cta,
      version: body.version,
      test_date: body.test_date,
      creative_label: body.creative_label,
      headline: body.headline,
      guarantee: body.guarantee,
      promise_time: body.promise_time,
    });
    await reply.code(201).send({ variant });
  });
}
