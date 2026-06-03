'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { EducationEntry, Profile, WorkHistoryEntry } from '@emplorio/shared';
import {
  fetchProfile,
  getAnthropicKey,
  parseCv,
  saveProfile,
  setAnthropicKey as persistAnthropicKey,
} from '../lib/api';
import { extractPdfText, fileToDataUrl } from '../lib/pdf';
import { profileCompletionPct } from '../lib/completeness';
import styles from './profile.module.css';

type TabId =
  | 'cv'
  | 'personal'
  | 'links'
  | 'experience'
  | 'education'
  | 'skills'
  | 'work'
  | 'eeo';

const TABS: { id: TabId; label: string }[] = [
  { id: 'cv', label: 'Resume' },
  { id: 'personal', label: 'Personal' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Skills' },
  { id: 'work', label: 'Work Authorization' },
  { id: 'eeo', label: 'EEO' },
  { id: 'links', label: 'Links' },
];

/** Whether a section has enough in it to count as done. EEO is voluntary, so it
 *  never counts as "missing". */
const SECTION_DONE: Record<TabId, (p: Partial<Profile>) => boolean> = {
  cv: (p) => !!(p.cvFile || p.baseCvText),
  personal: (p) => !!(p.firstName && p.lastName && p.email && p.phone && p.city && p.country),
  experience: (p) => (p.workHistory?.length ?? 0) > 0,
  education: (p) => (p.education?.length ?? 0) > 0,
  skills: (p) => (p.skills?.length ?? 0) > 0,
  work: (p) => !!p.workAuthorization,
  links: (p) => !!(p.linkedinUrl || p.githubUrl || p.portfolioUrl),
  eeo: () => true,
};

/** Files at or under this size also get stored as a blob for cross-device sync;
 *  larger ones keep only the parsed text to stay under the API body limit. */
const STORE_BLOB_MAX = 600 * 1024;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const GENDER_OPTIONS = ['', 'Male', 'Female', 'Non-binary', 'Prefer not to say'];
const VETERAN_OPTIONS = [
  '',
  'I am not a protected veteran',
  'I am a protected veteran',
  'Prefer not to say',
];
const DISABILITY_OPTIONS = [
  '',
  'No, I do not have a disability',
  'Yes, I have a disability',
  'Prefer not to say',
];
const ETHNICITY_OPTIONS = [
  'Asian',
  'Black or African American',
  'Hispanic or Latino',
  'Native American or Alaska Native',
  'Native Hawaiian or Pacific Islander',
  'White',
  'Two or more races',
];

/** Common dial codes (flag, ISO, dial). Stored value is just the dial string. */
const DIAL_CODES: Array<{ iso: string; dial: string; name: string; flag: string }> = [
  { iso: 'GB', dial: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { iso: 'US', dial: '+1', name: 'United States', flag: '🇺🇸' },
  { iso: 'CA', dial: '+1', name: 'Canada', flag: '🇨🇦' },
  { iso: 'IE', dial: '+353', name: 'Ireland', flag: '🇮🇪' },
  { iso: 'AU', dial: '+61', name: 'Australia', flag: '🇦🇺' },
  { iso: 'NZ', dial: '+64', name: 'New Zealand', flag: '🇳🇿' },
  { iso: 'DE', dial: '+49', name: 'Germany', flag: '🇩🇪' },
  { iso: 'FR', dial: '+33', name: 'France', flag: '🇫🇷' },
  { iso: 'ES', dial: '+34', name: 'Spain', flag: '🇪🇸' },
  { iso: 'IT', dial: '+39', name: 'Italy', flag: '🇮🇹' },
  { iso: 'NL', dial: '+31', name: 'Netherlands', flag: '🇳🇱' },
  { iso: 'BE', dial: '+32', name: 'Belgium', flag: '🇧🇪' },
  { iso: 'CH', dial: '+41', name: 'Switzerland', flag: '🇨🇭' },
  { iso: 'SE', dial: '+46', name: 'Sweden', flag: '🇸🇪' },
  { iso: 'NO', dial: '+47', name: 'Norway', flag: '🇳🇴' },
  { iso: 'DK', dial: '+45', name: 'Denmark', flag: '🇩🇰' },
  { iso: 'PL', dial: '+48', name: 'Poland', flag: '🇵🇱' },
  { iso: 'PT', dial: '+351', name: 'Portugal', flag: '🇵🇹' },
  { iso: 'IN', dial: '+91', name: 'India', flag: '🇮🇳' },
  { iso: 'SG', dial: '+65', name: 'Singapore', flag: '🇸🇬' },
  { iso: 'AE', dial: '+971', name: 'United Arab Emirates', flag: '🇦🇪' },
  { iso: 'ZA', dial: '+27', name: 'South Africa', flag: '🇿🇦' },
  { iso: 'BR', dial: '+55', name: 'Brazil', flag: '🇧🇷' },
  { iso: 'MX', dial: '+52', name: 'Mexico', flag: '🇲🇽' },
  { iso: 'JP', dial: '+81', name: 'Japan', flag: '🇯🇵' },
  { iso: 'CN', dial: '+86', name: 'China', flag: '🇨🇳' },
];

const SUGGESTED_SKILLS = [
  'TypeScript', 'JavaScript', 'React', 'Next.js', 'Node.js', 'Python', 'Java', 'SQL',
  'HTML/CSS', 'AWS', 'Docker', 'Kubernetes', 'Git', 'REST APIs', 'GraphQL', 'PostgreSQL',
  'Excel', 'Figma', 'Project management', 'Communication', 'Leadership', 'Data analysis',
];

function normalizeUrl(v: string): string {
  const t = v.trim();
  if (!t) return '';
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function IconLinkedIn() {
  return (
    <svg width="14" height="14" viewBox="0 0 448 512" fill="#0a66c2" aria-hidden="true">
      <path d="M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3C448 46.5 433.6 32 416 32zM135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5zm282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9V416z" />
    </svg>
  );
}
function IconGitHub() {
  return (
    <svg width="14" height="14" viewBox="0 0 496 512" fill="currentColor" aria-hidden="true">
      <path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8z" />
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function ProfileEditor() {
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<TabId>('personal');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [welcome, setWelcome] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWelcome(new URLSearchParams(window.location.search).get('welcome') === '1');
    }
  }, []);

  const skipNextSave = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchProfile().then((p) => {
      if (cancelled) return;
      setProfile(p ?? {});
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced autosave whenever the profile changes (after the initial load).
  useEffect(() => {
    if (!loaded) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState('saving');
    saveTimer.current = setTimeout(() => {
      void saveProfile(profile)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'));
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(profile), loaded]);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function merge(patch: Partial<Profile>) {
    setProfile((prev) => ({ ...prev, ...patch }));
  }

  const completion = useMemo(() => profileCompletionPct(profile), [profile]);
  const incomplete = TABS.filter((t) => t.id !== 'eeo' && !SECTION_DONE[t.id](profile));

  if (!loaded) {
    return <p className={styles.loading}>Loading your profile…</p>;
  }

  return (
    <div className={styles.editor}>
      {welcome && (
        <div className={styles.welcome}>
          <strong>Welcome to Emplorio.</strong> Fill in your profile once and the extension autofills
          every application for you. The quickest start: drop your resume into the Resume tab.
        </div>
      )}
      <div className={styles.progress}>
        <div className={styles.progressTop}>
          <span className={styles.progressHead}>Profile {completion}% complete</span>
          <SaveIndicator state={saveState} />
        </div>
        <div className={styles.bar}>
          <span style={{ width: `${completion}%` }} />
        </div>
        {incomplete.length > 0 && (
          <div className={styles.missing}>
            <span>Still to fill:</span>
            {incomplete.map((t) => (
              <button key={t.id} type="button" className={styles.missingLink} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <nav className={styles.tabs}>
        {TABS.map((t) => {
          const done = SECTION_DONE[t.id](profile);
          return (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? styles.tabActive : styles.tab}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {!done && t.id !== 'eeo' && <span className={styles.tabDot} aria-hidden="true" />}
            </button>
          );
        })}
      </nav>

      <section className={styles.panel}>
        {tab === 'cv' && <CvSection profile={profile} set={set} merge={merge} />}
        {tab === 'personal' && <PersonalSection profile={profile} set={set} />}
        {tab === 'links' && <LinksSection profile={profile} set={set} />}
        {tab === 'experience' && <ExperienceSection profile={profile} set={set} />}
        {tab === 'education' && <EducationSection profile={profile} set={set} />}
        {tab === 'skills' && <SkillsSection profile={profile} set={set} />}
        {tab === 'work' && <WorkAuthSection profile={profile} set={set} />}
        {tab === 'eeo' && <EeoSection profile={profile} set={set} />}
      </section>
    </div>
  );
}

/* ---------- Shared field primitives ---------- */

type SetFn = <K extends keyof Profile>(key: K, value: Profile[K]) => void;
interface SectionProps {
  profile: Partial<Profile>;
  set: SetFn;
}

function Text({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  hint,
  span = 1,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  span?: 1 | 2;
}) {
  return (
    <label className={span === 2 ? styles.fieldWide : styles.field}>
      <span className={styles.label}>{label}</span>
      <input
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={styles.input}
      />
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={styles.input}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o === '' ? 'Select…' : o}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Combined phone control: a flag picker (names in the menu, flag when chosen),
 *  the dial-code prefix, and the number. */
function PhoneField({ profile, set }: SectionProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const selected = DIAL_CODES.find((c) => c.dial === profile.phoneCountryCode);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className={styles.fieldWide}>
      <span className={styles.label}>Phone</span>
      <div className={styles.phoneRow} ref={ref}>
        <button
          type="button"
          className={styles.flagBtn}
          onClick={() => setOpen((o) => !o)}
          aria-label="Select country"
        >
          {selected ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.flagImg}
              src={`https://flagcdn.com/${selected.iso.toLowerCase()}.svg`}
              alt={selected.name}
            />
          ) : (
            <span className={styles.flagPlaceholder}>Country</span>
          )}
          <span className={styles.caret}>▾</span>
        </button>
        {profile.phoneCountryCode && <span className={styles.dialPrefix}>{profile.phoneCountryCode}</span>}
        <input
          className={styles.phoneInput}
          value={profile.phone ?? ''}
          placeholder="7700 900000"
          onChange={(e) => set('phone', e.target.value)}
        />
        {open && (
          <ul className={styles.flagMenu} role="listbox">
            {DIAL_CODES.map((c) => (
              <li key={c.iso}>
                <button
                  type="button"
                  className={styles.flagItem}
                  onClick={() => {
                    set('phoneCountryCode', c.dial);
                    setOpen(false);
                  }}
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const MONTHS: Array<[string, string]> = [
  ['01', 'Jan'], ['02', 'Feb'], ['03', 'Mar'], ['04', 'Apr'], ['05', 'May'], ['06', 'Jun'],
  ['07', 'Jul'], ['08', 'Aug'], ['09', 'Sep'], ['10', 'Oct'], ['11', 'Nov'], ['12', 'Dec'],
];
const YEARS: string[] = (() => {
  const now = new Date().getFullYear();
  const out: string[] = [];
  for (let y = now + 6; y >= 1960; y--) out.push(String(y));
  return out;
})();

/** Month + year pair that reads and writes a "YYYY-MM" string. */
function MonthYear({
  label,
  value,
  onChange,
  span = 1,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  span?: 1 | 2;
}) {
  const [year = '', month = ''] = (value ?? '').split('-');
  function emit(nextYear: string, nextMonth: string) {
    if (nextYear && nextMonth) onChange(`${nextYear}-${nextMonth}`);
    else if (nextYear) onChange(nextYear);
    else onChange('');
  }
  return (
    <div className={span === 2 ? styles.fieldWide : styles.field}>
      <span className={styles.label}>{label}</span>
      <div className={styles.row}>
        <select className={styles.input} value={month} onChange={(e) => emit(year, e.target.value)}>
          <option value="">Month</option>
          {MONTHS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select className={styles.input} value={year} onChange={(e) => emit(e.target.value, month)}>
          <option value="">Year</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** A Yes/No (or custom) segmented control bound to a boolean. */
function Segmented({
  label,
  value,
  onChange,
  span = 2,
}: {
  label: string;
  value: boolean | undefined;
  onChange: (v: boolean) => void;
  span?: 1 | 2;
}) {
  return (
    <div className={`${span === 2 ? styles.fieldWide : styles.field} ${styles.segRow}`}>
      <span className={styles.label}>{label}</span>
      <div className={styles.segmented} role="group">
        <button
          type="button"
          className={value === true ? styles.segOn : styles.seg}
          onClick={() => onChange(true)}
        >
          Yes
        </button>
        <button
          type="button"
          className={value === false ? styles.segOn : styles.seg}
          onClick={() => onChange(false)}
        >
          No
        </button>
      </div>
    </div>
  );
}

/* ---------- Sections ---------- */

function PersonalSection({ profile, set }: SectionProps) {
  return (
    <div className={styles.grid}>
      <Text label="First name" value={profile.firstName} onChange={(v) => set('firstName', v)} />
      <Text label="Last name" value={profile.lastName} onChange={(v) => set('lastName', v)} />
      <Text label="Email" type="email" value={profile.email} onChange={(v) => set('email', v)} span={2} />
      <PhoneField profile={profile} set={set} />
      <Text label="Address line 1" value={profile.addressLine1} onChange={(v) => set('addressLine1', v)} span={2} />
      <Text label="Address line 2" value={profile.addressLine2} onChange={(v) => set('addressLine2', v)} span={2} />
      <Text label="City" value={profile.city} onChange={(v) => set('city', v)} />
      <Text label="State / Region" value={profile.state} onChange={(v) => set('state', v)} />
      <Text label="Postal code" value={profile.postalCode} onChange={(v) => set('postalCode', v)} />
      <Text label="Country" value={profile.country} onChange={(v) => set('country', v)} />
    </div>
  );
}

function LinkField({
  icon,
  label,
  value,
  placeholder,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | undefined;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={styles.fieldWide}>
      <span className={styles.label}>
        <span className={styles.linkIcon}>{icon}</span>
        {label}
      </span>
      <input
        className={styles.input}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(normalizeUrl(e.target.value))}
      />
    </div>
  );
}

function LinksSection({ profile, set }: SectionProps) {
  const websites = profile.websites ?? [];
  return (
    <div className={styles.grid}>
      <p className={styles.eeoNote}>Paste links directly. We&apos;ll tidy up the formatting for you.</p>
      <LinkField icon={<IconLinkedIn />} label="LinkedIn" value={profile.linkedinUrl} placeholder="linkedin.com/in/you" onChange={(v) => set('linkedinUrl', v)} />
      <LinkField icon={<IconGitHub />} label="GitHub" value={profile.githubUrl} placeholder="github.com/you" onChange={(v) => set('githubUrl', v)} />
      <LinkField icon={<IconGlobe />} label="Portfolio" value={profile.portfolioUrl} placeholder="your-site.com" onChange={(v) => set('portfolioUrl', v)} />
      <div className={styles.fieldWide}>
        <span className={styles.label}>
          <span className={styles.linkIcon}><IconGlobe /></span>
          Other websites
        </span>
        {websites.map((w, i) => (
          <div key={i} className={styles.row}>
            <input
              className={styles.input}
              value={w}
              placeholder="another-site.com"
              onChange={(e) => {
                const next = [...websites];
                next[i] = e.target.value;
                set('websites', next);
              }}
              onBlur={(e) => {
                const next = [...websites];
                next[i] = normalizeUrl(e.target.value);
                set('websites', next);
              }}
            />
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Remove"
              onClick={() => set('websites', websites.filter((_, idx) => idx !== i))}
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" className={styles.addBtn} onClick={() => set('websites', [...websites, ''])}>
          + Add website
        </button>
      </div>
    </div>
  );
}

function ExperienceSection({ profile, set }: SectionProps) {
  const items = profile.workHistory ?? [];

  function update(i: number, patch: Partial<WorkHistoryEntry>) {
    const next = items.map((e, idx) => (idx === i ? { ...e, ...patch } : e));
    set('workHistory', next);
  }
  function add() {
    const entry: WorkHistoryEntry = {
      id: crypto.randomUUID(),
      company: '',
      title: '',
      startDate: '',
      endDate: null,
      current: false,
      location: '',
      bullets: [],
    };
    set('workHistory', [...items, entry]);
  }
  function remove(i: number) {
    set('workHistory', items.filter((_, idx) => idx !== i));
  }

  const firstJob = items.length === 0;

  return (
    <div className={styles.list}>
      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={firstJob}
          onChange={(ev) => {
            if (!ev.target.checked) add();
          }}
        />
        I&apos;m looking for my first job (no prior experience)
      </label>
      {items.map((e, i) => (
        <div key={e.id ?? i} className={styles.entry}>
          <div className={styles.entryHead}>
            <span className={styles.entryTitle}>{e.title || e.company || `Role ${i + 1}`}</span>
            <button type="button" className={styles.removeLink} onClick={() => remove(i)}>
              Remove
            </button>
          </div>
          <div className={styles.grid}>
            <Text label="Job title" value={e.title} onChange={(v) => update(i, { title: v })} />
            <Text label="Company" value={e.company} onChange={(v) => update(i, { company: v })} />
            <Text label="Location" value={e.location} onChange={(v) => update(i, { location: v })} span={2} />
            <MonthYear label="Start date" value={e.startDate} onChange={(v) => update(i, { startDate: v })} />
            {!e.current && (
              <MonthYear label="End date" value={e.endDate ?? ''} onChange={(v) => update(i, { endDate: v || null })} />
            )}
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={!!e.current}
                onChange={(ev) => update(i, { current: ev.target.checked, endDate: ev.target.checked ? null : e.endDate })}
              />
              I currently work here
            </label>
            <label className={styles.fieldWide}>
              <span className={styles.label}>Highlights (one per line)</span>
              <textarea
                className={styles.textarea}
                rows={4}
                value={(e.bullets ?? []).join('\n')}
                onChange={(ev) => update(i, { bullets: ev.target.value.split('\n').filter((b) => b.trim() !== '') })}
              />
            </label>
          </div>
        </div>
      ))}
      <button type="button" className={styles.addBtn} onClick={add}>
        + Add experience
      </button>
    </div>
  );
}

function EducationSection({ profile, set }: SectionProps) {
  const items = profile.education ?? [];

  function update(i: number, patch: Partial<EducationEntry>) {
    const next = items.map((e, idx) => (idx === i ? { ...e, ...patch } : e));
    set('education', next);
  }
  function add() {
    const entry: EducationEntry = {
      id: crypto.randomUUID(),
      institution: '',
      degree: '',
      fieldOfStudy: '',
      startDate: '',
      endDate: '',
      gpa: '',
    };
    set('education', [...items, entry]);
  }
  function remove(i: number) {
    set('education', items.filter((_, idx) => idx !== i));
  }

  return (
    <div className={styles.list}>
      {items.length === 0 && <p className={styles.empty}>No education yet. Add your most recent qualification.</p>}
      {items.map((e, i) => (
        <div key={e.id ?? i} className={styles.entry}>
          <div className={styles.entryHead}>
            <span className={styles.entryTitle}>{e.institution || `Education ${i + 1}`}</span>
            <button type="button" className={styles.removeLink} onClick={() => remove(i)}>
              Remove
            </button>
          </div>
          <div className={styles.grid}>
            <Text label="School / Institution" value={e.institution} onChange={(v) => update(i, { institution: v })} span={2} />
            <Text label="Degree" value={e.degree} placeholder="BSc" onChange={(v) => update(i, { degree: v })} />
            <Text label="Field of study" value={e.fieldOfStudy} placeholder="Computer Science" onChange={(v) => update(i, { fieldOfStudy: v })} />
            <MonthYear label="Start date" value={e.startDate} onChange={(v) => update(i, { startDate: v })} />
            <MonthYear label="End date" value={e.endDate} onChange={(v) => update(i, { endDate: v })} />
            <Text label="GPA / Grade" value={e.gpa} onChange={(v) => update(i, { gpa: v })} />
          </div>
        </div>
      ))}
      <button type="button" className={styles.addBtn} onClick={add}>
        + Add education
      </button>
    </div>
  );
}

function SkillsSection({ profile, set }: SectionProps) {
  const skills = profile.skills ?? [];
  const [draft, setDraft] = useState('');

  function add() {
    const v = draft.trim();
    if (!v || skills.includes(v)) {
      setDraft('');
      return;
    }
    set('skills', [...skills, v]);
    setDraft('');
  }

  const suggestions = SUGGESTED_SKILLS.filter((s) => !skills.includes(s));

  return (
    <div className={styles.fieldWide}>
      <span className={styles.label}>What skills do you have or enjoy working with?</span>
      <p className={styles.hint}>We use these to match you to roles and tailor applications.</p>
      <div className={styles.chips}>
        {skills.map((s, i) => (
          <span key={`${s}-${i}`} className={styles.chip}>
            {s}
            <button type="button" aria-label={`Remove ${s}`} onClick={() => set('skills', skills.filter((_, idx) => idx !== i))}>
              ✕
            </button>
          </span>
        ))}
        {skills.length === 0 && <span className={styles.hint}>No skills yet. Add your own or pick from below.</span>}
      </div>
      <div className={styles.row}>
        <input
          className={styles.input}
          value={draft}
          placeholder="Type a skill and press Enter"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className={styles.addBtn} onClick={add}>
          Add
        </button>
      </div>
      {suggestions.length > 0 && (
        <div className={styles.suggested}>
          <span className={styles.hint}>Popular skills</span>
          <div className={styles.chips}>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className={styles.suggestChip}
                onClick={() => set('skills', [...skills, s])}
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WorkAuthSection({ profile, set }: SectionProps) {
  const immediate =
    profile.availableStartDate === 'Immediately' || profile.availableStartDate === todayIso();
  const startDateValue =
    profile.availableStartDate === 'Immediately' ? todayIso() : profile.availableStartDate ?? '';
  const noNotice = profile.noticePeriod === 'None';

  return (
    <div className={styles.grid}>
      <Text label="Work authorization" value={profile.workAuthorization} placeholder="e.g. UK citizen, US H-1B" onChange={(v) => set('workAuthorization', v)} span={2} />
      <Segmented
        label="Will you now or in the future require visa sponsorship?"
        value={profile.requiresSponsorship}
        onChange={(v) => set('requiresSponsorship', v)}
      />
      <Text
        label="Years of experience"
        type="number"
        value={profile.yearsExperience != null ? String(profile.yearsExperience) : ''}
        onChange={(v) => set('yearsExperience', v ? Number(v) : undefined)}
      />

      <div className={styles.fieldWide}>
        <span className={styles.label}>Availability</span>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={immediate}
            onChange={(e) => set('availableStartDate', e.target.checked ? todayIso() : '')}
          />
          Available to start immediately
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Available start date</span>
          <input
            type="date"
            className={styles.input}
            value={startDateValue}
            disabled={immediate}
            onChange={(e) => set('availableStartDate', e.target.value)}
          />
        </label>
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={noNotice}
            onChange={(e) => set('noticePeriod', e.target.checked ? 'None' : '')}
          />
          No notice period (currently unemployed)
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Notice period</span>
          <input
            className={styles.input}
            value={profile.noticePeriod ?? ''}
            disabled={noNotice}
            placeholder="e.g. 2 weeks"
            onChange={(e) => set('noticePeriod', e.target.value)}
          />
        </label>
      </div>

      <Text label="Desired salary" value={profile.desiredSalary} placeholder="£65,000" onChange={(v) => set('desiredSalary', v)} />
      <Text label="Current title" value={profile.currentTitle} onChange={(v) => set('currentTitle', v)} />
      <Text label="Current company" value={profile.currentCompany} onChange={(v) => set('currentCompany', v)} />
    </div>
  );
}

function EeoSection({ profile, set }: SectionProps) {
  const ethnicity = profile.eeoEthnicity ?? [];
  return (
    <div className={styles.grid}>
      <p className={styles.eeoNote}>
        These fields are optional and used only to autofill voluntary equal-opportunity questions.
      </p>
      <Select label="Gender" value={profile.eeoGender} options={GENDER_OPTIONS} onChange={(v) => set('eeoGender', v)} />
      <Select label="Veteran status" value={profile.eeoVeteranStatus} options={VETERAN_OPTIONS} onChange={(v) => set('eeoVeteranStatus', v)} />
      <Select label="Disability status" value={profile.eeoDisabilityStatus} options={DISABILITY_OPTIONS} onChange={(v) => set('eeoDisabilityStatus', v)} />
      <div className={styles.fieldWide}>
        <span className={styles.label}>Race / Ethnicity</span>
        <div className={styles.checkGroup}>
          {ETHNICITY_OPTIONS.map((opt) => (
            <label key={opt} className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={ethnicity.includes(opt)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...ethnicity, opt]
                    : ethnicity.filter((x) => x !== opt);
                  set('eeoEthnicity', next);
                }}
              />
              {opt}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function CvSection({
  profile,
  set,
  merge,
}: SectionProps & { merge: (patch: Partial<Profile>) => void }) {
  const [key, setKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const k = getAnthropicKey();
    if (k) {
      setKey(k);
      setKeySaved(true);
    }
  }, []);

  function saveKey() {
    const trimmed = key.trim();
    if (trimmed && !trimmed.startsWith('sk-ant-')) {
      setError('Anthropic keys start with "sk-ant-". Double-check what you pasted.');
      return;
    }
    persistAnthropicKey(trimmed || null);
    setKeySaved(!!trimmed);
    setError('');
    setStatus(trimmed ? 'Key saved on this device.' : 'Key cleared.');
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setStatus('');
    setBusy(true);
    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      // Store the file itself for sync only when it is small enough.
      if (file.size <= STORE_BLOB_MAX) {
        const dataUrl = await fileToDataUrl(file);
        set('cvFile', {
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl,
          uploadedAt: Date.now(),
        });
      }

      if (!isPdf) {
        setStatus(`Saved ${file.name}. Auto-fill from text works best with a PDF.`);
        return;
      }

      setStatus('Reading your resume…');
      const text = await extractPdfText(file);
      set('baseCvText', text);

      if (!getAnthropicKey()) {
        setStatus(`Imported ${text.length.toLocaleString()} characters. Add your AI key above to auto-fill your profile.`);
        return;
      }

      setStatus('Asking Claude to read your resume…');
      const parsed = await parseCv(text);
      if (parsed === 'needsKey') {
        setStatus('Imported the text. Add a valid AI key above to auto-fill the rest.');
        return;
      }
      const patch: Partial<Profile> = {};
      if (parsed.websites?.length) patch.websites = parsed.websites;
      if (parsed.skills?.length) patch.skills = parsed.skills;
      if (parsed.workHistory?.length) patch.workHistory = parsed.workHistory as WorkHistoryEntry[];
      if (parsed.education?.length) patch.education = parsed.education as EducationEntry[];
      const firstJob = (parsed.workHistory?.[0] ?? null) as { title?: string; company?: string } | null;
      if (firstJob?.title && !profile.currentTitle) patch.currentTitle = firstJob.title;
      if (firstJob?.company && !profile.currentCompany) patch.currentCompany = firstJob.company;
      merge(patch);

      const counts = `${parsed.workHistory?.length ?? 0} roles · ${parsed.education?.length ?? 0} education · ${parsed.skills?.length ?? 0} skills`;
      setStatus(`Imported ${counts}. Review the other tabs.`);
    } catch (err) {
      setError(`Could not read that file: ${(err as Error).message}`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const onFile = profile.cvFile;
  const hasText = !!profile.baseCvText;

  return (
    <div className={styles.cv}>
      <div className={styles.field}>
        <span className={styles.label}>Anthropic API key</span>
        <p className={styles.hint}>
          Used only to read your resume. Stored on this device and sent only with AI requests. Get one
          at{' '}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
            console.anthropic.com
          </a>
          .
        </p>
        <div className={styles.row}>
          <input
            type="password"
            className={styles.input}
            value={key}
            placeholder="sk-ant-…"
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => setKey(e.target.value)}
          />
          <button type="button" className={styles.addBtn} onClick={saveKey}>
            {keySaved ? 'Update' : 'Save'}
          </button>
        </div>
      </div>

      <label className={styles.dropzone}>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf"
          onChange={handleFile}
          className={styles.hiddenInput}
          disabled={busy}
        />
        <span className={styles.dropTitle}>{busy ? 'Working…' : 'Upload your resume'}</span>
        <span className={styles.dropHint}>
          We parse it and prefill your profile. PDF, DOC, DOCX up to 5 MB. PDF recommended.
        </span>
      </label>

      {(onFile || hasText) && (
        <div className={styles.onFile}>
          <div>
            <p className={styles.onFileTitle}>Resume on file</p>
            <p className={styles.hint}>
              {onFile ? onFile.name : 'Imported from a large file (text only)'}
              {onFile?.uploadedAt
                ? ` · ${new Date(onFile.uploadedAt).toLocaleDateString()}`
                : ''}
            </p>
          </div>
        </div>
      )}

      {status && <p className={styles.cvStatus}>{status}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const text =
    state === 'saving'
      ? 'Saving…'
      : state === 'saved'
        ? 'All changes saved'
        : state === 'error'
          ? 'Save failed — retrying on next change'
          : 'Autosaves as you type';
  return <span className={`${styles.saveIndicator} ${state === 'error' ? styles.saveError : ''}`}>{text}</span>;
}
