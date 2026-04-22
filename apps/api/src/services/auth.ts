import { createHash, randomInt } from 'node:crypto';
import { SignJWT } from 'jose';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { db, users, magicLinks } from '@emplorio/db';
import { env } from '../env.js';
import { sendLoginCode } from './email.js';
import { logger } from '../lib/logger.js';

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const REQUEST_COOLDOWN_MS = 30 * 1000;

const secret = new TextEncoder().encode(env.JWT_SECRET);

function hashCode(code: string, email: string): string {
  return createHash('sha256').update(`${email.toLowerCase()}:${code}`).digest('hex');
}

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export async function requestLoginCode(rawEmail: string): Promise<{ ok: true; throttled?: boolean }> {
  const email = rawEmail.trim().toLowerCase();

  const recent = await db
    .select({ createdAt: magicLinks.createdAt })
    .from(magicLinks)
    .where(eq(magicLinks.email, email))
    .orderBy(desc(magicLinks.createdAt))
    .limit(1);
  if (recent[0] && Date.now() - recent[0].createdAt.getTime() < REQUEST_COOLDOWN_MS) {
    return { ok: true, throttled: true };
  }

  const code = generateCode();
  const tokenHash = hashCode(code, email);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await db.insert(magicLinks).values({ email, tokenHash, expiresAt });

  try {
    await sendLoginCode(email, code);
  } catch (err) {
    logger.error({ err, email }, 'failed to send login code');
  }
  if (env.NODE_ENV !== 'production') {
    logger.info({ email, code }, '[auth] dev login code');
  }
  return { ok: true };
}

export interface VerifyResult {
  token: string;
  userId: string;
  email: string;
  expiresAt: number;
}

export async function verifyLoginCode(
  rawEmail: string,
  code: string,
  remember: boolean,
): Promise<VerifyResult | { error: string }> {
  const email = rawEmail.trim().toLowerCase();
  const tokenHash = hashCode(code, email);

  const rows = await db
    .select()
    .from(magicLinks)
    .where(
      and(
        eq(magicLinks.email, email),
        isNull(magicLinks.consumedAt),
        gt(magicLinks.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(magicLinks.createdAt))
    .limit(1);

  const row = rows[0];
  if (!row) return { error: 'code expired or not found — request a new one' };
  if (row.attempts >= MAX_ATTEMPTS) return { error: 'too many attempts — request a new code' };

  if (row.tokenHash !== tokenHash) {
    await db
      .update(magicLinks)
      .set({ attempts: row.attempts + 1 })
      .where(eq(magicLinks.id, row.id));
    return { error: 'invalid code' };
  }

  await db.update(magicLinks).set({ consumedAt: new Date() }).where(eq(magicLinks.id, row.id));

  let user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  if (!user) {
    user = (await db.insert(users).values({ email }).returning())[0]!;
  } else {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  }

  const ttlSeconds = (remember ? env.SESSION_TTL_DAYS : 1) * 24 * 60 * 60;
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret);

  return { token, userId: user.id, email, expiresAt: expiresAt * 1000 };
}

export async function getUserById(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}
