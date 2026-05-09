import { Worker } from 'bullmq';
import { bullConnection } from '../../shared/queue/connection.js';
import { logger } from '../../shared/logger.js';
import { messagingService } from '../../modules/messaging/messaging.service.js';

/**
 * Worker de messaging (envio/log).
 * Sprint 1: placeholder (o endpoint já loga message.sent).
 * Sprint 2+: integra Evolution/Baileys e processa retries de envio real.
 */
export function startMessagingWorker() {
  return new Worker(
    'messaging',
    async (job) => {
      if (job.name !== 'log_message_sent') return;
      const { workspaceId, leadId, body, actorUserId, correlationId, idempotencyKey } = job.data as any;

      await messagingService.logMessage({
        workspaceId,
        leadId,
        direction: 'outbound',
        channel: 'whatsapp',
        body,
        actorUserId,
        correlationId,
        idempotencyKey,
      });

      logger.info({ workspaceId, leadId, jobId: job.id }, 'messaging: log_message_sent ok');
    },
    { connection: bullConnection, concurrency: 5 },
  );
}

