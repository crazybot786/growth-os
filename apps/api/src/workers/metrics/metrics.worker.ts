import { Worker } from 'bullmq';
import { bullConnection } from '../../shared/queue/connection.js';
import { logger } from '../../shared/logger.js';
import { supabaseAdmin } from '../../shared/db/supabaseAdmin.js';
import { reserveIdempotencyKey } from '../../shared/redis/redis.js';

const IDEM_TTL_SECONDS = 60 * 10; // 10 min — suficiente para evitar spam em bursts

export function startMetricsWorker() {
  return new Worker(
    'metrics',
    async (job) => {
      if (job.name !== 'aggregate_metrics_basic') return;

      const workspaceId = String((job.data as any).workspaceId ?? '');
      if (!workspaceId) throw new Error('metrics job missing workspaceId');

      const correlationId = String((job.data as any).correlationId ?? '');
      const idemKey = `metrics.basic:${workspaceId}:${new Date().toISOString().slice(0, 16)}`; // bucket por minuto

      const reserved = await reserveIdempotencyKey(`idem:${idemKey}`, IDEM_TTL_SECONDS);
      if (!reserved) return;

      // Leads total
      const total = await supabaseAdmin
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);
      if (total.error) throw total.error;

      const record = async (name: string, value: number, dimensions: Record<string, any> = {}) => {
        const { error } = await supabaseAdmin.from('metrics').insert({
          workspace_id: workspaceId,
          name,
          value,
          dimensions,
          correlation_id: correlationId || null,
        });
        if (error) throw error;
      };

      await record('leads_generated', total.count ?? 0);

      logger.info({ workspaceId, jobId: job.id }, 'metrics: aggregate_metrics_basic ok');
    },
    { connection: bullConnection, concurrency: 2 },
  );
}

