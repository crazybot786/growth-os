import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from './auth.middleware.js';
import { createWorkspace, listUserWorkspaces } from './workspaces.service.js';

export async function registerWorkspaceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/workspaces', { preHandler: [requireAuth] }, async (req) => {
    const userId = req.auth!.userId;
    return { workspaces: await listUserWorkspaces({ userId }) };
  });

  app.post('/workspaces', { preHandler: [requireAuth] }, async (req, reply) => {
    const bodySchema = z.object({ name: z.string().min(1) });
    const body = bodySchema.parse(req.body);

    const correlationId = req.correlationId ?? '00000000-0000-0000-0000-000000000000';
    const result = await createWorkspace({
      userId: req.auth!.userId,
      name: body.name,
      correlationId,
    });

    await reply.code(201).send(result);
  });
}

