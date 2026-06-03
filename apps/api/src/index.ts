import { buildServer } from './server.js';
import { env } from './env.js';
import { installDevTlsBypass } from './lib/dev-tls.js';

// Must run before the first outbound fetch (DB connect, Resend, etc.).
installDevTlsBypass();

const server = await buildServer();

try {
  await server.listen({ port: env.API_PORT, host: '0.0.0.0' });
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
