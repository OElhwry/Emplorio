import type { FastifyInstance } from 'fastify';
import { generateCoverLetterSchema, generateTailoredCvSchema } from '@emplorio/shared';

export async function generateRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireAuth);

  app.post(
    '/cover-letter',
    { schema: { body: generateCoverLetterSchema } },
    async (req, reply) => {
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      // TODO: stream Claude tokens; persist generated_doc on completion
      reply.raw.write(`data: ${JSON.stringify({ delta: 'TODO' })}\n\n`);
      reply.raw.end();
    },
  );

  app.post('/tailored-cv', { schema: { body: generateTailoredCvSchema } }, async () => {
    // TODO: enqueue PDF render job
    return { jobId: 'todo' };
  });
}
