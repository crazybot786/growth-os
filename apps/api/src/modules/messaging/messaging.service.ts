import { z } from 'zod';
import { supabaseAdmin } from '../../shared/db/supabaseAdmin.js';
import { reserveIdempotencyKey } from '../../shared/redis/redis.js';
import { correlationIdFrom, newId } from '../../shared/utils/ids.js';
import { eventsService } from '../events/events.service.js';

const logMessageInputSchema = z.object({
  workspaceId: z.string().uuid(),
  leadId: z.string().uuid(),
  direction: z.enum(['outbound', 'inbound']),
  channel: z.enum(['whatsapp', 'email']).default('whatsapp'),
  body: z.string().min(1),
  actorUserId: z.string().uuid().optional(),
  correlationId: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export type LogMessageInput = z.infer<typeof logMessageInputSchema>;

const IDEM_TTL_SECONDS = 60 * 60;

export const messagingService = {
  /**
   * Sprint 1: WhatsApp MVP = wa.me + mensagem pré-preenchida.
   * Regra: deve ser 1 clique, sem fricção operacional.
   */
  buildWaMeLink(params: { whatsapp: string; text: string }) {
    const phone = params.whatsapp.replace(/\D/g, '');
    const text = encodeURIComponent(params.text);
    return `https://wa.me/${phone}?text=${text}`;
  },

  async logMessage(input: LogMessageInput) {
    const data = logMessageInputSchema.parse(input);
    const correlationId = correlationIdFrom(data.correlationId ?? null);

    if (data.idempotencyKey) {
      const reserved = await reserveIdempotencyKey(
        `idem:message:${data.workspaceId}:${data.idempotencyKey}`,
        IDEM_TTL_SECONDS,
      );
      if (!reserved) {
        const { data: existing } = await supabaseAdmin
          .from('messages')
          .select('*')
          .eq('workspace_id', data.workspaceId)
          .eq('idempotency_key', data.idempotencyKey)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing) return existing;
      }
    }

    const messageId = newId();
    const now = new Date().toISOString();

    const { data: inserted, error } = await supabaseAdmin
      .from('messages')
      .insert({
        id: messageId,
        workspace_id: data.workspaceId,
        lead_id: data.leadId,
        channel: data.channel,
        direction: data.direction,
        body: data.body,
        correlation_id: correlationId,
        idempotency_key: data.idempotencyKey ?? null,
        actor_type: data.actorUserId ? 'user' : 'system',
        actor_id: data.actorUserId ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;

    // Atualiza “último contato” para operação rápida
    const patch: any = { last_contact_at: now, updated_at: now };
    if (data.direction === 'outbound') patch.last_outbound_at = now;
    if (data.direction === 'inbound') patch.last_inbound_at = now;

    await supabaseAdmin.from('leads').update(patch).eq('workspace_id', data.workspaceId).eq('id', data.leadId);

    await eventsService.emitEvent({
      workspaceId: data.workspaceId,
      correlationId,
      idempotencyKey: data.idempotencyKey,
      eventType: data.direction === 'outbound' ? 'message.sent' : 'message.received',
      entity: { type: 'lead', id: data.leadId },
      actor: { type: data.actorUserId ? 'user' : 'system', id: data.actorUserId ?? undefined },
      payload: { channel: data.channel, direction: data.direction, message_id: messageId },
    });

    return inserted;
  },
};

