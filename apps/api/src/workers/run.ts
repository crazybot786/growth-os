import { logger } from '../shared/logger.js';
import { startMetricsWorker } from './metrics/metrics.worker.js';
import { startMessagingWorker } from './messaging/messaging.worker.js';
import { startWebhooksWorker } from './webhooks/webhooks.worker.js';

/**
 * Workers desacoplados (BullMQ).
 * - escalabilidade: multiplica processos workers sem tocar no API
 * - resiliência: retries/backoff sem travar request/response
 * - idempotência: dedupe no Redis + keys no Postgres
 */
const workers = [startWebhooksWorker(), startMessagingWorker(), startMetricsWorker()];

for (const w of workers) {
  w.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'worker failed'));
  w.on('error', (err) => logger.error({ err }, 'worker error'));
}

logger.info('workers started');

