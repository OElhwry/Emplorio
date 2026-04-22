import type { Metadata } from 'next';
import { LegalNav, SiteFooter } from '../_components/SiteChrome';

export const metadata: Metadata = {
  title: 'Terms — Emplorio',
  description: "The terms of using Emplorio: what the service is, how to use it well, and where the limits are.",
};

export default function TermsPage() {
  return (
    <>
      <LegalNav />
      <main>
        <section className="section">
          <div className="container legal">
            <p className="section-eyebrow">Last updated: 22 April 2026</p>
            <h1>Terms of Service</h1>
            <p className="lede">
              By installing the Emplorio Chrome extension or signing in to the Emplorio service, you agree
              to these terms. They're short on purpose — read them once and you'll know where you stand.
            </p>

            <h2>What Emplorio is</h2>
            <p>
              Emplorio is a Chrome extension that auto-fills job applications, drafts cover letters and answers
              to open-ended questions, drafts follow-up emails, and tracks the applications you've sent. The
              core auto-fill, tracking and sync features are free. AI features require you to bring your own
              Anthropic API key — Anthropic bills you directly for that usage; Emplorio does not.
            </p>

            <h2>Your account</h2>
            <p>
              You're responsible for keeping your sign-in email secure and for everything that happens through
              your account. Use one account per person. If you spot unauthorised use, email us straight away.
            </p>

            <h2>Acceptable use</h2>
            <p>You agree not to use Emplorio to:</p>
            <ul>
              <li>Spam employers or apply to roles you have no genuine interest in.</li>
              <li>Submit content you know to be false, defamatory, or misleading.</li>
              <li>Reverse-engineer, scrape, or place automated load on the Emplorio API.</li>
              <li>Impersonate another person or misrepresent your relationship with one.</li>
            </ul>

            <h2>AI output</h2>
            <p>
              Cover letters, answer drafts, and follow-up emails are produced by an AI model. They can be
              wrong, miss context, or sound off. <strong>Read every draft before you send it.</strong> You're
              responsible for the final text that leaves your hands.
            </p>

            <h2>Service availability</h2>
            <p>
              We do our best to keep the API up, but Emplorio is provided on a best-effort basis with no SLA.
              We may take it down for maintenance or change features without notice.
            </p>

            <h2>No warranty</h2>
            <p>
              Emplorio is provided "as is" without warranties of any kind. We don't guarantee that auto-fill
              will work on every site, that AI drafts will be accurate, or that using Emplorio will result in
              any particular job outcome.
            </p>

            <h2>Limitation of liability</h2>
            <p>
              To the fullest extent allowed by law, Emplorio's total liability for any claim relating to the
              service is limited to the amount you've paid us in the previous 12 months — which, for most
              users, is £0. We're not liable for indirect or consequential losses, including missed jobs,
              employer responses, or charges you incur from Anthropic.
            </p>

            <h2>Termination</h2>
            <p>
              You can stop using Emplorio at any time and delete your account by emailing us. We may suspend
              or terminate accounts that violate these terms.
            </p>

            <h2>Governing law</h2>
            <p>
              These terms are governed by the laws of England and Wales. Disputes will be handled by the
              courts of England and Wales.
            </p>

            <h2>Updates</h2>
            <p>
              If we change these terms materially, we'll update the date at the top and notify you in the
              extension where appropriate.
            </p>

            <h2>Contact</h2>
            <p>
              Questions about these terms? Email <a href="mailto:emplorioEXT@gmail.com">emplorioEXT@gmail.com</a>.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
