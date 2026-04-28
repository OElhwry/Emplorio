'use client';

import { useEffect, useRef, useState } from 'react';
import * as Accordion from '@radix-ui/react-accordion';

const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/emplorio/gjljbmhpdijnjpphnhfbcfobldbhclfc';

export default function HomePage() {
  useScrollReveal();
  return (
    <>
      <AmbientBackground />
      <Nav />
      <main>
        <Hero />
        <LogosMarquee />
        <WhatItDoes />
        <HowItWorks />
        <Stats />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}

type ShapeCfg = {
  leftPct: number; topPct: number;
  size: number; br: number | string;
  dx: number; dy: number; rot: number;
  dur: number; delay: number;
};

const SHAPES: ShapeCfg[] = [
  { leftPct: 6,  topPct: 10, size: 200, br: 26,    dx:  60, dy:  40, rot:  -8, dur: 52, delay:  -3 },
  { leftPct: 88, topPct: 22, size: 130, br: 38,    dx: -70, dy:  50, rot:  14, dur: 68, delay: -19 },
  { leftPct: 14, topPct: 78, size: 240, br: '50%', dx:  50, dy: -60, rot:   0, dur: 78, delay: -34 },
  { leftPct: 76, topPct: 64, size: 100, br: 22,    dx: -55, dy: -45, rot:  22, dur: 44, delay:  -8 },
  { leftPct: 92, topPct: 86, size: 160, br: 42,    dx:  45, dy: -70, rot: -16, dur: 60, delay: -27 },
  { leftPct: 46, topPct: 52, size: 80,  br: '50%', dx:  80, dy:  35, rot:   0, dur: 38, delay: -12 },
  { leftPct: 32, topPct: 30, size: 110, br: 32,    dx: -40, dy:  65, rot:  10, dur: 72, delay: -45 },
];

function AmbientBackground() {
  const farRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const nearRef = useRef<HTMLDivElement>(null);
  const shapeWrapRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 768px), (hover: none)').matches;
    if (reduce || isMobile) return; // mobile keeps CSS-driven autonomous motion only

    let raf = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    let scrollY = window.scrollY;
    let mx = -9999, my = -9999;

    const N = SHAPES.length;
    const offX = new Float32Array(N);
    const offY = new Float32Array(N);

    const onMove = (e: PointerEvent) => {
      mx = e.clientX; my = e.clientY;
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      tx = nx * 18;  // subtler than before — autonomous motion is primary
      ty = ny * 18;
    };
    const onLeave = () => { mx = -9999; my = -9999; };
    const onScroll = () => { scrollY = window.scrollY; };

    const tick = () => {
      cx += (tx - cx) * 0.05;
      cy += (ty - cy) * 0.05;
      const far = farRef.current, mid = midRef.current, near = nearRef.current;
      if (far)  far.style.transform  = `translate3d(${(cx * 0.25).toFixed(2)}px, ${(cy * 0.25 + scrollY * 0.025).toFixed(2)}px, 0)`;
      if (mid)  mid.style.transform  = `translate3d(${(cx * 0.6).toFixed(2)}px, ${(cy * 0.6 + scrollY * 0.05).toFixed(2)}px, 0)`;
      if (near) near.style.transform = `translate3d(${(cx * 1.1).toFixed(2)}px, ${(cy * 1.1 + scrollY * 0.09).toFixed(2)}px, 0)`;

      // per-shape proximity attraction (gentle, eased)
      const RADIUS = 280;
      for (let i = 0; i < N; i++) {
        const el = shapeWrapRefs.current[i];
        if (!el) continue;
        let targetX = 0, targetY = 0;
        if (mx > -9000) {
          const r = el.getBoundingClientRect();
          const sx = r.left + r.width / 2;
          const sy = r.top + r.height / 2;
          const dx = mx - sx, dy = my - sy;
          const dist = Math.hypot(dx, dy);
          if (dist < RADIUS && dist > 0.001) {
            const fall = 1 - dist / RADIUS;       // 0..1
            const k = fall * fall * 16;            // ease, max 16px
            targetX = (dx / dist) * k;
            targetY = (dy / dist) * k;
          }
        }
        const px = (offX[i] ?? 0) + (targetX - (offX[i] ?? 0)) * 0.08;
        const py = (offY[i] ?? 0) + (targetY - (offY[i] ?? 0)) * 0.08;
        offX[i] = px;
        offY[i] = py;
        el.style.transform = `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0)`;
      }

      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave, { passive: true });
    window.addEventListener('blur', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="ambient" aria-hidden="true">
      <div className="parallax parallax-far" ref={farRef}>
        <span className="dot dot-1" />
        <span className="dot dot-2" />
        <span className="dot dot-3" />
        <span className="dot dot-4" />
        <span className="dot dot-5" />
      </div>
      <div className="parallax parallax-mid" ref={midRef}>
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </div>
      <div className="parallax parallax-near" ref={nearRef}>
        {SHAPES.map((s, i) => (
          <span
            key={i}
            className="shape-wrap"
            ref={(el) => { shapeWrapRefs.current[i] = el; }}
            style={{
              left: `${s.leftPct}%`,
              top: `${s.topPct}%`,
              width: s.size,
              height: s.size,
            }}
          >
            <span
              className="shape"
              style={{
                borderRadius: typeof s.br === 'number' ? `${s.br}px` : s.br,
                animationDuration: `${s.dur}s`,
                animationDelay: `${s.delay}s`,
                ['--dx' as string]: `${s.dx}px`,
                ['--dy' as string]: `${s.dy}px`,
                ['--rot0' as string]: `${s.rot}deg`,
              }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal');
    if (!('IntersectionObserver' in window) || els.length === 0) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ---------- Nav ---------- */

const NAV_LINKS: { id: string; label: string }[] = [
  { id: 'features', label: 'Features' },
  { id: 'how',      label: 'How it works' },
  { id: 'pricing',  label: 'Pricing' },
  { id: 'faq',      label: 'FAQ' },
];

function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (sections.length === 0) return;
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visible.set(e.target.id, e.intersectionRatio);
          else visible.delete(e.target.id);
        });
        let bestId: string | null = null;
        let bestRatio = 0;
        visible.forEach((ratio, id) => {
          if (ratio > bestRatio) { bestRatio = ratio; bestId = id; }
        });
        setActive(bestId);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [ids]);
  return active;
}

function Nav() {
  const ids = NAV_LINKS.map((l) => l.id);
  const active = useActiveSection(ids);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    document.documentElement.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  return (
    <header className="nav">
      <div className="nav-inner">
        <a href="#" className="brand" aria-label="Emplorio home">
          <span className="brand-mark" aria-hidden="true">
            <img src="/emplorio-mark-light.png" alt="" className="brand-mark-img brand-mark-light" />
            <img src="/emplorio-mark-dark.png" alt="" className="brand-mark-img brand-mark-dark" />
          </span>
          Emplorio
        </a>
        <nav className="nav-links" aria-label="Primary">
          {NAV_LINKS.map((l) => {
            const isActive = active === l.id;
            return (
              <a
                key={l.id}
                href={`#${l.id}`}
                className={isActive ? 'is-active' : undefined}
                aria-current={isActive ? 'true' : undefined}
              >
                {l.label}
              </a>
            );
          })}
          <ThemeToggle />
          <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer" className="nav-cta">
            <IconChrome /> Install
          </a>
        </nav>
        <button
          type="button"
          className="nav-hamburger"
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          aria-controls="mobile-nav-drawer"
          onClick={() => setDrawerOpen(true)}
        >
          <IconMenu />
        </button>
      </div>
      <div
        className={`nav-drawer${drawerOpen ? ' open' : ''}`}
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <div className="nav-drawer-backdrop" onClick={() => setDrawerOpen(false)} />
        <div className="nav-drawer-panel">
          <div className="nav-drawer-head">
            <span className="nav-drawer-brand">Menu</span>
            <button
              type="button"
              className="nav-drawer-close"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
            >
              <IconX />
            </button>
          </div>
          <nav className="nav-drawer-links" aria-label="Mobile">
            {NAV_LINKS.map((l) => (
              <a
                key={l.id}
                href={`#${l.id}`}
                onClick={() => setDrawerOpen(false)}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="nav-drawer-foot">
            <ThemeToggle />
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="nav-cta"
              onClick={() => setDrawerOpen(false)}
            >
              <IconChrome /> Install
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */

type MockupTab = 'fill' | 'cover' | 'questions' | 'history';

function Hero() {
  const [tab, setTab] = useState<MockupTab>('fill');
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
            <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer" className="btn-primary">
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
              <IconCheck /> Works on the ATS systems you actually use
            </span>
            <span className="hero-meta-item">
              <IconCheck /> No card required
            </span>
            <span className="hero-meta-item">
              <IconCheck /> Your data stays private
            </span>
          </div>
        </div>
        <MockupPreview tab={tab} onTabChange={setTab} />
      </div>
    </section>
  );
}

const FLOAT_BY_TAB: Record<MockupTab, { left: { icon: 'bolt' | 'check' | 'sparkles' | 'chat' | 'mail' | 'chart'; text: string }; right: { icon: 'bolt' | 'check' | 'sparkles' | 'chat' | 'mail' | 'chart'; text: string } }> = {
  fill: {
    left: { icon: 'bolt', text: '14 fields filled' },
    right: { icon: 'check', text: 'Saved to History' },
  },
  cover: {
    left: { icon: 'sparkles', text: 'Drafted in 1.2s' },
    right: { icon: 'check', text: 'Tone: Friendly' },
  },
  questions: {
    left: { icon: 'chat', text: '3 questions detected' },
    right: { icon: 'sparkles', text: 'Drafted in your voice' },
  },
  history: {
    left: { icon: 'chart', text: '38 in last 30 days' },
    right: { icon: 'mail', text: '8 follow-ups queued' },
  },
};

function FloatIcon({ name }: { name: 'bolt' | 'check' | 'sparkles' | 'chat' | 'mail' | 'chart' }) {
  switch (name) {
    case 'bolt': return <IconBolt />;
    case 'check': return <IconCheck />;
    case 'sparkles': return <IconSparkles />;
    case 'chat': return <IconChat />;
    case 'mail': return <IconMail />;
    case 'chart': return <IconChart />;
  }
}

function MockupPreview({ tab, onTabChange }: { tab: MockupTab; onTabChange: (t: MockupTab) => void }) {
  const floats = FLOAT_BY_TAB[tab];
  return (
    <div className="hero-visual">
      <div className="float-card fc-1" key={`fc1-${tab}`} aria-hidden="true">
        <FloatIcon name={floats.left.icon} />
        {floats.left.text}
      </div>
      <div className="float-card fc-2" key={`fc2-${tab}`} aria-hidden="true">
        <FloatIcon name={floats.right.icon} />
        {floats.right.text}
      </div>
      <div className="mockup-stage">
      <div className="mockup">
        <div className="mockup-chrome" aria-hidden="true">
          <span /><span /><span />
        </div>
        <div className="mockup-header">
          <div className="mockup-brand">
            <span className="brand-mark mockup-brand-mark">
              <img src="/emplorio-mark-light.png" alt="" className="brand-mark-img brand-mark-light" />
              <img src="/emplorio-mark-dark.png" alt="" className="brand-mark-img brand-mark-dark" />
            </span>
            Emplorio
          </div>
          <div className="mockup-tabs" role="tablist" aria-label="Preview">
            {(['fill', 'cover', 'questions', 'history'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                className={`mockup-tab${tab === t ? ' active' : ''}`}
                onClick={() => onTabChange(t)}
              >
                {t === 'fill' ? 'Fill' : t === 'cover' ? 'Cover' : t === 'questions' ? 'Questions' : 'History'}
              </button>
            ))}
          </div>
        </div>
        <div className="mockup-body" key={tab}>
          {tab === 'fill' && <FillPanel />}
          {tab === 'cover' && <CoverPanel />}
          {tab === 'questions' && <QuestionsPanel />}
          {tab === 'history' && <HistoryPanel />}
        </div>
      </div>
      </div>
    </div>
  );
}

function FillPanel() {
  return (
    <>
      <div className="mockup-subtitle">Open a job page, then fill the form.</div>
      <div className="mockup-tip">
        <div className="mockup-tip-head">
          <IconLightbulb /> Profile 92% complete
        </div>
        <div className="mockup-tip-body">
          Add Work authorization in Profile to fill more fields and finish applications faster.
        </div>
      </div>
      <div className="mockup-btn">Fill this form</div>
      <div className="mockup-btn-ghost">
        <IconStarSm /> Save for later
      </div>
      <div className="mockup-shortcuts">
        <div className="mockup-shortcuts-title">Keyboard shortcuts</div>
        <div className="mockup-shortcut-row">
          <span className="mockup-keys">
            <kbd>Alt</kbd><kbd>Shift</kbd><kbd>E</kbd>
          </span>
          <span className="mockup-shortcut-label">Open Emplorio</span>
        </div>
        <div className="mockup-shortcut-row">
          <span className="mockup-keys">
            <kbd>Alt</kbd><kbd>Shift</kbd><kbd>F</kbd>
          </span>
          <span className="mockup-shortcut-label">Fill / pause / resume</span>
        </div>
        <div className="mockup-shortcut-row">
          <span className="mockup-keys">
            <kbd>Alt</kbd><kbd>Shift</kbd><kbd>S</kbd>
          </span>
          <span className="mockup-shortcut-label">Save current page</span>
        </div>
      </div>
    </>
  );
}

function CoverPanel() {
  return (
    <>
      <div className="mockup-meta-row">
        <span className="mockup-chip">Senior Engineer · Vercel</span>
        <span className="mockup-chip muted">Friendly</span>
      </div>
      <div className="mockup-letter">
        <p><strong>Dear Hiring Team,</strong></p>
        <p>I've been following Vercel since the early Next.js days and the focus on developer experience is exactly the energy I want to keep building around.</p>
        <p>At my last role I led the migration of a 200k-LOC app to the App Router and shipped a streaming SSR layer that cut <span className="mockup-hl">TTFB by 38%</span><span className="mockup-caret" aria-hidden="true" /></p>
      </div>
      <div className="mockup-btn">Insert into application</div>
    </>
  );
}

function QuestionsPanel() {
  return (
    <>
      <div className="mockup-q">
        <div className="mockup-q-label">Question 1 of 3</div>
        <div className="mockup-q-text">Why do you want to work at Vercel specifically?</div>
        <div className="mockup-q-answer">
          The infra team's work on edge runtimes lines up with what I built at my last role — and I'd rather ship to thousands of devs than ten internal teams.
        </div>
      </div>
      <div className="mockup-q-nav">
        <span className="mockup-chip">1</span>
        <span className="mockup-chip muted">2</span>
        <span className="mockup-chip muted">3</span>
      </div>
      <div className="mockup-btn">Use this answer</div>
    </>
  );
}

function HistoryPanel() {
  const insights: { num: string; label: string }[] = [
    { num: '12', label: 'This Week' },
    { num: '38', label: 'Past 30D' },
    { num: '21%', label: 'Response Rate' },
    { num: '8%', label: 'Offer Rate' },
    { num: '3d', label: 'Median Reply' },
    { num: 'Vercel', label: 'Top Company' },
  ];
  const counts: { label: string; n: number; tone: 'saved' | 'applied' | 'interview' | 'offer' | 'rejected' }[] = [
    { label: 'Saved', n: 4, tone: 'saved' },
    { label: 'Applied', n: 38, tone: 'applied' },
    { label: 'Interview', n: 6, tone: 'interview' },
    { label: 'Offer', n: 1, tone: 'offer' },
    { label: 'Rejected', n: 9, tone: 'rejected' },
  ];
  const filters = ['All', 'Saved', 'Applied', 'Interview', 'Offer', 'Rejected'];
  return (
    <>
      <div className="mockup-insights">
        <div className="mockup-insights-title">Insights</div>
        <div className="mockup-insights-grid">
          {insights.map((s) => (
            <div key={s.label} className="mockup-insights-cell">
              <div className="mockup-insights-num">{s.num}</div>
              <div className="mockup-insights-lbl">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mockup-counts">
        {counts.map((c) => (
          <div key={c.label} className="mockup-count-pill">
            <div className="mockup-count-num">{c.n}</div>
            <div className="mockup-count-lbl">
              <span className={`mockup-count-dot mockup-count-dot-${c.tone}`} />
              {c.label}
            </div>
          </div>
        ))}
      </div>
      <div className="mockup-action-row">
        <div className="mockup-btn-ghost">+ Add manually</div>
        <div className="mockup-btn-ghost">↓ Export CSV</div>
      </div>
      <div className="mockup-filters">
        {filters.map((f, i) => (
          <span key={f} className={`mockup-filter${i === 0 ? ' active' : ''}`}>{f}</span>
        ))}
      </div>
      <div className="mockup-app-card">
        <div className="mockup-app-head">
          <div>
            <div className="mockup-app-title">Senior Engineer · Vercel (Remote)</div>
            <div className="mockup-app-company">Vercel</div>
          </div>
          <div className="mockup-app-edit">
            <span>Edit</span>
            <span className="mockup-app-delete">Delete</span>
          </div>
        </div>
        <div className="mockup-app-meta">
          <span className="mockup-count-dot mockup-count-dot-applied" />
          Applied · Applied 2d ago
        </div>
        <div className="mockup-app-foot">
          <span className="mockup-app-open">↗ Open</span>
          <span className="mockup-app-select">applied <span className="mockup-app-caret">▾</span></span>
        </div>
      </div>
    </>
  );
}

/* ---------- What it does (bento) ---------- */

function WhatItDoes() {
  return (
    <section className="section reveal" id="features">
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
              Detects fields on every major ATS and fills them from your saved profile in under a second.
            </p>
            <p className="bento-shortcut-row">
              <kbd>Alt</kbd>{' '}
              <kbd>Shift</kbd>{' '}
              <kbd>F</kbd> to fill the current page.
            </p>
            <div className="bento-stat">
              <div className="big">&lt; 2s</div>
              <div className="lbl">Average autofill time</div>
            </div>
          </div>
          <div className="bento-card span-3">
            <span className="bento-tag">AI</span>
            <div className="bento-icon"><IconSparkles /></div>
            <h3>AI cover letters</h3>
            <p>
              Streams a tailored cover letter from the job description and your profile. Pick a tone
              — friendly, formal, enthusiastic, or concise.
            </p>
          </div>
          <div className="bento-card span-3">
            <span className="bento-tag">AI</span>
            <div className="bento-icon"><IconChat /></div>
            <h3>Question drafts</h3>
            <p>
              Detects open-ended application questions ("Why this company?") and drafts answers in
              your voice from your CV and the job context.
            </p>
          </div>
          <div className="bento-card span-2">
            <span className="bento-tag">AI</span>
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
    <section className="section section-tinted reveal" id="how">
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
    <section className="section reveal" id="pricing">
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
            <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer" className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              <IconChrome /> Add to Chrome
            </a>
          </div>
          <div className="tier featured">
            <div className="tier-badge">With AI</div>
            <div className="tier-name">With AI features</div>
            <div className="tier-price">
              £0<small> / forever</small>
            </div>
            <p className="tier-desc">
              Unlock AI features by adding your own Anthropic API key, typically around £0.01 per application. You pay Anthropic directly, we never see it.
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
    <section className="section section-tinted reveal" id="faq">
      <div className="container">
        <div className="section-eyebrow">FAQ</div>
        <h2 className="section-title">Questions, answered</h2>
        <p className="section-sub">Everything we get asked the most.</p>
        <Accordion.Root type="single" collapsible defaultValue="faq-0" className="faq-list">
          {items.map((item, i) => (
            <Accordion.Item key={item.q} value={`faq-${i}`} className="faq-item">
              <Accordion.Header>
                <Accordion.Trigger className="faq-trigger">
                  <span>{item.q}</span>
                  <IconChevron />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="faq-content">
                <p>{item.a}</p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}

/* ---------- Final CTA ---------- */

function FinalCTA() {
  return (
    <section className="section reveal">
      <div className="container">
        <div className="cta-final">
          <h2>Apply to your next ten roles before lunch.</h2>
          <p>
            Free to install. Set up in under two minutes. Cancel any time — there's nothing to
            cancel.
          </p>
          <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer" className="btn-primary">
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

/* ---------- Theme toggle ---------- */

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    const initial = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light';
    setTheme(initial);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('emplorio-theme', next); } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="theme-toggle"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <IconSun /> : <IconMoon />}
    </button>
  );
}

/* ---------- Logos marquee ---------- */

function LogosMarquee() {
  const sites: { name: string; abbr: string; bg: string }[] = [
    { name: 'Greenhouse', abbr: 'GH', bg: '#24a47f' },
    { name: 'Lever', abbr: 'L', bg: '#00b0b9' },
    { name: 'Workday', abbr: 'WD', bg: '#005cb9' },
    { name: 'Ashby', abbr: 'AB', bg: '#6c4de6' },
    { name: 'LinkedIn', abbr: 'in', bg: '#0a66c2' },
    { name: 'Indeed', abbr: 'I', bg: '#2164f3' },
    { name: 'Workable', abbr: 'WK', bg: '#1a1a2e' },
    { name: 'SmartRecruiters', abbr: 'SR', bg: '#0f4c81' },
    { name: 'iCIMS', abbr: 'iC', bg: '#00263e' },
  ];
  const row = [...sites, ...sites];
  return (
    <section className="logos" aria-label="Supported job sites">
      <div className="container">
        <p className="logos-label">
          Works on the ATS systems behind <strong>~80%</strong> of online job listings
        </p>
        <div className="logos-track-wrap">
          <div className="logos-track">
            {row.map((s, i) => (
              <span key={`${s.name}-${i}`} className="logo-chip">
                <span className="logo-chip-mark" style={{ background: s.bg }}>{s.abbr}</span>
                {s.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Stats ---------- */

function Stats() {
  const stats: { num: string; label: string; counter?: number }[] = [
    { num: '10×', label: 'Faster than typing manually' },
    { num: '9', label: 'Major ATS supported out of the box', counter: 9 },
    { num: '<2s', label: 'Average autofill time per page' },
    { num: '£0', label: 'Subscription. Forever.' },
  ];
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    const targets = grid.querySelectorAll<HTMLElement>('[data-counter]');
    let seen = false;
    try { seen = localStorage.getItem('emplorio-stats-seen') === '1'; } catch {}
    if (seen) {
      targets.forEach((el) => {
        el.textContent = String(Number(el.dataset.counter));
      });
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          const target = Number(el.dataset.counter);
          const start = performance.now();
          const dur = 1400;
          requestAnimationFrame(function tick(t) {
            const p = Math.min((t - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = String(Math.floor(eased * target));
            if (p < 1) requestAnimationFrame(tick);
            else el.textContent = String(target);
          });
          io.unobserve(el);
        });
        try { localStorage.setItem('emplorio-stats-seen', '1'); } catch {}
      },
      { threshold: 0.5 }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <section className="stats-section reveal" aria-label="At a glance">
      <div className="container">
        <div className="stats-grid" ref={ref}>
          {stats.map((s) => (
            <div className="stat-card" key={s.label}>
              <div className="stat-num">
                {s.counter !== undefined ? (
                  <span data-counter={s.counter}>0</span>
                ) : (
                  s.num
                )}
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Inline SVG icons (Lucide-style) ---------- */

function IconHummingbird() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M4 20.2c0-4 3.8-7.2 8.6-7.2 2.6 0 4.6 0.9 5.7 2.5l11-3-8.4 5.4c-1 3-3.7 4.9-7.5 4.9-5.5 0-9.4-1-9.4-2.6z"
        fill="currentColor"
      />
      <path
        d="M11 13.4c-0.4-4.6 3.5-7.6 7.7-5.5-0.6 4-3.9 6-7.7 5.5z"
        fill="currentColor"
        opacity="0.6"
      />
      <path d="M4 20.2l-3.2 1.9 4.6 0.4z" fill="currentColor" />
      <circle cx="20" cy="14.6" r="0.95" fill="#ffffff" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
function IconMoon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
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
function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}
function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}
function IconLightbulb() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" />
    </svg>
  );
}
function IconStarSm() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15 9 22 9.5 17 14 18.5 21 12 17.5 5.5 21 7 14 2 9.5 9 9 12 2" />
    </svg>
  );
}
