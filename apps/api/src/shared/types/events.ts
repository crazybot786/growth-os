import { z } from 'zod';

export const actorTypeSchema = z.enum(['user', 'system', 'automation']);

export const eventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.string().min(1),
  timestamp: z.string().datetime(),
  workspace_id: z.string().uuid(),
  correlation_id: z.string().uuid(),
  idempotency_key: z.string().min(1).optional(),
  entity_type: z.string().min(1),
  entity_id: z.string().uuid(),
  actor_type: actorTypeSchema,
  actor_id: z.string().uuid().optional(),
  payload: z.record(z.string(), z.any()).default({}),
});

export type CanonicalEvent = z.infer<typeof eventSchema>;
