import { Queue } from 'bullmq';
import { bullConnection } from './connection.js';

export const queues = {
  webhooks: new Queue('webhooks', { connection: bullConnection }),
  messaging: new Queue('messaging', { connection: bullConnection }),
  metrics: new Queue('metrics', { connection: bullConnection }),
};

