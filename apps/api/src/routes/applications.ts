import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createApplicationSchema, updateApplicationSchema } from '@emplorio/shared';

const idParam = z.object({ id: z.string().uuid() });

export async function applicationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireAuth);

  app.get('/', async (req) => {
    // TODO: list applications for req.userId
    return { items: [] };
  });

  app.post('/', { schema: { body: createApplicationSchema } }, async (req, reply) => {
    // TODO: insert
    reply.code(201).send({ id: 'todo' });
  });

  app.get('/:id', { schema: { params: idParam } }, async (req) => {
    return { application: null };
  });

  app.patch(
    '/:id',
    { schema: { params: idParam, body: updateApplicationSchema } },
    async () => ({ ok: true }),
  );

  app.delete('/:id', { schema: { params: idParam } }, async () => ({ ok: true }));
}
