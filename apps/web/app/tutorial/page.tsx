'use client';

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Profile } from '@emplorio/shared';
import { useAuth } from '../lib/useAuth';
import { fetchProfile, saveProfile } from '../lib/api';
import { AmbientShapes } from '../_components/AmbientShapes';
import { PageLoader } from '../_components/PageLoader';
import { SpiralLoader } from '../_components/SpiralLoader';
import styles from './tutorial.module.css';

/* ---------- The guided tour script ---------- */

type Gate = 'next' | 'fill' | 'cover' | 'questions' | 'finish';
type Target = 'panel' | 'fill' | 'form' | 'cover' | 'questions' | null;

interface TourStep {
  id: string;
  target: Target;
  gate: Gate;
  title: string;
  body: string;
  hint?: string;
  shortcuts?: boolean;
}

const TOUR: TourStep[] = [
  {
    id: 'intro',
    target: null,
    gate: 'next',
    title: 'This is a practice application',
    body: "It is not a real job. Use it to learn how Emplorio fills applications for you, the same way it works on Greenhouse, Lever, Workday and thousands of other sites.",
  },
  {
    id: 'panel',
    target: 'panel',
    gate: 'next',
    title: 'Meet your Emplorio panel',
    body: 'On any job page the panel appears on its own, no clicking around. It reads the form, counts the fields it can fill, and waits for you.',
  },
  {
    id: 'fill',
    target: 'fill',
    gate: 'fill',
    title: 'Fill the whole form in one click',
    body: 'Hit Fill and Emplorio completes every field it recognises from your profile. Nothing is submitted, you stay in control.',
    hint: 'Click Fill on the panel to try it.',
  },
  {
    id: 'review',
    target: 'form',
    gate: 'next',
    title: 'Everything filled, ready to review',
    body: 'Each field is pulled straight from your profile and turns green as it lands. Skim it, tweak anything you like, and you are done.',
  },
  {
    id: 'cover',
    target: 'cover',
    gate: 'cover',
    title: 'Draft a tailored cover letter',
    body: 'One click writes a cover letter grounded in your real CV and this job. It rewrites and emphasises, it never invents.',
    hint: 'Click Cover letter on the panel.',
  },
  {
    id: 'questions',
    target: 'questions',
    gate: 'questions',
    title: 'Answer the tricky questions',
    body: 'Screening prompts like "why are you a good fit?" get a first draft in your voice. Edit, then paste it back.',
    hint: 'Click Answer questions on the panel.',
  },
  {
    id: 'shortcuts',
    target: null,
    gate: 'next',
    title: 'Keyboard shortcuts',
    body: 'Skip the mouse entirely. These work on every application page once the extension is installed. Alt+Shift+S logs the job to your tracker.',
    shortcuts: true,
  },
  {
    id: 'done',
    target: null,
    gate: 'finish',
    title: "You're ready to apply",
    body: 'That is the whole loop: open a job, click Fill, add AI where you want it, and track it. Do it for real next.',
  },
];

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'Alt + Shift + E', label: 'Open the Emplorio panel' },
  { keys: 'Alt + Shift + F', label: 'Fill the current form' },
  { keys: 'Alt + Shift + S', label: 'Save this job to your tracker' },
];

/* ---------- Demo form model ---------- */

type FieldId = 'first' | 'last' | 'email' | 'phone' | 'linkedin' | 'why' | 'cover';

interface FieldDef {
  id: FieldId;
  label: string;
  required: boolean;
  multiline?: boolean;
  placeholder?: string;
}

const FIELDS: FieldDef[] = [
  { id: 'first', label: 'First name', required: true },
  { id: 'last', label: 'Last name', required: true },
  { id: 'email', label: 'Email', required: true },
  { id: 'phone', label: 'Phone', required: false },
  { id: 'linkedin', label: 'LinkedIn profile', required: false },
  {
    id: 'why',
    label: 'Why are you a great fit for this role?',
    required: false,
    multiline: true,
    placeholder: 'A few sentences…',
  },
  {
    id: 'cover',
    label: 'Cover letter',
    required: false,
    multiline: true,
    placeholder: 'Paste your cover letter here, or generate one from the panel…',
  },
];

/** Fields the Fill button completes from the profile, in scroll order. */
const FILL_ORDER: FieldId[] = ['first', 'last', 'email', 'phone', 'linkedin'];

function fillValuesFrom(p: Partial<Profile> | null): Record<FieldId, string> {
  const phone =
    p?.phone ? `${p.phoneCountryCode ? `${p.phoneCountryCode} ` : ''}${p.phone}` : '+1 (415) 555 0142';
  return {
    first: p?.firstName || 'Alex',
    last: p?.lastName || 'Morgan',
    email: p?.email || 'alex.morgan@email.com',
    phone,
    // Pulled straight from the profile, just like the real extension does.
    linkedin: p?.linkedinUrl || p?.websites?.[0] || 'linkedin.com/in/alexmorgan',
    why: '',
    cover: '',
  };
}

function coverLetterFrom(p: Partial<Profile> | null): string {
  const name = [p?.firstName, p?.lastName].filter(Boolean).join(' ') || 'Alex Morgan';
  const title = p?.currentTitle?.trim();
  const company = p?.currentCompany?.trim();
  const opener = title
    ? `My background as ${title}${company ? ` at ${company}` : ''} lines up closely with what this role needs`
    : 'My background lines up closely with what this role needs';
  return `Dear Hiring Team,

I'm excited to apply for this role. ${opener}, and I'd love to bring that to your team.

This draft is grounded in your real CV, so it reads like you, only sharper. Edit anything, then paste it straight back into the form.

Best,
${name}`;
}

function answerFrom(p: Partial<Profile> | null): string {
  const title = p?.currentTitle?.trim();
  const lead = title ? `As ${title}, I` : 'I';
  return `${lead} ship work that matters, pick things up fast, and sweat the details. My experience maps directly to this role, and I'd bring that same momentum to your team from day one.`;
}

/* ---------- Page ---------- */

export default function TutorialPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Tutorial />
    </Suspense>
  );
}

/* ---------- Intro modal (two welcome slides before the tour) ---------- */

function IntroModal({
  index,
  firstName,
  onBack,
  onNext,
  onSkip,
}: {
  index: number;
  firstName?: string;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const slides = [
    {
      eyebrow: `Welcome to Emplorio${firstName ? `, ${firstName}` : ''}!`,
      title: 'Pin Emplorio for one click access',
      body: 'Pin the extension to your toolbar and you will know the moment you land on a job site Emplorio supports, ready to fill in a click.',
      art: <PinArt />,
      cta: 'Got it!',
    },
    {
      eyebrow: 'How does it work?',
      title: 'Emplorio fills your applications automatically',
      body: 'We will show you how, by filling out this practice application for you. Nothing here is real and nothing gets submitted, so click around freely.',
      art: <FillArt />,
      cta: 'Start tutorial →',
    },
  ];
  const slide = slides[index] ?? slides[0]!;

  return (
    <div className={styles.introBackdrop} role="dialog" aria-modal="true" aria-label="Welcome to Emplorio">
      <div className={styles.introModal}>
        <button type="button" className={styles.introClose} onClick={onSkip} aria-label="Skip intro">
          ✕
        </button>
        <div className={styles.introRow}>
          <div className={styles.introText}>
            <p className={styles.introEyebrow}>{slide.eyebrow}</p>
            <h2 className={styles.introTitle}>{slide.title}</h2>
            <p className={styles.introBody}>{slide.body}</p>
          </div>
          <div className={styles.introArt} aria-hidden="true">
            {slide.art}
          </div>
        </div>
        <div className={styles.introNav}>
          <div className={styles.introNavSide}>
            {index > 0 && (
              <button type="button" className={styles.introBack} onClick={onBack}>
                Back
              </button>
            )}
          </div>
          <div className={styles.introDots}>
            {slides.map((_, i) => (
              <span key={i} className={i === index ? styles.introDotOn : styles.introDot} />
            ))}
          </div>
          <div className={styles.introNavSide}>
            <button type="button" className={styles.introNext} onClick={onNext}>
              {slide.cta}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mock browser toolbar showing the pinned Emplorio extension. */
function PinArt() {
  return (
    <div className={styles.pinArt}>
      <div className={styles.pinBar}>
        <span className={styles.pinTraffic}>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.pinUrl}>greenhouse.io/jobs · supported ✓</span>
        <span className={styles.pinPuzzle} aria-hidden="true">
          🧩
        </span>
      </div>
      <div className={styles.pinPop}>
        <div className={`${styles.pinPopRow} ${styles.pinPopOn}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/emplorio-mark-dark.png" alt="" className={styles.pinMark} />
          <span>Emplorio</span>
          <span className={styles.pinTack}>📌</span>
        </div>
        <div className={styles.pinPopRow}>
          <span className={styles.pinGhost} />
          <span className={styles.pinGhostLabel} />
        </div>
        <div className={styles.pinPopRow}>
          <span className={styles.pinGhost} />
          <span className={styles.pinGhostLabel} />
        </div>
      </div>
    </div>
  );
}

/** Mock application form animating from empty to filled. */
function FillArt() {
  return (
    <div className={styles.fillArt}>
      {[0, 1, 2, 3].map((i) => (
        <div className={styles.fillArtRow} key={i} style={{ animationDelay: `${0.2 + i * 0.25}s` }}>
          <span className={styles.fillArtLabel} />
          <span className={styles.fillArtValue}>
            <span className={styles.fillArtTick}>✓</span>
          </span>
        </div>
      ))}
      <div className={styles.fillArtBtn}>Filled in one click</div>
    </div>
  );
}

function Tutorial() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';
  const { status } = useAuth();

  const [profile, setProfile] = useState<Partial<Profile> | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [vals, setVals] = useState<Record<FieldId, string>>({
    first: '',
    last: '',
    email: '',
    phone: '',
    linkedin: '',
    why: '',
    cover: '',
  });
  const [filledSet, setFilledSet] = useState<Set<FieldId>>(new Set());
  const [filled, setFilled] = useState(false);
  const [fillBusy, setFillBusy] = useState(false);
  const [activeField, setActiveField] = useState<FieldId | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverText, setCoverText] = useState('');
  const [coverDone, setCoverDone] = useState(false);
  const [coverPasted, setCoverPasted] = useState(false);
  const [qBusy, setQBusy] = useState(false);
  const [qDone, setQDone] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [copied, setCopied] = useState(false);
  const [intro, setIntro] = useState<number | null>(0); // null once the intro is dismissed
  const [mounted, setMounted] = useState(false);
  const fieldRefs = useRef<Partial<Record<FieldId, HTMLElement | null>>>({});

  // Spotlight targets
  const panelRef = useRef<HTMLDivElement>(null);
  const fillBtnRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLElement>(null);
  const coverBtnRef = useRef<HTMLButtonElement>(null);
  const questionsBtnRef = useRef<HTMLButtonElement>(null);
  const coachRef = useRef<HTMLDivElement>(null);

  type Spot = { top: number; left: number; width: number; height: number; panelSide: boolean };
  const [spot, setSpot] = useState<Spot | null>(null);
  const [coachH, setCoachH] = useState(220);
  const SPOT_PAD = 8;

  const step = TOUR[stepIdx]!;
  const firstName = profile?.firstName?.trim();

  useEffect(() => {
    document.title = 'Emplorio · How it works';
  }, []);
  useEffect(() => {
    if (status === 'anon') {
      // Carry the destination so sign-in returns here (e.g. extension handoff).
      const dest = `/tutorial${next ? `?next=${encodeURIComponent(next)}` : ''}`;
      router.replace(`/login?next=${encodeURIComponent(dest)}`);
    }
  }, [status, router, next]);
  useEffect(() => {
    if (status !== 'authed') return;
    void fetchProfile().then((p) => setProfile(p));
  }, [status]);

  useEffect(() => setMounted(true), []);

  function stepTargetEl(): HTMLElement | null {
    switch (step.target) {
      case 'panel':
        return panelRef.current;
      case 'fill':
        return fillBtnRef.current;
      case 'form':
        return formRef.current;
      case 'cover':
        return coverBtnRef.current;
      case 'questions':
        return questionsBtnRef.current;
      default:
        return null;
    }
  }

  // While an action runs we follow the field being touched; otherwise the step's target.
  function spotlightEl(): HTMLElement | null {
    if (activeField) return fieldRefs.current[activeField] ?? null;
    return stepTargetEl();
  }

  // Keep the spotlight rect in sync with the target (step changes, scroll, resize, fills).
  useEffect(() => {
    if (intro !== null) {
      setSpot(null);
      return;
    }
    function update() {
      const el = spotlightEl();
      if (!el) {
        setSpot(null);
        return;
      }
      const r = el.getBoundingClientRect();
      const panelSide = !!panelRef.current && panelRef.current.contains(el);
      setSpot({ top: r.top, left: r.left, width: r.width, height: r.height, panelSide });
    }
    update();
    const id = window.setInterval(update, 120);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intro, stepIdx, step.target, activeField, filled, coverText, qDone, minimised]);

  // Bring the step's target into view when the step changes.
  useEffect(() => {
    if (intro !== null) return;
    const el = stepTargetEl();
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, intro]);

  useLayoutEffect(() => {
    if (coachRef.current) setCoachH(coachRef.current.offsetHeight);
  }, [stepIdx, spot, intro]);

  function coachStyle(): React.CSSProperties {
    if (!spot || typeof window === 'undefined') return {};
    const W = 360;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (spot.panelSide) {
      let left = spot.left - W - 20;
      if (left < 16) {
        // No room to the left, drop it under the target instead.
        left = Math.min(Math.max(spot.left + spot.width / 2 - W / 2, 16), vw - W - 16);
        return { left, top: Math.min(spot.top + spot.height + 16, vh - coachH - 16) };
      }
      return {
        left,
        top: Math.min(Math.max(spot.top + spot.height / 2 - coachH / 2, 16), vh - coachH - 16),
      };
    }
    // Wide / left-column targets: float a card near the bottom centre.
    const left = Math.min(Math.max(vw / 2 - W / 2, 16), vw - W - 16);
    return { left, top: vh - coachH - 24 };
  }

  const fillTarget = useMemo(() => fillValuesFrom(profile), [profile]);
  const fillableCount = useMemo(
    () => FILL_ORDER.filter((id) => fillTarget[id].trim()).length,
    [fillTarget],
  );

  function advanceIf(gate: Gate) {
    setStepIdx((i) => (TOUR[i]?.gate === gate ? Math.min(TOUR.length - 1, i + 1) : i));
  }

  function scrollToField(id: FieldId) {
    fieldRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function doFill() {
    if (fillBusy || filled) return;
    setFillBusy(true);
    setMinimised(false);
    const filledNow = new Set<FieldId>();
    for (const id of FILL_ORDER) {
      const v = fillTarget[id];
      if (!v.trim()) continue;
      // Walk to the field, pause so you can see it, then drop the value in.
      setActiveField(id);
      scrollToField(id);
      await new Promise((r) => setTimeout(r, 620));
      setVals((prev) => ({ ...prev, [id]: v }));
      filledNow.add(id);
      setFilledSet(new Set(filledNow));
      await new Promise((r) => setTimeout(r, 240));
    }
    setActiveField(null);
    setFillBusy(false);
    setFilled(true);
    advanceIf('fill');
  }

  async function doCover() {
    if (coverBusy) return;
    setMinimised(false);
    setCoverBusy(true);
    await new Promise((r) => setTimeout(r, 1100));
    setCoverText(coverLetterFrom(profile));
    setCoverBusy(false);
    setCoverDone(true);
    advanceIf('cover');
  }

  function pasteCover() {
    setVals((prev) => ({ ...prev, cover: coverText }));
    setFilledSet((prev) => new Set(prev).add('cover'));
    setCoverPasted(true);
    setActiveField('cover');
    scrollToField('cover');
    setTimeout(() => setActiveField(null), 900);
  }

  async function doQuestions() {
    if (qBusy) return;
    setMinimised(false);
    setQBusy(true);
    await new Promise((r) => setTimeout(r, 1100));
    const answer = answerFrom(profile);
    // type it into the textarea so the connection to the form is obvious
    setActiveField('why');
    scrollToField('why');
    setVals((prev) => ({ ...prev, why: answer }));
    setFilledSet((prev) => new Set(prev).add('why'));
    setQBusy(false);
    setQDone(true);
    setTimeout(() => setActiveField(null), 900);
    advanceIf('questions');
  }

  function copyCover() {
    void navigator.clipboard?.writeText(coverText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const canNext =
    step.gate === 'fill'
      ? filled
      : step.gate === 'cover'
        ? coverDone
        : step.gate === 'questions'
          ? qDone
          : true;

  async function finishTour() {
    try {
      const current = (await fetchProfile().catch(() => null)) ?? {};
      await saveProfile({
        ...current,
        tutorialCompletedAt: new Date().toISOString(),
      } as Parameters<typeof saveProfile>[0]).catch(() => {});
    } finally {
      router.push(next);
    }
  }

  function goNext() {
    if (step.gate === 'finish') {
      void finishTour();
      return;
    }
    if (!canNext) return;
    setStepIdx((i) => Math.min(TOUR.length - 1, i + 1));
  }
  function goBack() {
    setStepIdx((i) => Math.max(0, i - 1));
  }
  function skip() {
    setStepIdx(TOUR.length - 1);
  }

  if (status !== 'authed') {
    return <PageLoader />;
  }

  const fillFilledCount = FILL_ORDER.filter((id) => filledSet.has(id)).length;
  const activeLabel = activeField ? FIELDS.find((f) => f.id === activeField)?.label : null;
  // On the final step we drop the dim/blur entirely so the whole filled page is visible.
  const isFinish = step.gate === 'finish';

  // A panel action is only clickable once its own step is reached, so the user
  // can't fire Fill / Cover / Questions out of order and desync the tour.
  const canFill = stepIdx >= TOUR.findIndex((s) => s.id === 'fill');
  const canCover = stepIdx >= TOUR.findIndex((s) => s.id === 'cover');
  const canQuestions = stepIdx >= TOUR.findIndex((s) => s.id === 'questions');

  return (
    <div className={styles.page}>
      <AmbientShapes />
      {intro !== null && (
        <IntroModal
          index={intro}
          firstName={firstName}
          onBack={() => setIntro((i) => Math.max(0, (i ?? 0) - 1))}
          onNext={() => setIntro((i) => ((i ?? 0) === 0 ? 1 : null))}
          onSkip={() => router.push(next)}
        />
      )}

      {/* Top bar */}
      <header className={styles.topbar}>
        <a href="/" className={styles.brand} aria-label="Emplorio home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/emplorio-mark-light.png" alt="" className={`${styles.mark} ${styles.markLight}`} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/emplorio-mark-dark.png" alt="" className={`${styles.mark} ${styles.markDark}`} />
          Emplorio
        </a>
        <span className={styles.demoTag}>Interactive demo</span>
        <button type="button" className={styles.skip} onClick={() => router.push(next)}>
          Skip tutorial →
        </button>
      </header>

      <div className={styles.body}>
        {/* ---------- Demo job + application ---------- */}
        <main className={styles.jobCol}>
          <article className={styles.job}>
            <div className={styles.jobTags}>
              <span className={styles.jobTag}>Demo</span>
              <span className={styles.jobTagSoft}>Full time</span>
            </div>
            <h1 className={styles.jobTitle}>Not a real job, your Emplorio practice run</h1>
            <div className={styles.jobMeta}>
              <span>📍 San Francisco, CA · Remote</span>
              <span>· Emplorio</span>
            </div>

            <div className={styles.jobBody}>
              <p>
                This is a demo application that shows you how Emplorio works. Emplorio autofills job
                applications everywhere on the web, drafts cover letters from your real CV, and tracks
                every role you apply to, so you spend minutes where you used to spend hours.
              </p>
              <h2>What we look for</h2>
              <ul>
                <li>People who would rather apply to ten great roles than retype the same form ten times</li>
                <li>A real CV worth showing off, Emplorio handles the rest</li>
                <li>Bonus points for wanting your evenings back</li>
              </ul>
            </div>

            <div className={styles.divider} role="separator" />

            {/* Application form */}
            <section ref={formRef} className={styles.form} aria-label="Demo application form">
              <div className={styles.formHead}>
                <h2 className={styles.formTitle}>Apply for this job</h2>
                <span className={styles.req}>* indicates a required field</span>
              </div>

              {FIELDS.map((f) => {
                const value = vals[f.id];
                const wasFilled = filledSet.has(f.id);
                const isActive = activeField === f.id;
                return (
                  <label
                    key={f.id}
                    className={styles.field}
                    ref={(el) => {
                      fieldRefs.current[f.id] = el;
                    }}
                  >
                    <span className={styles.label}>
                      {f.label}
                      {f.required && <span className={styles.star}>*</span>}
                      {isActive && <span className={styles.activeBadge}>typing…</span>}
                      {wasFilled && !isActive && <span className={styles.fbadge}>✓ filled</span>}
                    </span>
                    {f.multiline ? (
                      <textarea
                        className={`${styles.input} ${styles.textarea} ${wasFilled ? styles.inputFilled : ''} ${isActive ? styles.inputFilling : ''}`}
                        rows={f.id === 'cover' ? 6 : 4}
                        placeholder={f.placeholder}
                        value={value}
                        onChange={(e) => setVals((p) => ({ ...p, [f.id]: e.target.value }))}
                      />
                    ) : (
                      <input
                        className={`${styles.input} ${wasFilled ? styles.inputFilled : ''} ${isActive ? styles.inputFilling : ''}`}
                        type="text"
                        value={value}
                        onChange={(e) => setVals((p) => ({ ...p, [f.id]: e.target.value }))}
                      />
                    )}
                  </label>
                );
              })}

              <button type="button" className={styles.submit} disabled>
                Submit application
              </button>
              <p className={styles.submitNote}>Disabled in the demo, nothing gets sent.</p>
            </section>
          </article>
        </main>

        {/* ---------- Simulated Emplorio panel ---------- */}
        <aside className={styles.panelCol} aria-label="Emplorio panel">
          <div ref={panelRef} className={`${styles.panel} ${minimised ? styles.panelMin : ''}`}>
            {minimised ? (
              <button type="button" className={styles.pill} onClick={() => setMinimised(false)}>
                <span className={styles.panelMark} />
                Emplorio
                <span className={styles.pillCount}>{fillableCount}</span>
              </button>
            ) : (
              <div className={styles.panelCard}>
                <div className={styles.panelTop}>
                  <span className={styles.panelBrand}>
                    <span className={styles.panelMark} />
                    Emplorio
                  </span>
                  <button
                    type="button"
                    className={styles.panelMinBtn}
                    onClick={() => setMinimised(true)}
                    aria-label="Minimise"
                    title="Minimise"
                  >
                    –
                  </button>
                </div>

                <div className={styles.panelBody}>
                  <div>
                    <div className={styles.panelRole}>Not a real job application</div>
                    <div className={styles.panelCompany}>
                      {fillBusy
                        ? `Filling ${activeLabel ?? '…'}`
                        : filled
                          ? `${fillFilledCount} of ${fillableCount} fields filled`
                          : 'Emplorio · San Francisco, CA'}
                    </div>
                  </div>

                  <button
                    ref={fillBtnRef}
                    type="button"
                    className={`${styles.fillBtn} ${filled && !fillBusy ? styles.fillBtnDone : ''}`}
                    onClick={() => void doFill()}
                    disabled={fillBusy || filled || !canFill}
                  >
                    {fillBusy ? (
                      <>
                        <SpiralLoader size={16} tone="light" /> Filling…
                      </>
                    ) : filled ? (
                      <>
                        <span className={styles.check}>✓</span> Filled {fillFilledCount} fields
                      </>
                    ) : (
                      <>Fill {fillableCount} fields</>
                    )}
                  </button>

                  {filled && !fillBusy && (
                    <div className={styles.successNote}>
                      <span className={styles.successTick}>✓</span> Successfully filled, review and you
                      are done
                    </div>
                  )}

                  <div className={styles.aiRow}>
                    <button
                      ref={coverBtnRef}
                      type="button"
                      className={styles.aiBtn}
                      onClick={() => void doCover()}
                      disabled={coverBusy || !canCover}
                    >
                      {coverBusy && <SpiralLoader size={14} tone="dark" />}Cover letter
                    </button>
                    <button
                      ref={questionsBtnRef}
                      type="button"
                      className={styles.aiBtn}
                      onClick={() => void doQuestions()}
                      disabled={qBusy || !canQuestions}
                    >
                      {qBusy && <SpiralLoader size={14} tone="dark" />}Answer questions
                    </button>
                  </div>

                  {coverText && (
                    <div className={styles.result}>
                      <div className={styles.resultHead}>
                        <span>Cover letter draft</span>
                        <button type="button" className={styles.copy} onClick={copyCover}>
                          {copied ? 'Copied ✓' : 'Copy'}
                        </button>
                      </div>
                      <p className={styles.resultText}>{coverText}</p>
                      <button
                        type="button"
                        className={styles.pasteBtn}
                        onClick={pasteCover}
                        disabled={coverPasted}
                      >
                        {coverPasted ? '✓ Pasted into application' : '↧ Paste into application'}
                      </button>
                    </div>
                  )}

                  <div className={styles.panelFootRow}>
                    <span className={styles.panelFoot}>Fills only when you click</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ---------- Spotlight tour ---------- */}
      {mounted && intro === null && (
        <div className={styles.tour}>
          {isFinish ? null : spot ? (
            <>
              {/* Four blurred masks leave a clickable hole over the target */}
              <div
                className={styles.mask}
                style={{ top: 0, left: 0, width: '100vw', height: Math.max(0, spot.top - SPOT_PAD) }}
              />
              <div
                className={styles.mask}
                style={{
                  top: spot.top - SPOT_PAD,
                  left: 0,
                  width: Math.max(0, spot.left - SPOT_PAD),
                  height: spot.height + SPOT_PAD * 2,
                }}
              />
              <div
                className={styles.mask}
                style={{
                  top: spot.top - SPOT_PAD,
                  left: spot.left + spot.width + SPOT_PAD,
                  width: `calc(100vw - ${spot.left + spot.width + SPOT_PAD}px)`,
                  height: spot.height + SPOT_PAD * 2,
                }}
              />
              <div
                className={styles.mask}
                style={{
                  top: spot.top + spot.height + SPOT_PAD,
                  left: 0,
                  width: '100vw',
                  height: `calc(100vh - ${spot.top + spot.height + SPOT_PAD}px)`,
                }}
              />
              <div
                className={styles.ring}
                style={{
                  top: spot.top - SPOT_PAD,
                  left: spot.left - SPOT_PAD,
                  width: spot.width + SPOT_PAD * 2,
                  height: spot.height + SPOT_PAD * 2,
                }}
              />
            </>
          ) : (
            <div className={styles.maskFull} />
          )}

          <div
            ref={coachRef}
            className={isFinish ? styles.coachFinish : spot ? styles.coachFloat : styles.coachCenter}
            style={!isFinish && spot ? coachStyle() : undefined}
            role="dialog"
            aria-label="Tutorial step"
          >
            <p className={styles.coachStepNo}>
              Step {stepIdx + 1} of {TOUR.length}
            </p>
            <h3 className={styles.coachTitle}>{step.title}</h3>
            <p className={styles.coachBody}>{step.body}</p>

            {step.shortcuts && (
              <ul className={styles.shortcuts}>
                {SHORTCUTS.map((s) => (
                  <li key={s.keys}>
                    <span className={styles.keys}>
                      {s.keys.split(' + ').map((k) => (
                        <kbd key={k}>{k}</kbd>
                      ))}
                    </span>
                    <span className={styles.keyLabel}>{s.label}</span>
                  </li>
                ))}
              </ul>
            )}

            {step.hint && !canNext && <p className={styles.coachHint}>👉 {step.hint}</p>}

            <div className={styles.coachNav}>
              <button
                type="button"
                className={styles.coachBack}
                onClick={goBack}
                disabled={stepIdx === 0}
              >
                ← Back
              </button>

              <div className={styles.dots} aria-hidden="true">
                {TOUR.map((s, i) => (
                  <span key={s.id} className={i === stepIdx ? styles.dotOn : styles.dot} />
                ))}
              </div>

              {step.gate === 'finish' ? (
                <button type="button" className={styles.coachNext} onClick={goNext}>
                  Finish →
                </button>
              ) : (
                <div className={styles.coachRight}>
                  <button type="button" className={styles.coachSkip} onClick={skip}>
                    Skip
                  </button>
                  <button
                    type="button"
                    className={styles.coachNext}
                    onClick={goNext}
                    disabled={!canNext}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
