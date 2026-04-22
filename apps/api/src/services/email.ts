import { Resend } from 'resend';
import { env } from '../env.js';
import { logger } from '../lib/logger.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendLoginCode(email: string, code: string): Promise<void> {
  if (!resend) {
    logger.warn({ email, code }, '[email] RESEND_API_KEY not set — printing code instead');
    return;
  }
  const subject = `Your Emplorio sign-in code: ${code}`;
  const text = `Your sign-in code is ${code}.\n\nIt expires in 10 minutes. If you didn't ask to sign in, ignore this email.`;
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
      <h2 style="margin:0 0 16px">Sign in to Emplorio</h2>
      <p style="margin:0 0 16px;color:#444">Enter this code in the extension to sign in:</p>
      <div style="font-size:32px;letter-spacing:6px;font-weight:700;background:#f4f4f5;padding:16px 24px;border-radius:8px;text-align:center;margin:16px 0">${code}</div>
      <p style="margin:16px 0 0;color:#666;font-size:13px">Expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>`;
  try {
    await resend.emails.send({ from: env.EMAIL_FROM, to: email, subject, text, html });
  } catch (err) {
    logger.error({ err, email }, '[email] failed to send login code');
    throw err;
  }
}
