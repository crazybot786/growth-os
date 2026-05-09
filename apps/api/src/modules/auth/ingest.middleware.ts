import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../shared/env.js';

/**
 * Captura de lead (LP / webhook) SEM auth de usuário.
 * Proteção: header x-ingest-secret (shared secret).
 */
export async function requireIngestSecret(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!env.INGEST_SECRET) {
    await reply
      .code(500)
      .send({ error: 'ingest_not_configured', message: 'INGEST_SECRET not configured' });
    return;
  }

  const secret = (req.headers['x-ingest-secret'] as string | undefined)?.trim();
  if (!secret || secret !== env.INGEST_SECRET) {
    await reply.code(401).send({ error: 'unauthorized', message: 'Invalid ingest secret' });
    return;
  }
}

