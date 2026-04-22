import type { Metadata } from 'next';
import { LegalNav, SiteFooter } from '../_components/SiteChrome';

export const metadata: Metadata = {
  title: 'Privacy — Emplorio',
  description: 'How Emplorio handles your data: what we collect, where it lives, and the controls you have over it.',
};

export default function PrivacyPage() {
  return (
    <>
      <LegalNav />
      <main>
        <section className="section">
          <div className="container legal">
            <p className="section-eyebrow">Last updated: 22 April 2026</p>
            <h1>Privacy Policy</h1>
            <p className="lede">
              Emplorio is a Chrome extension that auto-fills job applications and a small sync service that
              keeps your profile in step across devices. We've kept this policy short and in plain English
              because it should be easy to know what we do with your data.
            </p>

            <h2>Who we are</h2>
            <p>
              Emplorio is operated from the United Kingdom. If you'd like to reach us about anything in this
              policy, email <a href="mailto:emplorioEXT@gmail.com">emplorioEXT@gmail.com</a>.
            </p>

            <h2>What we store</h2>
            <ul>
              <li><strong>Account:</strong> the email you sign in with.</li>
              <li><strong>Profile:</strong> the fields you fill in (name, contact details, work history, links, demographics, etc.) so the extension can paste them into job forms.</li>
              <li><strong>Application history:</strong> job title, company, URL, status and timestamps for the roles you've applied to via Emplorio.</li>
              <li><strong>Generated drafts:</strong> the cover letters, question answers and follow-up emails the AI has produced for you.</li>
              <li><strong>Settings:</strong> your theme preference and a flag for whether the extension is paused on the current site.</li>
            </ul>

            <h2>Your Anthropic API key</h2>
            <p>
              AI features (cover letters, answer drafts, follow-ups, CV extraction) require <em>your</em>{' '}
              Anthropic API key. The key is stored locally in <code>chrome.storage</code> on your device. When you
              trigger an AI action it's sent to our API on a single request, used to call Anthropic on your behalf,
              and discarded. We never log it, persist it, or share it.
            </p>

            <h2>Where it lives</h2>
            <p>
              Profile and application data lives in two places: locally in your browser (so the extension works
              offline) and in our database (so it syncs across devices once you sign in). The database is hosted
              on Neon (EU region) and the API runs on Fly.io in London. Sign-in codes are sent via Resend.
            </p>

            <h2>Third parties</h2>
            <p>
              We use <strong>Neon</strong> for the Postgres database that stores your account, profile, and
              application history; <strong>Fly.io</strong> for hosting the Emplorio API; <strong>Resend</strong>{' '}
              for one-time sign-in emails; and <strong>Anthropic</strong> for AI generation (only when you've
              added your own key). We don't run analytics, advertising, or tracking pixels. Your data isn't sold
              or shared with anyone else.
            </p>

            <h2>Your controls</h2>
            <ul>
              <li>Sign out from the extension to clear your local data.</li>
              <li>Email us to export everything we hold about you, or delete your account entirely.</li>
              <li>Remove or rotate your Anthropic key from Settings at any time.</li>
            </ul>

            <h2>Retention</h2>
            <p>
              We keep your data for as long as your account is active. If you delete your account, profile and
              application records are removed within 30 days. Backups roll over within 90 days.
            </p>

            <h2>Children</h2>
            <p>Emplorio isn't intended for anyone under 16.</p>

            <h2>Updates</h2>
            <p>
              If we make material changes to this policy, we'll update the date at the top and, where
              appropriate, notify you in the extension.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
