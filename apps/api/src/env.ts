import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  API_PORT: z.coerce.number().default(3001),
  API_ORIGIN: z.string().url(),
  WEB_ORIGIN: z.string().url(),
  COOKIE_DOMAIN: z.string(),
  JWT_SECRET: z.string().min(32),
  SESSION_TTL_DAYS: z.coerce.number().default(30),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  ANTHROPIC_API_KEY: z.string().min(10),
  ANTHROPIC_MODEL: z.string().default('claude-opus-4-7'),
  RESEND_API_KEY: z.string().min(5),
  EMAIL_FROM: z.string(),
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
