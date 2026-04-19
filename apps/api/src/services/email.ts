import { Resend } from 'resend';
import { env } from '../env.js';

const resend = new Resend(env.RESEND_API_KEY);

export async function sendMagicLink(to: string, link: string) {
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: 'Your Emplorio sign-in link',
    text: `Click to sign in: ${link}\n\nLink expires in 15 minutes.`,
  });
}
