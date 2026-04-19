import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const lookupSchema = z.object({
  domain: z.string(),
  formFingerprint: z.string(),
});

const submitSchema = lookupSchema.extend({
  labels: z.array(z.object({ selector: z.string(), label: z.string() })),
});

export async function fieldMappingRoutes(app: FastifyInstance) {
  app.post('/lookup', { schema: { body: lookupSchema } }, async () => {
    // TODO: find cached mapping
    return { mapping: null };
  });

  app.post('/resolve', { schema: { body: submitSchema } }, async () => {
    // TODO: call Claude to map labels -> ProfileKey, cache, return
    return { mapping: {} };
  });
}
