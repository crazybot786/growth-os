import { z } from 'zod';
import { supabaseAdmin } from '../../shared/db/supabaseAdmin.js';
import { reserveIdempotencyKey } from '../../shared/redis/redis.js';
import { correlationIdFrom } from '../../shared/utils/ids.js';
import { eventsService } from '../events/events.service.js';

const updateStatusInputSchema = z.object({
  workspaceId: z.string().uuid(),
  leadId: z.string().uuid(),
  toStatus: z.enum(['new', 'contacted', 'replied', 'qualified', 'scheduled', 'won', 'lost']),
  reason: z.string().optional(),
  actorUserId: z.string().uuid(),
  correlationId: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export type UpdateLeadStatusInput = z.infer<typeof updateStatusInputSchema>;

const IDEM_TTL_SECONDS = 60 * 60;

export const pipelineService = {
  async updateLeadStatus(input: UpdateLeadStatusInput) {
    const data = updateStatusInputSchema.parse(input);
    const correlationId = correlationIdFrom(data.correlationId ?? null);

    if (data.idempotencyKey) {
      const reserved = await reserveIdempotencyKey(
        `idem:lead.status:${data.workspaceId}:${data.leadId}:${data.idempotencyKey}`,
        IDEM_TTL_SECONDS,
      );
      if (!reserved) {
        // já processado: retorna lead atual
        const { data: lead } = await supabaseAdmin
          .from('leads')
          .select('*')
          .eq('workspace_id', data.workspaceId)
          .eq('id', data.leadId)
          .maybeSingle();
        return lead;
      }
    }

    const { data: current, error: getErr } = await supabaseAdmin
      .from('leads')
      .select('id,status')
      .eq('workspace_id', data.workspaceId)
      .eq('id', data.leadId)
      .single();
    if (getErr) throw getErr;

    const fromStatus = current.status as string;

    const { error: updErr } = await supabaseAdmin
      .from('leads')
      .update({ status: data.toStatus, updated_at: new Date().toISOString() })
      .eq('workspace_id', data.workspaceId)
      .eq('id', data.leadId);
    if (updErr) throw updErr;

    // Histórico explícito
    const { error: histErr } = await supabaseAdmin.from('lead_status_history').insert({
      workspace_id: data.workspaceId,
      lead_id: data.leadId,
      from_status: fromStatus,
      to_status: data.toStatus,
      reason: data.reason ?? null,
      actor_type: 'user',
      actor_id: data.actorUserId,
      correlation_id: correlationId,
      idempotency_key: data.idempotencyKey ?? null,
    });
    if (histErr) throw histErr;

    await eventsService.emitEvent({
      workspaceId: data.workspaceId,
      correlationId,
      idempotencyKey: data.idempotencyKey,
      eventType: 'lead.status_changed',
      entity: { type: 'lead', id: data.leadId },
      actor: { type: 'user', id: data.actorUserId },
      payload: { from: fromStatus, to: data.toStatus, reason: data.reason ?? null },
    });

    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('workspace_id', data.workspaceId)
      .eq('id', data.leadId)
      .single();
    if (leadErr) throw leadErr;

    return lead;
  },
};

