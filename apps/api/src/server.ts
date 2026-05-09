import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { env } from './shared/env.js';
import { logger } from './shared/logger.js';
import { registerEventRoutes } from './modules/events/events.routes.js';
import { registerWorkspaceRoutes } from './modules/auth/workspaces.routes.js';
import { registerLeadRoutes } from './modules/leads/leads.routes.js';
import { registerLeadIngestRoutes } from './modules/leads/leads.ingest.routes.js';
import { registerPipelineRoutes } from './modules/pipeline/pipeline.routes.js';
import { registerMessagingRoutes } from './modules/messaging/messaging.routes.js';
import { registerMetricsRoutes } from './modules/metrics/metrics.routes.js';
import { registerCampaignRoutes } from './modules/campaigns/campaigns.routes.js';
import { registerTrackingRoutes } from './modules/tracking/tracking.routes.js';

const app = Fastify({
  logger,
  genReqId: (req) => (req.headers['x-correlation-id'] as string) ?? undefined,
});

await app.register(helmet);
await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });

app.get('/health', async () => ({ ok: true }));

// Rotas (Sprint 1)
await app.register(registerWorkspaceRoutes);
await app.register(registerEventRoutes);
await app.register(registerLeadRoutes);
await app.register(registerLeadIngestRoutes);
await app.register(registerPipelineRoutes);
await app.register(registerMessagingRoutes);
await app.register(registerMetricsRoutes);
await app.register(registerCampaignRoutes);
await app.register(registerTrackingRoutes);

const port = env.PORT;
await app.listen({ port, host: '0.0.0.0' });
