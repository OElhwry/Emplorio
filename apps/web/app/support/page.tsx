import type { Metadata } from 'next';
import { LegalNav, SiteFooter } from '../_components/SiteChrome';

export const metadata: Metadata = {
  title: 'Support — Emplorio',
  description: 'Get help with Emplorio: contact us, quick fixes for sign-in and autofill, and how to manage your data.',
};

export default function SupportPage() {
  return (
    <>
      <LegalNav />
      <main>
        <section className="section">
          <div className="container legal">
            <p className="section-eyebrow">Support</p>
            <h1>We&apos;re here to help</h1>
            <p className="lede">
              Have a question, hit a snag, or want to suggest a feature? Email us and a real person will
              get back to you, usually within a couple of business days.
            </p>

            <h2>Contact</h2>
            <p>
              Email <a href="mailto:emplorioEXT@gmail.com">emplorioEXT@gmail.com</a>. If you&apos;re reporting
              a site where autofill missed fields, please include the job page URL so we can improve it.
            </p>

            <h2>Quick fixes</h2>
            <ul>
              <li>
                <strong>Sign-in code didn&apos;t arrive?</strong> Check your spam folder, then request a new
                code after a moment. Codes expire after 10 minutes.
              </li>
              <li>
                <strong>AI features asking for a key?</strong> Cover letters, answers, and follow-ups use your
                own Anthropic key. Add it in Settings, it stays on your device.
              </li>
              <li>
                <strong>Autofill skipped a field?</strong> Anything Emplorio couldn&apos;t match is flagged so
                you can finish it by hand. Tell us the site and we&apos;ll add support for it.
              </li>
              <li>
                <strong>Changes not syncing?</strong> Make sure you&apos;re signed in on both the extension and
                the web app. Your profile syncs to whichever you edited most recently.
              </li>
            </ul>

            <h2>Manage your data</h2>
            <p>
              You can export everything we hold for your account or delete your account entirely from{' '}
              <a href="/settings">Settings</a>. See our <a href="/privacy">Privacy Policy</a> for the full
              detail on what we store and where.
            </p>

            <h2>More</h2>
            <p>
              Browse the <a href="/#faq">FAQ</a> for the questions we get asked most, or read our{' '}
              <a href="/terms">Terms</a>.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
