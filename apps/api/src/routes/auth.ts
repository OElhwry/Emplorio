import type { FastifyInstance } from 'fastify';
import { requestCodeSchema, verifyCodeSchema } from '@emplorio/shared';
import { env } from '../env.js';
import { getUserById, requestLoginCode, verifyLoginCode } from '../services/auth.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/request-code', { schema: { body: requestCodeSchema } }, async (req, reply) => {
    const { email } = req.body as { email: string };
    try {
      const result = await requestLoginCode(email);
      // A real transport failure (e.g. unverified Resend domain) is a server
      // problem, not email-existence disclosure, so surface it in production.
      if (result.sendFailed && env.NODE_ENV === 'production') {
        return reply.code(502).send({ ok: false, error: 'Could not send the email. Please try again shortly.' });
      }
      // 202 either way; the code is only included outside production.
      return reply.code(202).send({ ok: true, devCode: result.devCode });
    } catch (err) {
      req.log.error({ err }, 'request-code failed');
      // Never disclose whether the email exists on unexpected errors.
      return reply.code(202).send({ ok: true });
    }
  });

  app.post('/verify', { schema: { body: verifyCodeSchema } }, async (req, reply) => {
    const { email, code, remember } = req.body as {
      email: string;
      code: string;
      remember: boolean;
    };
    const result = await verifyLoginCode(email, code, remember);
    if ('error' in result) {
      return reply.code(400).send({ error: result.error });
    }
    const cookieMaxAge = Math.max(0, Math.floor((result.expiresAt - Date.now()) / 1000));
    reply.setCookie('emplorio_session', result.token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: cookieMaxAge,
      domain: env.NODE_ENV === 'production' ? env.COOKIE_DOMAIN : undefined,
    });
    return reply.code(200).send({
      ok: true,
      token: result.token,
      userId: result.userId,
      email: result.email,
      expiresAt: result.expiresAt,
    });
  });

  app.post('/logout', async (_req, reply) => {
    reply.clearCookie('emplorio_session', { path: '/' });
    return { ok: true };
  });

  app.get('/me', { preHandler: app.requireAuth }, async (req, reply) => {
    if (!req.userId) return reply.code(401).send({ error: 'unauthorized' });
    const user = await getUserById(req.userId);
    if (!user) return reply.code(401).send({ error: 'unauthorized' });
    return { userId: user.id, email: user.email };
  });
}
