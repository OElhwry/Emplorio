import type { Metadata } from 'next';
import { LegalNav, SiteFooter } from './_components/SiteChrome';

export const metadata: Metadata = {
  title: 'Page not found — Emplorio',
  description: "That page doesn't exist (yet). Head home or grab the Chrome extension.",
};

export default function NotFound() {
  return (
    <>
      <LegalNav />
      <main className="not-found">
        <div className="nf-bg" aria-hidden="true">
          <span className="nf-orb nf-orb-1" />
          <span className="nf-orb nf-orb-2" />
          <span className="nf-shape nf-shape-1" />
          <span className="nf-shape nf-shape-2" />
          <span className="nf-shape nf-shape-3" />
        </div>
        <section className="section">
          <div className="container nf-inner">
            <p className="section-eyebrow">Error 404</p>
            <h1 className="nf-title">
              This page <span className="nf-title-grad">ghosted you</span>.
            </h1>
            <p className="nf-sub">
              Like a recruiter after a final-round interview. The link you followed is broken, moved,
              or never existed — but you're one click from somewhere useful.
            </p>
            <div className="nf-ctas">
              <a href="/" className="btn-primary">
                <IconArrow /> Back to home
              </a>
              <a href="/" className="btn-secondary">
                <IconChrome /> Add to Chrome
              </a>
            </div>
            <div className="nf-meta">
              <a href="/#features">Features</a>
              <span aria-hidden="true">·</span>
              <a href="/#how">How it works</a>
              <span aria-hidden="true">·</span>
              <a href="/#faq">FAQ</a>
              <span aria-hidden="true">·</span>
              <a href="mailto:emplorioEXT@gmail.com">Contact</a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function IconArrow() {
  return (
    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function IconChrome() {
  return (
    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <line x1="21.17" y1="8" x2="12" y2="8" />
      <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
      <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
    </svg>
  );
}
