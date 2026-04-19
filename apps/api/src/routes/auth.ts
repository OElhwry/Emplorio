import type { FastifyInstance } from 'fastify';
import { requestMagicLinkSchema, verifyMagicLinkSchema } from '@emplorio/shared';

export async function authRoutes(app: FastifyInstance) {
  app.post('/magic-link', { schema: { body: requestMagicLinkSchema } }, async (req, reply) => {
    // TODO: create + email magic link via Resend
    reply.code(202).send({ ok: true });
  });

  app.post('/verify', { schema: { body: verifyMagicLinkSchema } }, async (req, reply) => {
    // TODO: verify token, mint JWT, set HTTP-only cookie
    reply.code(200).send({ ok: true });
  });

  app.post('/logout', async (req, reply) => {
    reply.clearCookie('emplorio_session');
    return { ok: true };
  });

  app.get('/me', { preHandler: app.requireAuth }, async (req) => {
    return { userId: req.userId };
  });
}
