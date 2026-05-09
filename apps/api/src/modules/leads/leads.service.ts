import { z } from 'zod';
import { supabaseAdmin } from '../../shared/db/supabaseAdmin.js';
import { queues } from '../../shared/queue/queues.js';
import { reserveIdempotencyKey } from '../../shared/redis/redis.js';
import { correlationIdFrom, newId } from '../../shared/utils/ids.js';
import { eventsService } from '../events/events.service.js';

const createLeadInputSchema = z.object({
  workspaceId: z.string().uuid(),
  actorUserId: z.string().uuid().optional(),
  correlationId: z.string().optional(),
  idempotencyKey: z.string().optional(),

  name: z.string().min(1),
  whatsapp: z.string().min(6),
  company: z.string().optional(),

  source_channel: z.string().min(1).optional(),
  campaign_id: z.string().uuid().optional(),
  variant_id: z.string().uuid().optional(),
  hook: z.string().optional(),
  cta: z.string().optional(),
  creative_label: z.string().optional(),
  utm: z.record(z.string(), z.any()).optional(),
  notes: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadInputSchema>;

const IDEM_TTL_SECONDS = 60 * 60; // 1h

export const leadsService = {
  async createLead(input: CreateLeadInput) {
    const data = createLeadInputSchema.parse(input);
    const correlationId = correlationIdFrom(data.correlationId ?? null);

    if (data.idempotencyKey) {
      const reserved = await reserveIdempotencyKey(
        `idem:lead.create:${data.workspaceId}:${data.idempotencyKey}`,
        IDEM_TTL_SECONDS,
      );
      if (!reserved) {
        // já processado: tenta encontrar lead por evento
        const { data: ev } = await supabaseAdmin
          .from('events')
          .select('entity_id')
          .eq('workspace_id', data.workspaceId)
          .eq('event_type', 'lead.created')
          .eq('idempotency_key', data.idempotencyKey)
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ev?.entity_id) {
          const { data: lead } = await supabaseAdmin
            .from('leads')
            .select('*')
            .eq('workspace_id', data.workspaceId)
            .eq('id', ev.entity_id)
            .maybeSingle();
          if (lead) return lead;
        }
      }
    }

    const leadId = newId();
    const row = {
      id: leadId,
      workspace_id: data.workspaceId,
      name: data.name,
      whatsapp: data.whatsapp,
      company: data.company ?? null,
      source_channel: (data.source_channel ?? 'landing_page') as any,
      campaign_id: data.campaign_id ?? null,
      variant_id: data.variant_id ?? null,
      hook: data.hook ?? null,
      cta: data.cta ?? null,
      creative_label: data.creative_label ?? null,
      utm: data.utm ?? {},
      notes: data.notes ?? null,
      status: 'new',
    };

    const { data: inserted, error } = await supabaseAdmin.from('leads').insert(row).select('*').single();
    if (error) throw error;

    await eventsService.emitEvent({
      workspaceId: data.workspaceId,
      correlationId,
      idempotencyKey: data.idempotencyKey,
      eventType: 'lead.created',
      entity: { type: 'lead', id: leadId },
      actor: data.actorUserId ? { type: 'user', id: data.actorUserId } : { type: 'system' },
      payload: {
        tracking: {
          source_channel: row.source_channel,
          campaign_id: row.campaign_id,
          variant_id: row.variant_id,
          hook: row.hook,
          cta: row.cta,
          creative_label: row.creative_label,
          utm: row.utm,
        },
      },
    });

    // Sprint 1: agregação básica (opcional; mantém o sistema “vivo” com números)
    await queues.metrics.add(
      'aggregate_metrics_basic',
      { workspaceId: data.workspaceId, correlationId },
      { removeOnComplete: true, removeOnFail: 100 },
    );

    return inserted;
  },

  async getLead(params: { workspaceId: string; leadId: string }) {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('workspace_id', params.workspaceId)
      .eq('id', params.leadId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return data;
  },

  async listLeads(params: {
    workspaceId: string;
    status?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }) {
    const pageSize = Math.min(Math.max(params.pageSize ?? 25, 1), 100);
    const page = Math.max(params.page ?? 1, 1);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('workspace_id', params.workspaceId);

    if (params.status) query = query.eq('status', params.status as any);

    if (params.q && params.q.trim()) {
      const q = params.q.trim();
      // MVP: busca simples (nome/empresa/whatsapp). Evolui depois para full-text.
      query = query.or(`name.ilike.%${q}%,company.ilike.%${q}%,whatsapp.ilike.%${q}%`);
    }

    const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
    if (error) throw error;

    return {
      items: data ?? [],
      page,
      pageSize,
      total: count ?? 0,
    };
  },

  async timeline(params: { workspaceId: string; leadId: string; limit?: number }) {
    const limit = Math.min(params.limit ?? 100, 500);

    const [eventsRes, messagesRes] = await Promise.all([
      supabaseAdmin
        .from('events')
        .select('*')
        .eq('workspace_id', params.workspaceId)
        .eq('entity_type', 'lead')
        .eq('entity_id', params.leadId)
        .order('timestamp', { ascending: false })
        .limit(limit),
      supabaseAdmin
        .from('messages')
        .select('*')
        .eq('workspace_id', params.workspaceId)
        .eq('lead_id', params.leadId)
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);

    if (eventsRes.error) throw eventsRes.error;
    if (messagesRes.error) throw messagesRes.error;

    return {
      events: eventsRes.data ?? [],
      messages: messagesRes.data ?? [],
    };
  },
};
