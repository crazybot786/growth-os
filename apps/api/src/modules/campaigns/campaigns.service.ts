import { z } from 'zod';
import { supabaseAdmin } from '../../shared/db/supabaseAdmin.js';
import { newId } from '../../shared/utils/ids.js';
import { eventsService } from '../events/events.service.js';

const createCampaignSchema = z.object({
  workspaceId: z.string().uuid(),
  actorUserId: z.string().uuid(),
  correlationId: z.string().optional(),
  name: z.string().min(1),
  channel: z.enum(['meta', 'google', 'tiktok', 'organic', 'referral', 'whatsapp', 'landing_page']),
  objective: z.string().optional(),
});

const createVariantSchema = z.object({
  workspaceId: z.string().uuid(),
  actorUserId: z.string().uuid(),
  correlationId: z.string().optional(),
  campaignId: z.string().uuid().optional(),
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

export const campaignsService = {
  async createCampaign(input: z.infer<typeof createCampaignSchema>) {
    const data = createCampaignSchema.parse(input);
    const id = newId();
    const { data: inserted, error } = await supabaseAdmin
      .from('campaigns')
      .insert({
        id,
        workspace_id: data.workspaceId,
        name: data.name,
        channel: data.channel,
        objective: data.objective ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;

    await eventsService.emitEvent({
      workspaceId: data.workspaceId,
      correlationId: data.correlationId,
      eventType: 'campaign.created',
      entity: { type: 'campaign', id },
      actor: { type: 'user', id: data.actorUserId },
      payload: { name: data.name, channel: data.channel },
    });

    return inserted;
  },

  async listCampaigns(params: { workspaceId: string }) {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('workspace_id', params.workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async createVariant(input: z.infer<typeof createVariantSchema>) {
    const data = createVariantSchema.parse(input);
    const id = newId();
    const { data: inserted, error } = await supabaseAdmin
      .from('variants')
      .insert({
        id,
        workspace_id: data.workspaceId,
        campaign_id: data.campaignId ?? null,
        hook: data.hook,
        angle: data.angle ?? null,
        pain: data.pain ?? null,
        mechanism: data.mechanism ?? null,
        cta: data.cta,
        version: data.version,
        test_date: data.test_date ?? null,
        creative_label: data.creative_label ?? null,
        headline: data.headline ?? null,
        guarantee: data.guarantee ?? null,
        promise_time: data.promise_time ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;

    await eventsService.emitEvent({
      workspaceId: data.workspaceId,
      correlationId: data.correlationId,
      eventType: 'variant.created',
      entity: { type: 'variant', id },
      actor: { type: 'user', id: data.actorUserId },
      payload: { hook: data.hook, cta: data.cta, version: data.version, campaign_id: data.campaignId ?? null },
    });

    return inserted;
  },

  async listVariants(params: { workspaceId: string; campaignId?: string }) {
    let q = supabaseAdmin.from('variants').select('*').eq('workspace_id', params.workspaceId);
    if (params.campaignId) q = q.eq('campaign_id', params.campaignId);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

