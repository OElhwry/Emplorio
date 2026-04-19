import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { jwtVerify } from 'jose';
import { env } from '../env.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
  interface FastifyInstance {
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const secret = new TextEncoder().encode(env.JWT_SECRET);

export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest('userId', undefined);

  app.addHook('preHandler', async (req: FastifyRequest) => {
    const token = req.cookies['emplorio_session'];
    if (!token) return;
    try {
      const { payload } = await jwtVerify(token, secret);
      req.userId = payload.sub;
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
