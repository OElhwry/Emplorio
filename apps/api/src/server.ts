import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';
import { env } from './env.js';
import { logger } from './lib/logger.js';
import { authRoutes } from './routes/auth.js';
import { profileRoutes } from './routes/profile.js';
import { applicationRoutes } from './routes/applications.js';
import { generateRoutes } from './routes/generate.js';
import { fieldMappingRoutes } from './routes/fieldMappings.js';
import { authPlugin } from './plugins/auth.js';

export async function buildServer() {
  const app = Fastify({ loggerInstance: logger }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet);
  // Allow the configured web origin plus the known apex/www domains and the
  // extension. A misconfigured WEB_ORIGIN was surfacing in the browser as an
  // opaque "Failed to fetch", so we accept the obvious production variants too.
  const allowedOrigins = new Set(
    [env.WEB_ORIGIN, 'https://emplorio.co.uk', 'https://www.emplorio.co.uk'].filter(Boolean),
  );
  await app.register(cors, {
    origin(origin, cb) {
      // No Origin header (same-origin, curl, server-to-server, health checks).
      if (!origin) return cb(null, true);
      if (allowedOrigins.has(origin)) return cb(null, true);
      if (/^chrome-extension:\/\//.test(origin)) return cb(null, true);
      // Any localhost port while developing.
      if (env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: true,
  });
  await app.register(cookie);
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  await app.register(authPlugin);

  app.get('/health', () => ({ ok: true }));

  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(profileRoutes, { prefix: '/profile' });
  await app.register(applicationRoutes, { prefix: '/applications' });
  await app.register(generateRoutes, { prefix: '/generate' });
  await app.register(fieldMappingRoutes, { prefix: '/field-mappings' });

  return app;
}
