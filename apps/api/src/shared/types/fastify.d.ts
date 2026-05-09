import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    auth?: {
      userId: string;
      email?: string;
    };
    workspace?: {
      workspaceId: string;
      role?: string;
    };
    correlationId?: string;
  }
}

