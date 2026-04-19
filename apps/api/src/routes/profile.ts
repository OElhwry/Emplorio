import type { FastifyInstance } from 'fastify';
import { profileSchema } from '@emplorio/shared';

export async function profileRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireAuth);

  app.get('/', async (req) => {
    // TODO: load profile from db
    return { userId: req.userId, profile: null };
  });

  app.put('/', { schema: { body: profileSchema } }, async (req) => {
    // TODO: upsert profile
    return { ok: true };
  });
}
