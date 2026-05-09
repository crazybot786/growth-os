import { Worker } from 'bullmq';
import { bullConnection } from '../../shared/queue/connection.js';
import { logger } from '../../shared/logger.js';
import { reserveIdempotencyKey } from '../../shared/redis/redis.js';
import { eventsService } from '../../modules/events/events.service.js';

const IDEM_TTL_SECONDS = 60 * 60;

/**
 * Worker de ingestão/replay de webhooks.
 * Sprint 1: estrutura pronta. Ele recebe um "canonical event" e persiste no Event Bus.
 */
export function startWebhooksWorker() {
  return new Worker(
    'webhooks',
    async (job) => {
      if (job.name !== 'ingest_webhook') return;

      const { workspaceId, event } = job.data as any;
      if (!workspaceId || !event) throw new Error('webhooks job missing workspaceId/event');

      const idemKey = event.idempotency_key ?? `webhook:${job.id}`;
      const reserved = await reserveIdempotencyKey(`idem:webhook:${workspaceId}:${idemKey}`, IDEM_TTL_SECONDS);
      if (!reserved) return;

      await eventsService.emitEvent({
        workspaceId,
        correlationId: event.correlation_id,
        idempotencyKey: idemKey,
        eventType: event.event_type,
        entity: { type: event.entity_type, id: event.entity_id },
        actor: { type: event.actor_type ?? 'automation', id: event.actor_id },
        payload: event.payload ?? {},
      });

      logger.info({ workspaceId, jobId: job.id }, 'webhooks: ingest_webhook ok');
    },
    { connection: bullConnection, concurrency: 5 },
  );
}

