import { z } from 'zod';
import { supabaseAdmin } from '../../shared/db/supabaseAdmin.js';
import { reserveIdempotencyKey } from '../../shared/redis/redis.js';
import { correlationIdFrom, newId } from '../../shared/utils/ids.js';

const emitInputSchema = z.object({
  workspaceId: z.string().uuid(),
  correlationId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  eventType: z.string().min(1),
  entity: z.object({
    type: z.string().min(1),
    id: z.string().uuid(),
  }),
  actor: z.object({
    type: z.enum(['user', 'system', 'automation']),
    id: z.string().uuid().optional(),
  }),
  payload: z.record(z.string(), z.any()).optional(),
});

export type EmitEventInput = z.infer<typeof emitInputSchema>;

const IDEM_TTL_SECONDS = 60 * 60; // 1h (replay de webhook/job)

export const eventsService = {
  async emitEvent(input: EmitEventInput) {
    const data = emitInputSchema.parse(input);
    const correlationId = correlationIdFrom(data.correlationId ?? null);
    const eventId = newId();
    const timestamp = new Date().toISOString();

    // Idempotência (dedupe + UNIQUE index no Postgres)
    if (data.idempotencyKey) {
      const reserved = await reserveIdempotencyKey(
        `idem:event:${data.workspaceId}:${data.eventType}:${data.idempotencyKey}`,
        IDEM_TTL_SECONDS,
      );
      if (!reserved) {
        // já processado — tenta devolver o evento existente (melhor para retries)
        const { data: existing } = await supabaseAdmin
          .from('events')
          .select('*')
          .eq('workspace_id', data.workspaceId)
          .eq('event_type', data.eventType)
          .eq('idempotency_key', data.idempotencyKey)
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) return existing;
      }
    }

    const row = {
      event_id: eventId,
      event_type: data.eventType,
      timestamp,
      workspace_id: data.workspaceId,
      correlation_id: correlationId,
      idempotency_key: data.idempotencyKey ?? null,
      entity_type: data.entity.type,
      entity_id: data.entity.id,
      actor_type: data.actor.type,
      actor_id: data.actor.id ?? null,
      payload: data.payload ?? {},
    };

    const { data: inserted, error } = await supabaseAdmin.from('events').insert(row).select('*').single();
    if (error) throw error;
    return inserted;
  },

  async timeline(params: { workspaceId: string; entityType: string; entityId: string; limit?: number }) {
    const limit = Math.min(params.limit ?? 100, 500);
    const { data, error } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('workspace_id', params.workspaceId)
      .eq('entity_type', params.entityType)
      .eq('entity_id', params.entityId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  },
};
