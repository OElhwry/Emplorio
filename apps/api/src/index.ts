import { buildServer } from './server.js';
import { env } from './env.js';

const server = await buildServer();

try {
  await server.listen({ port: env.API_PORT, host: '0.0.0.0' });
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
