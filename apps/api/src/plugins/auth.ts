import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { jwtVerify } from 'jose';
import { env } from '../env.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userEmail?: string;
  }
  interface FastifyInstance {
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const secret = new TextEncoder().encode(env.JWT_SECRET);

function bearerToken(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  if (header.startsWith('Bearer ')) {
    const token = header.slice(7).trim();
    return token.length > 0 ? token : null;
  }
  return null;
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest('userId', undefined);
  app.decorateRequest('userEmail', undefined);

  app.addHook('preHandler', async (req: FastifyRequest) => {
    const token = bearerToken(req) ?? req.cookies['emplorio_session'];
    if (!token) return;
    try {
      const { payload } = await jwtVerify(token, secret);
      req.userId = payload.sub;
      if (typeof payload.email === 'string') req.userEmail = payload.email;
    } catch {
      // anonymous request
    }
  });

  app.decorate('requireAuth', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.userId) {
      reply.code(401).send({ error: 'unauthorized' });
    }
  });
});
