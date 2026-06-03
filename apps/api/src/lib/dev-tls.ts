import { env } from '../env.js';
import { logger } from './logger.js';

/**
 * Local machines that run a TLS-inspecting proxy or antivirus (ESET, Kaspersky,
 * Avast, corporate MITM) present a re-signed certificate that Node's bundled CA
 * store does not trust, which surfaces as:
 *   NeonDbError: fetch failed — unable to verify the first certificate
 *
 * The correct fix is to trust that root CA via NODE_EXTRA_CA_CERTS. For local
 * dev only, when no such CA is configured, we relax TLS verification on outbound
 * fetch (which the Neon HTTP driver uses) so the dev server can connect. This is
 * gated to non-production and never weakens the deployed API.
 */
export function installDevTlsBypass(): void {
  if (env.NODE_ENV === 'production') return;
  if (process.env.NODE_EXTRA_CA_CERTS) return; // a real CA is configured — respect it
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') return; // already set by the user

  // undici's fetch (used by @neondatabase/serverless) reads this when it builds
  // its connector on first use, so setting it before any request takes effect.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  logger.warn(
    '[dev-tls] TLS verification relaxed for outbound fetch (dev only). ' +
      'Set NODE_EXTRA_CA_CERTS to your proxy/antivirus root CA for a proper fix.',
  );
}
