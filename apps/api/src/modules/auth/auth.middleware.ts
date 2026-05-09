import type { FastifyReply, FastifyRequest } from 'fastify';
import { supabaseAdmin } from '../../shared/db/supabaseAdmin.js';
import { correlationIdFrom } from '../../shared/utils/ids.js';

function getBearerToken(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

/**
 * Auth obrigatório (Supabase Access Token).
 * Controller NÃO deve conter regra de negócio — isso é infra/middleware.
 */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  req.correlationId = correlationIdFrom((req.headers['x-correlation-id'] as string | undefined) ?? null);

  const token = getBearerToken(req);
  if (!token) {
    await reply.code(401).send({ error: 'unauthorized', message: 'Missing bearer token' });
    return;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    await reply.code(401).send({ error: 'unauthorized', message: 'Invalid token' });
    return;
  }

  req.auth = {
    userId: data.user.id,
    email: data.user.email ?? undefined,
  };
}

/**
 * Isolamento multi-tenant obrigatório.
 * Requer header: x-workspace-id
 */
export async function requireWorkspace(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!req.auth?.userId) {
    await reply.code(500).send({ error: 'internal', message: 'Auth middleware must run first' });
    return;
  }

  const workspaceId = (req.headers['x-workspace-id'] as string | undefined)?.trim();
  if (!workspaceId) {
    await reply.code(400).send({ error: 'bad_request', message: 'Missing x-workspace-id header' });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', req.auth.userId)
    .maybeSingle();

  if (error || !data) {
    await reply.code(403).send({ error: 'forbidden', message: 'Not a member of this workspace' });
    return;
  }

  req.workspace = { workspaceId: data.workspace_id, role: data.role ?? undefined };
}

