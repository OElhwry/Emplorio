'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchProfile, requestCode, toFriendlyMessage, verifyCode } from '../lib/api';
import { profileCompletionPct } from '../lib/completeness';
import styles from './login.module.css';
import { LoadingButton } from '../_components/LoadingButton';
import { FormMessage } from '../_components/FormMessage';

type Step = 'email' | 'code';

const MOCK_FIELDS = ['First name', 'Last name', 'Email', 'Phone', 'Work authorization'];
const ATS_PLATFORMS = [
  'Greenhouse',
  'Lever',
  'Workday',
  'Ashby',
  'LinkedIn',
  'Indeed',
  'Workable',
  'SmartRecruiters',
  'iCIMS',
];

type ShapeCfg = {
  leftPct: number;
  topPct: number;
  size: number;
  br: number | string;
  dx: number;
  dy: number;
  rot: number;
  dur: number;
  delay: number;
};

const SHAPES: ShapeCfg[] = [
  { leftPct: 6, topPct: 16, size: 120, br: 26, dx: 52, dy: 36, rot: -8, dur: 50, delay: -3 },
  { leftPct: 20, topPct: 66, size: 150, br: '50%', dx: 44, dy: -52, rot: 0, dur: 74, delay: -30 },
  { leftPct: 33, topPct: 30, size: 70, br: 18, dx: 60, dy: 30, rot: 0, dur: 38, delay: -12 },
  { leftPct: 44, topPct: 82, size: 92, br: 24, dx: -40, dy: -42, rot: 14, dur: 60, delay: -20 },
  { leftPct: 50, topPct: 14, size: 64, br: '50%', dx: 50, dy: 34, rot: 0, dur: 46, delay: -9 },
  { leftPct: 60, topPct: 56, size: 110, br: 30, dx: -52, dy: 44, rot: 12, dur: 68, delay: -16 },
  { leftPct: 73, topPct: 24, size: 84, br: 22, dx: 46, dy: -40, rot: -10, dur: 64, delay: -8 },
  { leftPct: 85, topPct: 70, size: 130, br: '50%', dx: -48, dy: -38, rot: 0, dur: 78, delay: -34 },
  { leftPct: 92, topPct: 36, size: 72, br: 20, dx: -36, dy: 40, rot: 22, dur: 44, delay: -6 },
];

/** The landing-page drifting shapes, scoped to a panel (no pointer parallax). */
function PanelShapes({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`${styles.panelShapes} ${dark ? styles.onDark : ''}`} aria-hidden="true">
      <div className="parallax parallax-far">
        <span className="dot dot-1" />
        <span className="dot dot-2" />
        <span className="dot dot-3" />
        <span className="dot dot-4" />
        <span className="dot dot-5" />
      </div>
      <div className="parallax parallax-mid">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </div>
      <div className="parallax parallax-near">
        {SHAPES.map((s, i) => (
          <span
            key={i}
            className="shape-wrap"
            style={{ left: `${s.leftPct}%`, top: `${s.topPct}%`, width: s.size, height: s.size }}
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

function Mockup() {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const first = setTimeout(() => setFilled(true), 1100);
    // Replay the fill every ~18s: clear, pause, then fill again.
    const loop = setInterval(() => {
      setFilled(false);
      setTimeout(() => setFilled(true), 800);
    }, 18000);
    return () => {
      clearTimeout(first);
      clearInterval(loop);
    };
  }, []);

  return (
    <div className={`${styles.stage} ${filled ? styles.isFilled : ''}`} aria-hidden="true">
      <div className={styles.mock}>
        <div className={styles.mockTop}>
          <span className={styles.mockDots}>
            <i />
            <i />
            <i />
          </span>
          <span className={styles.mockTitle}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/emplorio-mark-dark.png" alt="" className={styles.mockLogo} />
            Emplorio
          </span>
        </div>
        <div className={styles.mockRows}>
          {MOCK_FIELDS.map((f, i) => (
            <div className={styles.mockRow} key={f} style={{ transitionDelay: `${0.12 + i * 0.11}s` }}>
              <span className={styles.mockField}>{f}</span>
              <span className={styles.tick} style={{ transitionDelay: `${0.18 + i * 0.11}s` }}>
                ✓
              </span>
            </div>
          ))}
        </div>
        <button type="button" className={styles.mockBtn} onClick={() => setFilled((v) => !v)}>
          {filled ? 'Filled ✓  ·  replay' : 'Fill this form'}
        </button>
      </div>

      <div className={`${styles.toast} ${styles.toastA}`}>
        <b>✓</b> Filled 14 fields
      </div>
      <div className={`${styles.toast} ${styles.toastB}`}>
        <b>✨</b> Cover letter drafted
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [devHint, setDevHint] = useState(false);

  useEffect(() => {
    document.title = 'Emplorio · Sign in';
  }, []);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { devCode } = await requestCode(email.trim());
      if (devCode) {
        setCode(devCode); // dev: prefill so you can sign in without email
        setDevHint(true);
      }
      setStep('code');
    } catch (err) {
      setError(toFriendlyMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await verifyCode(email.trim(), code.trim());
      // Honour an explicit return destination (e.g. the extension's tutorial handoff).
      const nextParam = new URLSearchParams(window.location.search).get('next');
      if (nextParam && nextParam.startsWith('/')) {
        router.push(nextParam);
        return;
      }
      const profile = await fetchProfile().catch(() => null);
      const pct = profileCompletionPct(profile);
      // New / nearly-empty accounts go through the guided onboarding first.
      router.push(pct < 20 ? '/get-started' : '/dashboard');
    } catch (err) {
      setError(toFriendlyMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      {/* Two-tone background on the bottom layer */}
      <div className={styles.bgLayer} aria-hidden="true">
        <div className={styles.bgLeft} />
      </div>
      {/* One shapes layer above the backgrounds, so shapes drift past the seam */}
      <PanelShapes dark />

      {/* ---------- Left brand panel ---------- */}
      <section className={styles.brand}>
        <div className={styles.brandInner}>
          <a href="/" className={styles.logo} aria-label="Back to Emplorio home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/emplorio-mark-dark.png" alt="" className={styles.logoMark} />
            Emplorio
          </a>

          <div className={styles.brandBody}>
            <h1 className={styles.brandHeadline}>
              Apply once.
              <br /> Send everywhere.
            </h1>
            <p className={styles.brandSub}>Click fill, and watch the whole application complete itself.</p>
            <Mockup />
          </div>
        </div>

        <div className={styles.marqueeWrap}>
          <div className={styles.marquee}>
            {[...ATS_PLATFORMS, ...ATS_PLATFORMS].map((p, i) => (
              <span className={styles.marqueeItem} key={`${p}-${i}`}>
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Right form panel ---------- */}
      <section className={styles.formSide}>
        <a href="/" className={styles.mobileLogo} aria-label="Back to Emplorio home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/emplorio-mark-light.png" alt="" className={`${styles.mobileMark} ${styles.markLight}`} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/emplorio-mark-dark.png" alt="" className={`${styles.mobileMark} ${styles.markDark}`} />
          Emplorio
        </a>

        <div className={styles.formInner}>
          {step === 'email' ? (
            <>
              <h2 className={styles.title}>Sign in or create your account</h2>
              <p className={styles.sub}>We&apos;ll email you a 6-digit code. No password needed.</p>
              <form onSubmit={sendCode} className={styles.form}>
                <label className={styles.field}>
                  <span className={styles.label}>Email address</span>
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.input}
                  />
                </label>
                {error && (
                  <FormMessage
                    tone="error"
                    action={
                      <button type="submit" className={styles.retry} disabled={busy}>
                        Try again
                      </button>
                    }
                  >
                    {error}
                  </FormMessage>
                )}
                <LoadingButton type="submit" loading={busy} loadingText="Sending…" className={styles.button}>
                  Continue with email
                </LoadingButton>
                <p className={styles.fine}>
                  First time? This creates your account. No card, free forever.
                </p>
              </form>
            </>
          ) : (
            <>
              <h2 className={styles.title}>Check your email</h2>
              <p className={styles.sub}>
                We sent a 6-digit code to <strong>{email}</strong>.
              </p>
              {devHint && (
                <FormMessage tone="info">Dev mode: code prefilled, no email needed locally.</FormMessage>
              )}
              <form onSubmit={submitCode} className={styles.form}>
                <label className={styles.field}>
                  <span className={styles.label}>6-digit code</span>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    autoFocus
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className={`${styles.input} ${styles.codeInput}`}
                  />
                </label>
                {error && <FormMessage tone="error">{error}</FormMessage>}
                <LoadingButton
                  type="submit"
                  loading={busy}
                  loadingText="Verifying…"
                  disabled={code.length < 6}
                  className={styles.button}
                >
                  Verify & continue
                </LoadingButton>
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => {
                    setStep('email');
                    setCode('');
                    setError('');
                  }}
                >
                  ← Use a different email
                </button>
              </form>
            </>
          )}

          <p className={styles.legal}>
            By continuing you agree to our{' '}
            <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
