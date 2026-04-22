const CHROME_STORE_URL = '#'; // TODO: replace with Chrome Web Store URL after publish

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <WhatItDoes />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}

/* ---------- Nav ---------- */

function Nav() {
  return (
    <header className="nav">
      <div className="nav-inner">
        <a href="#" className="brand" aria-label="Emplorio home">
          <span className="brand-mark" aria-hidden="true">E</span>
          Emplorio
        </a>
        <nav className="nav-links" aria-label="Primary">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
          <a href={CHROME_STORE_URL} className="nav-cta">
            <IconChrome /> Install
          </a>
        </nav>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */

function Hero() {
  return (
    <section className="hero">
      <div className="container hero-inner">
        <div>
          <span className="eyebrow">
            <span className="eyebrow-pill">New</span>
            Apply once. Send everywhere.
          </span>
          <h1>
            Stop retyping your CV into <span className="accent">every job form.</span>
          </h1>
          <p className="hero-sub">
            Emplorio is a Chrome extension that auto-fills job applications, drafts tailored cover
            letters, and tracks every application — so you can apply to ten roles in the time it
            took to apply to one.
          </p>
          <div className="hero-ctas">
            <a href={CHROME_STORE_URL} className="btn-primary">
              <IconChrome />
              Add to Chrome — it's free
            </a>
            <a href="#how" className="btn-secondary">
              See how it works
              <IconArrowRight />
            </a>
          </div>
          <div className="hero-meta" aria-label="Highlights">
            <span className="hero-meta-item">
              <IconCheck /> Works on Greenhouse, Lever, Workday, Ashby
            </span>
            <span className="hero-meta-item">
              <IconCheck /> No card required
            </span>
            <span className="hero-meta-item">
              <IconCheck /> Your data stays private
            </span>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="float-card fc-1">
            <IconBolt />
            14 fields filled
          </div>
          <div className="float-card fc-2">
            <IconCheck />
            Saved to History
          </div>
          <div className="mockup">
            <div className="mockup-chrome">
              <span /><span /><span />
            </div>
            <div className="mockup-header">
              <div className="mockup-brand">
                <span className="brand-mark">E</span>
                Emplorio
              </div>
              <div className="mockup-tabs">
                <div className="mockup-tab active">Fill</div>
                <div className="mockup-tab">Cover</div>
                <div className="mockup-tab">Questions</div>
                <div className="mockup-tab">History</div>
              </div>
            </div>
            <div className="mockup-body">
              <div className="mockup-banner">
                <IconCheck /> Already applied · 3d ago
              </div>
              <div className="mockup-btn">Fill this form</div>
              <div className="mockup-stat">
                <div>
                  <strong>12</strong>
                  <span>This Week</span>
                </div>
                <div>
                  <strong>38</strong>
                  <span>Past 30D</span>
                </div>
                <div>
                  <strong>21%</strong>
                  <span>Reply Rate</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- What it does (bento) ---------- */

function WhatItDoes() {
  return (
    <section className="section" id="features">
      <div className="container">
        <div className="section-eyebrow">What it does</div>
        <h2 className="section-title">Everything you need to apply faster</h2>
        <p className="section-sub">
          One install replaces twelve copy-pastes per application. Built for the ATS systems you
          already hate filling in.
        </p>
        <div className="bento">
          <div className="bento-card span-3 row-2 featured">
            <div className="bento-icon"><IconForm /></div>
            <h3>One-click autofill</h3>
            <p>
              Detects fields on Greenhouse, Lever, Workday, Ashby, iCIMS, Workable, SmartRecruiters,
              Indeed, and LinkedIn — and fills them from your saved profile in under a second.
            </p>
            <p style={{ marginTop: 4, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              <kbd style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11, fontFamily: 'inherit' }}>Alt</kbd>{' '}
              <kbd style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11, fontFamily: 'inherit' }}>Shift</kbd>{' '}
              <kbd style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11, fontFamily: 'inherit' }}>F</kbd> to fill the current page.
            </p>
          </div>
          <div className="bento-card span-3">
            <div className="bento-icon"><IconSparkles /></div>
            <h3>AI cover letters</h3>
            <p>
              Streams a tailored cover letter from the job description and your profile. Pick a tone
              — friendly, formal, enthusiastic, or concise.
            </p>
          </div>
          <div className="bento-card span-3">
            <div className="bento-icon"><IconChat /></div>
            <h3>Question drafts</h3>
            <p>
              Detects open-ended application questions ("Why this company?") and drafts answers in
              your voice from your CV and the job context.
            </p>
          </div>
          <div className="bento-card span-2">
            <div className="bento-icon"><IconMail /></div>
            <h3>Follow-up emails</h3>
            <p>Drafted automatically a week after you apply.</p>
          </div>
          <div className="bento-card span-2">
            <div className="bento-icon"><IconChart /></div>
            <h3>Application history</h3>
            <p>See response rate, median reply time, top company.</p>
          </div>
          <div className="bento-card span-2">
            <div className="bento-icon"><IconCloud /></div>
            <h3>Sync across devices</h3>
            <p>Sign in once, your profile and history follow.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */

function HowItWorks() {
  return (
    <section className="section" id="how" style={{ background: 'var(--bg-soft)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div className="container">
        <div className="section-eyebrow">How it works</div>
        <h2 className="section-title">Three steps. Two minutes.</h2>
        <p className="section-sub">
          Set up once. Every job application after that takes seconds.
        </p>
        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <h3>Install &amp; sign in</h3>
            <p>
              Add Emplorio to Chrome, sign in with a 6-digit code sent to your email. No password
              to remember.
            </p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h3>Upload your CV</h3>
            <p>
              We extract your work history, education, and skills automatically. Add or edit
              anything that's missing.
            </p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h3>Apply at speed</h3>
            <p>
              Open any job page, hit Fill, and Emplorio handles the form. Generate a cover letter,
              draft the open questions, submit.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Pricing / BYO key ---------- */

function Pricing() {
  return (
    <section className="section" id="pricing">
      <div className="container">
        <div className="section-eyebrow">Pricing</div>
        <h2 className="section-title">Free forever. AI features use your own key.</h2>
        <p className="section-sub">
          We don't take a cut on AI usage. Bring your own Anthropic key for cover letters, question
          drafts, follow-ups, and CV extraction — typically pennies per application.
        </p>
        <div className="tiers">
          <div className="tier">
            <div className="tier-name">Free</div>
            <div className="tier-price">
              £0<small> / forever</small>
            </div>
            <p className="tier-desc">Everything you need to apply faster — without an API key.</p>
            <ul className="tier-list">
              <li><IconCheck /> Auto-fill application forms</li>
              <li><IconCheck /> Save jobs from any page</li>
              <li><IconCheck /> Track every application</li>
              <li><IconCheck /> Insights &amp; CSV export</li>
              <li><IconCheck /> Sync across devices</li>
            </ul>
            <a href={CHROME_STORE_URL} className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              <IconChrome /> Add to Chrome
            </a>
          </div>
          <div className="tier featured">
            <div className="tier-badge">With AI</div>
            <div className="tier-name">Free + your key</div>
            <div className="tier-price">
              ~£0.01<small> per application</small>
            </div>
            <p className="tier-desc">
              Unlock AI features by adding your own Anthropic API key. You pay Anthropic directly,
              we never see it.
            </p>
            <ul className="tier-list">
              <li><IconCheck /> Everything in Free</li>
              <li><IconCheck /> AI cover letter generator</li>
              <li><IconCheck /> Open-ended question drafts</li>
              <li><IconCheck /> Follow-up email drafts</li>
              <li><IconCheck /> Auto-extract details from CV</li>
            </ul>
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Get an Anthropic key
              <IconArrowRight />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */

function FAQ() {
  const items: { q: string; a: string }[] = [
    {
      q: 'Where does my data live?',
      a: "Your profile and application history live in your browser (chrome.storage) and — once you sign in — sync to our database so you can use Emplorio on more than one machine. We never read your data or share it with anyone. You can delete everything from Settings.",
    },
    {
      q: 'Why bring your own AI key?',
      a: "AI cover letters and question drafts cost real money to generate. Instead of charging a subscription that cross-subsidises power users, we let you bring your own Anthropic key — most people spend pennies per application and have full control over usage. Free Anthropic credits cover plenty of applications to start.",
    },
    {
      q: 'Which job sites does it work on?',
      a: "Greenhouse, Lever, Workday, Ashby, iCIMS, Workable, SmartRecruiters, Indeed, and LinkedIn — the systems behind ~80% of online job listings. Plus a generic heuristic that handles many smaller ATS forms.",
    },
    {
      q: 'Is my Anthropic API key safe?',
      a: "It's stored locally in chrome.storage on your device and only sent to our API on AI requests, where it's used once and discarded. We never log or persist it. You can remove or rotate it at any time from Settings.",
    },
    {
      q: 'Do I need to pay to use the autofill?',
      a: "No. Autofill, application tracking, and cross-device sync are completely free with no key required. You only need an Anthropic key if you want the AI writing features.",
    },
    {
      q: 'Will my data be used to train AI?',
      a: "No. We use Anthropic's API directly with your key, and Anthropic does not train on API data by default. Your CV and applications stay yours.",
    },
  ];
  return (
    <section className="section" id="faq" style={{ background: 'var(--bg-soft)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div className="container">
        <div className="section-eyebrow">FAQ</div>
        <h2 className="section-title">Questions, answered</h2>
        <p className="section-sub">Everything we get asked the most.</p>
        <div className="faq-list">
          {items.map((item) => (
            <details key={item.q} className="faq-item">
              <summary>
                {item.q}
                <IconChevron />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Final CTA ---------- */

function FinalCTA() {
  return (
    <section className="section">
      <div className="container">
        <div className="cta-final">
          <h2>Apply to your next ten roles before lunch.</h2>
          <p>
            Free to install. Set up in under two minutes. Cancel any time — there's nothing to
            cancel.
          </p>
          <a href={CHROME_STORE_URL} className="btn-primary">
            <IconChrome />
            Add Emplorio to Chrome
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <small>© {new Date().getFullYear()} Emplorio. All rights reserved.</small>
        <nav className="footer-links" aria-label="Footer">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="mailto:emplorioEXT@gmail.com">Contact</a>
        </nav>
      </div>
    </footer>
  );
}

/* ---------- Inline SVG icons (Lucide-style) ---------- */

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
function IconArrowRight() {
  return (
    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconBolt() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function IconForm() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="7" y1="9" x2="14" y2="9" />
      <line x1="7" y1="13" x2="11" y2="13" />
      <line x1="7" y1="17" x2="13" y2="17" />
    </svg>
  );
}
function IconSparkles() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z" />
      <path d="M19 14l.9 2.2L22 17l-2.1.8L19 20l-.9-2.2L16 17l2.1-.8L19 14z" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <polyline points="3 7 12 13 21 7" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="20" x2="21" y2="20" />
      <rect x="6" y="11" width="3" height="9" rx="0.5" />
      <rect x="11" y="6" width="3" height="14" rx="0.5" />
      <rect x="16" y="14" width="3" height="6" rx="0.5" />
    </svg>
  );
}
function IconCloud() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.5 19a4.5 4.5 0 0 0 0-9h-1.2A6 6 0 1 0 6 14.7" />
      <path d="M17.5 19H8a4 4 0 0 1 0-8" />
    </svg>
  );
}
function IconChevron() {
  return (
    <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
