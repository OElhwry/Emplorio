import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db, users, profiles, applications, magicLinks } from '@emplorio/db';
import { requestCodeSchema, verifyCodeSchema } from '@emplorio/shared';
import { env } from '../env.js';
import { getUserById, requestLoginCode, verifyLoginCode } from '../services/auth.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/request-code', {
    schema: { body: requestCodeSchema },
    // Stop the endpoint being used to spray verification emails.
    config: { rateLimit: { max: 5, timeWindow: '5 minutes' } },
  }, async (req, reply) => {
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

  app.post('/verify', {
    schema: { body: verifyCodeSchema },
    // Limit brute-forcing of the 6-digit code from a single IP.
    config: { rateLimit: { max: 10, timeWindow: '5 minutes' } },
  }, async (req, reply) => {
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

  // Download everything we hold for this account (GDPR-style export).
  app.get('/export', { preHandler: app.requireAuth }, async (req, reply) => {
    if (!req.userId) return reply.code(401).send({ error: 'unauthorized' });
    const [user] = await db.select().from(users).where(eq(users.id, req.userId)).limit(1);
    const [profileRow] = await db
      .select({ data: profiles.data })
      .from(profiles)
      .where(eq(profiles.userId, req.userId))
      .limit(1);
    const apps = await db.select().from(applications).where(eq(applications.userId, req.userId));
    reply.header('Content-Disposition', 'attachment; filename="emplorio-data.json"');
    return {
      exportedAt: new Date().toISOString(),
      account: user ? { id: user.id, email: user.email, createdAt: user.createdAt } : null,
      profile: profileRow?.data ?? null,
      applications: apps,
    };
  });

  // Permanently delete the account and all associated data.
  app.delete('/account', { preHandler: app.requireAuth }, async (req, reply) => {
    if (!req.userId) return reply.code(401).send({ error: 'unauthorized' });
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, req.userId))
      .limit(1);
    // magic_links are keyed by email; everything else cascades from the user row.
    if (user?.email) await db.delete(magicLinks).where(eq(magicLinks.email, user.email));
    await db.delete(users).where(eq(users.id, req.userId));
    reply.clearCookie('emplorio_session', { path: '/' });
    return { ok: true };
  });
}
