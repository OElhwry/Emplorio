'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/useAuth';
import { fetchProfile, saveProfile } from '../lib/api';
import { extractPdfText, fileToDataUrl } from '../lib/pdf';
import styles from './getstarted.module.css';

type StepId =
  | 'timeline'
  | 'availability'
  | 'roles'
  | 'salary'
  | 'stats'
  | 'cv'
  | 'value'
  | 'pitch2'
  | 'pitch3'
  | 'why'
  | 'finish';
const STEPS: StepId[] = [
  'timeline',
  'availability',
  'roles',
  'salary',
  'stats',
  'cv',
  'value',
  'pitch2',
  'pitch3',
  'why',
  'finish',
];

function targetDateFrom(timeline: string | null): string {
  const d = new Date();
  const months = timeline === 'As soon as possible' ? 1 : timeline === 'Within 3 months' ? 3 : 6;
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

/** Files at/under this size also store the blob for sync; larger keep just text. */
const STORE_BLOB_MAX = 600 * 1024;

const TIMELINE = ['As soon as possible', 'Within 3 months', 'Within 6 months', 'Just exploring'];
const AVAILABILITY = ['Immediately', 'In 2–4 weeks', '1–3 months', 'Flexible'];
const ROLES = [
  'Software Engineering',
  'Data Science',
  'AI & Machine Learning',
  'Product',
  'Design (UI/UX)',
  'Marketing & Growth',
  'Finance & Banking',
  'Consulting',
  'Sales',
  'Operations',
  'Customer Success',
  'People & HR',
];

/** Approx FX vs USD, just for the onboarding salary slider conversion. */
const CURRENCIES: { code: string; symbol: string; perUsd: number }[] = [
  { code: 'USD', symbol: '$', perUsd: 1 },
  { code: 'GBP', symbol: '£', perUsd: 0.79 },
  { code: 'EUR', symbol: '€', perUsd: 0.92 },
];

export default function GetStartedPage() {
  const router = useRouter();
  const { status, signOut } = useAuth();
  const [idx, setIdx] = useState(0);
  const [timeline, setTimeline] = useState<string | null>(null);
  const [availability, setAvailability] = useState<string | null>(null);
  const [roleInterest, setRoleInterest] = useState<string | null>(null);
  const [salary, setSalary] = useState(80);
  const [currency, setCurrency] = useState(CURRENCIES[0]!);
  const [firstName, setFirstName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status !== 'authed') return;
    void fetchProfile().then((p) => {
      if (p?.firstName) setFirstName(p.firstName);
    });
  }, [status]);
  const [cvName, setCvName] = useState<string | null>(null);
  const [cvBusy, setCvBusy] = useState(false);
  const [cvStatus, setCvStatus] = useState('');
  const [cvError, setCvError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleCv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCvError('');
    setCvStatus('');
    setCvBusy(true);
    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const current = (await fetchProfile().catch(() => null)) ?? {};
      const patch: Record<string, unknown> = { ...current };
      if (file.size <= STORE_BLOB_MAX) {
        const dataUrl = await fileToDataUrl(file);
        patch.cvFile = {
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl,
          uploadedAt: Date.now(),
        };
      }
      if (isPdf) {
        setCvStatus('Reading your resume…');
        patch.baseCvText = await extractPdfText(file);
      }
      await saveProfile(patch as Parameters<typeof saveProfile>[0]);
      setCvName(file.name);
      setCvStatus(isPdf ? "Saved. We'll prefill your profile from it." : 'Saved.');
    } catch {
      setCvError('Could not read that file. A PDF works best.');
    } finally {
      setCvBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  useEffect(() => {
    document.title = 'Emplorio · Get started';
  }, []);
  useEffect(() => {
    if (status === 'anon') router.replace('/login');
  }, [status, router]);

  if (status !== 'authed') {
    return <div className={styles.loading}>Loading…</div>;
  }

  const step = STEPS[idx];
  const pct = Math.round(((idx + 1) / STEPS.length) * 100);
  const canAdvance =
    step === 'timeline'
      ? !!timeline
      : step === 'availability'
        ? !!availability
        : step === 'roles'
          ? !!roleInterest
          : true;
  const salaryLabel = `${currency.symbol}${salary}k+`;

  async function finish(target: string) {
    setSaving(true);
    try {
      const current = (await fetchProfile().catch(() => null)) ?? {};
      const patch: Record<string, unknown> = { ...current };
      if (availability === 'Immediately') {
        patch.availableStartDate = new Date().toISOString().slice(0, 10);
      }
      if (timeline) patch.searchTimeline = timeline;
      if (roleInterest) patch.roleInterest = roleInterest;
      patch.desiredSalary = `${currency.symbol}${salary}k+`;
      await saveProfile(patch as Parameters<typeof saveProfile>[0]).catch(() => {});
    } finally {
      router.push(target);
    }
  }

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <a href="/" className={styles.brand} aria-label="Emplorio home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/emplorio-mark-light.png" alt="" className={`${styles.mark} ${styles.markLight}`} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/emplorio-mark-dark.png" alt="" className={`${styles.mark} ${styles.markDark}`} />
          Emplorio
        </a>
        <button type="button" className={styles.signout} onClick={() => void signOut()}>
          Sign out
        </button>
      </nav>

      <div className={styles.progressRow}>
        <button
          type="button"
          className={styles.back}
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          aria-label="Go back"
        >
          ←
        </button>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${pct}%` }} />
        </div>
        <span className={styles.spacer} aria-hidden="true" />
      </div>

      <main className={styles.main} key={step}>
        {step === 'timeline' && (
          <Choices
            title="How soon do you want to land your next role?"
            options={TIMELINE}
            value={timeline}
            onChange={setTimeline}
          />
        )}
        {step === 'availability' && (
          <Choices
            title="When could you start a new role?"
            options={AVAILABILITY}
            value={availability}
            onChange={setAvailability}
          />
        )}
        {step === 'roles' && <RolesStep value={roleInterest} onChange={setRoleInterest} />}
        {step === 'salary' && (
          <SalaryStep
            salary={salary}
            setSalary={setSalary}
            currency={currency}
            setCurrency={setCurrency}
          />
        )}
        {step === 'stats' && <Stats />}
        {step === 'cv' && (
          <CvStep
            fileRef={fileRef}
            busy={cvBusy}
            name={cvName}
            status={cvStatus}
            error={cvError}
            onFile={handleCv}
          />
        )}
        {step === 'value' && <Value />}
        {step === 'pitch2' && (
          <Pitch
            highlight="draft tailored cover letters."
            callout="✨ Written from your real CV in seconds, never invented."
          />
        )}
        {step === 'pitch3' && (
          <Pitch
            highlight="answer the tricky questions."
            callout="💬 Screening and “why this role?” answers, in your voice."
          />
        )}
        {step === 'why' && <Why />}
        {step === 'finish' && (
          <Finish
            firstName={firstName}
            targetDate={targetDateFrom(timeline)}
            recap={[
              { label: 'Role interest', value: roleInterest },
              { label: 'Min salary', value: salaryLabel },
              { label: 'Can start', value: availability },
            ]}
          />
        )}
      </main>

      <footer className={styles.footer}>
        {step !== 'finish' ? (
          <button
            type="button"
            className={styles.primary}
            disabled={!canAdvance || cvBusy}
            onClick={() => setIdx((i) => Math.min(STEPS.length - 1, i + 1))}
          >
            {step === 'stats' ? 'Sounds good' : step === 'why' ? 'See my plan' : 'Continue'} →
          </button>
        ) : (
          <div className={styles.finishActions}>
            <button
              type="button"
              className={styles.primary}
              disabled={saving}
              onClick={() => void finish(`/tutorial?next=${encodeURIComponent('/profile?welcome=1')}`)}
            >
              {saving ? 'Saving…' : 'Build my profile →'}
            </button>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => void finish(`/tutorial?next=${encodeURIComponent('/dashboard')}`)}
            >
              Skip to dashboard
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}

function Choices({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: string[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className={styles.step}>
      <h1 className={styles.q}>{title}</h1>
      <div className={styles.choices}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            className={value === o ? styles.choiceOn : styles.choice}
            onClick={() => onChange(o)}
          >
            <span className={styles.radio} aria-hidden="true" />
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Stats() {
  return (
    <div className={styles.step}>
      <p className={styles.eyebrow}>Why people switch to Emplorio</p>
      <h1 className={styles.q}>
        Apply in a fraction of the time, <span className={styles.accent}>10x more reach.</span>
      </h1>
      <div className={styles.chartCard}>
        <div className={styles.bars}>
          <div className={styles.barCol}>
            <span className={styles.barLabelTop}>~2/hr</span>
            <div className={`${styles.bar} ${styles.barManual}`} style={{ height: '32px' }} />
            <span className={styles.barLabel}>By hand</span>
          </div>
          <div className={styles.barCol}>
            <span className={styles.barLabelTopAccent}>~20/hr</span>
            <div className={`${styles.bar} ${styles.barEmplorio}`} style={{ height: '120px' }} />
            <span className={styles.barLabel}>With Emplorio</span>
          </div>
        </div>
        <p className={styles.chartNote}>
          Autofill every field, draft the cover letter, and log it automatically, so you apply to ten
          roles in the time it used to take for one.
        </p>
      </div>
    </div>
  );
}

function CvStep({
  fileRef,
  busy,
  name,
  status,
  error,
  onFile,
}: {
  fileRef: React.RefObject<HTMLInputElement>;
  busy: boolean;
  name: string | null;
  status: string;
  error: string;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className={styles.step}>
      <h1 className={styles.q}>Upload your resume to autofill faster</h1>
      <p className={styles.cvLead}>
        Drop it in once and Emplorio fills every application from it, and prefills your profile.
      </p>

      <label className={styles.drop}>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf"
          onChange={onFile}
          className={styles.dropInput}
          disabled={busy}
        />
        <svg className={styles.dropIcon} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className={styles.dropTitle}>{busy ? 'Working…' : name ? 'Replace resume' : 'Upload a file'}</span>
        <span className={styles.dropHint}>PDF, DOC, DOCX up to 5 MB. PDF recommended.</span>
      </label>

      {name && !busy && (
        <div className={styles.cvDone}>
          <span className={styles.cvTick}>✓</span> {name}
        </div>
      )}
      {status && !error && <p className={styles.cvStatus}>{status}</p>}
      {error && <p className={styles.cvErr}>{error}</p>}

      <div className={styles.privacy}>
        <span aria-hidden="true">🔒</span>
        <span>Your resume is only used to fill your applications. We never sell or share it.</span>
      </div>
    </div>
  );
}

function Value() {
  return (
    <div className={styles.step}>
      <p className={styles.eyebrow}>How it works</p>
      <h1 className={styles.q}>
        One profile, <span className={styles.accent}>every application filled.</span>
      </h1>
      <div className={styles.fillCard}>
        {['Name, email, phone & address', 'Work history & education', 'Screening questions & EEO'].map(
          (row, i) => (
            <div className={styles.fillRow} key={row} style={{ animationDelay: `${0.3 + i * 0.25}s` }}>
              <span className={styles.fillTick} aria-hidden="true">
                ✓
              </span>
              {row}
            </div>
          ),
        )}
        <div className={styles.fillBtn}>Filled in one click</div>
      </div>
    </div>
  );
}

function RolesStep({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  const [query, setQuery] = useState('');
  const filtered = ROLES.filter((r) => r.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div className={styles.step}>
      <h1 className={styles.q}>What kind of role are you after?</h1>
      <p className={styles.cvLead}>Pick one to start, you can add more in your profile later.</p>
      <input
        className={styles.search}
        placeholder="Search by job title…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className={styles.chips}>
        {filtered.map((r) => (
          <button
            key={r}
            type="button"
            className={value === r ? styles.chipOn : styles.chip}
            onClick={() => onChange(r)}
          >
            {r}
          </button>
        ))}
        {filtered.length === 0 && <p className={styles.cvStatus}>No matches, try another search.</p>}
      </div>
    </div>
  );
}

type Currency = (typeof CURRENCIES)[number];
function SalaryStep({
  salary,
  setSalary,
  currency,
  setCurrency,
}: {
  salary: number;
  setSalary: (n: number) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
}) {
  function switchCurrency(next: Currency) {
    // Convert the current amount into the new currency so it stays meaningful.
    const inUsd = salary / currency.perUsd;
    setSalary(Math.max(0, Math.round((inUsd * next.perUsd) / 5) * 5));
    setCurrency(next);
  }
  return (
    <div className={styles.step}>
      <h1 className={styles.q}>What&apos;s your minimum expected salary?</h1>
      <div className={styles.currencyRow}>
        {CURRENCIES.map((c) => (
          <button
            key={c.code}
            type="button"
            className={currency.code === c.code ? styles.curOn : styles.cur}
            onClick={() => switchCurrency(c)}
          >
            {c.symbol} {c.code}
          </button>
        ))}
      </div>
      <div className={styles.salaryDial}>
        <span className={styles.salaryLead}>At least</span>
        <span className={styles.salaryBig}>
          {currency.symbol}
          {salary}k
        </span>
        <span className={styles.salaryUnit}>{currency.code}</span>
      </div>
      <input
        type="range"
        min={0}
        max={300}
        step={5}
        value={salary}
        onChange={(e) => setSalary(Number(e.target.value))}
        className={styles.slider}
        aria-label="Minimum salary"
      />
      <p className={styles.cvStatus}>Only used to filter roles. Never shared.</p>
    </div>
  );
}

function Pitch({ highlight, callout }: { highlight: string; callout: string }) {
  return (
    <div className={`${styles.step} ${styles.pitchStep}`}>
      <p className={styles.pitchLead}>Emplorio helps you…</p>
      <p className={styles.pitchHighlight}>{highlight}</p>
      <div className={styles.callout}>{callout}</div>
    </div>
  );
}

function Why() {
  return (
    <div className={styles.step}>
      <h1 className={styles.q}>Built to get you noticed, not flagged</h1>
      <figure className={styles.quoteCard}>
        <blockquote className={styles.quote}>
          “Recruiters can spot a generic AI application instantly. Emplorio is grounded in your{' '}
          <span className={styles.accent}>real CV</span>, it rewrites and emphasises, it never
          invents. So your applications read like you, only sharper.”
        </blockquote>
        <figcaption className={styles.quoteBy}>
          <span className={styles.quoteMark} aria-hidden="true" />
          <span>
            <strong>The Emplorio principle</strong>
            <span className={styles.quoteRole}>Grounded generation, no fabrication</span>
          </span>
        </figcaption>
      </figure>
    </div>
  );
}

function Finish({
  firstName,
  targetDate,
  recap,
}: {
  firstName: string;
  targetDate: string;
  recap: { label: string; value: string | null }[];
}) {
  return (
    <div className={`${styles.step} ${styles.finishStep}`}>
      <p className={styles.planHi}>Welcome{firstName ? `, ${firstName}` : ''}.</p>
      <h1 className={styles.planGoal}>
        Land a job by <span className={styles.planDate}>{targetDate}</span>
      </h1>

      <div className={styles.planBadge}>
        <span aria-hidden="true">🎉</span> Your custom plan is ready
      </div>

      <div className={styles.timeCompare}>
        <p className={styles.timeTitle}>Estimated effort to your first interview</p>
        <div className={styles.timeRow}>
          <div className={styles.timeCol}>
            <span className={styles.timeColTitle}>Traditional search</span>
            <span className={styles.timeBig}>10–15 hrs</span>
            <span className={styles.timeUnit}>per week</span>
          </div>
          <span className={styles.timeVs}>vs</span>
          <div className={`${styles.timeCol} ${styles.timeColAccent}`}>
            <span className={styles.timeColTitleAccent}>With Emplorio</span>
            <span className={styles.timeBigAccent}>~30 mins</span>
            <span className={styles.timeUnitAccent}>per week</span>
          </div>
        </div>
      </div>

      <div className={styles.recap}>
        {recap.map((r) => (
          <div className={styles.recapRow} key={r.label}>
            <span className={styles.recapLabel}>{r.label}</span>
            <span className={styles.recapValue}>{r.value || '—'}</span>
          </div>
        ))}
      </div>

      <p className={styles.finishSub}>
        Last step: build your profile so Emplorio can autofill every application for you.
      </p>
    </div>
  );
}
