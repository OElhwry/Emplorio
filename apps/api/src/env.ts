import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });


const optionalUrl = z
  .string()
  .url()
  .optional()
  .or(z.literal('').transform(() => undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  API_PORT: z.coerce.number().default(3001),
  API_ORIGIN: z.string().url().default('http://localhost:3001'),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  JWT_SECRET: z.string().min(32).default('dev-dev-dev-dev-dev-dev-dev-dev-dev'),
  SESSION_TTL_DAYS: z.coerce.number().default(30),
  DATABASE_URL: optionalUrl,
  REDIS_URL: optionalUrl,
  ANTHROPIC_API_KEY: z.string().min(10).optional(),
  // Sonnet for generation (cover letters, answers, follow-ups): strong quality at
  // a fraction of Opus cost, so users on their own key spend far less.
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-6'),
  // Haiku for CV parsing: a cheap structured-extraction task.
  ANTHROPIC_PARSE_MODEL: z.string().default('claude-haiku-4-5-20251001'),
  OWNER_EMAIL: z.string().email().optional(),
  EMPLORIO_API_KEY: z.string().min(16).optional(),
  RESEND_API_KEY: z.string().min(5).optional().or(z.literal('').transform(() => undefined)),
  EMAIL_FROM: z.string().default('Emplorio <noreply@emplorio.co.uk>'),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),
  AXIOM_TOKEN: z.string().optional(),
  AXIOM_DATASET: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = typeof env;

// In production, refuse to start with an insecure auth secret. The dev default is
// public (it's in the repo), so booting with it would let anyone forge sessions.
if (env.NODE_ENV === 'production') {
  const weakSecret =
    !env.JWT_SECRET || env.JWT_SECRET.length < 32 || env.JWT_SECRET.startsWith('dev-dev-dev');
  if (weakSecret) {
    throw new Error(
      'JWT_SECRET must be set to a strong 32+ character value in production. ' +
        'Refusing to start with the insecure default. Set it via `fly secrets set JWT_SECRET=...`.',
    );
  }
  if (env.COOKIE_DOMAIN === 'localhost') {
    // eslint-disable-next-line no-console
    console.warn('[env] COOKIE_DOMAIN is still "localhost" in production; session cookies may not be set.');
  }
}
