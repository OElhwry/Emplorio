import { useEffect, useRef, useState } from 'react';
import {
  clearQuestionAnswers,
  deleteApplication,
  findApplicationByUrl,
  loadApplications,
  loadLastCoverLetter,
  loadProfile,
  loadQuestionAnswers,
  saveLastCoverLetter,
  saveQuestionAnswers,
  upsertApplication,
  type ApplicationStatus,
  type TrackedApplication,
} from '../lib/storage.js';
import { ProfilePanel } from './ProfilePanel.js';
import { Onboarding, isOnboardingComplete } from './Onboarding.js';
import { AuthPanel } from './AuthPanel.js';
import { SettingsPanel } from './SettingsPanel.js';
import { applyTheme, loadTheme, saveTheme, type Theme } from '../lib/theme.js';
import { clearSession, loadSession, setCachedToken, type Session } from '../lib/auth.js';
import {
  clearLocalUserData,
  deleteRemoteApplication,
  pushApplications,
  pushProfile,
  syncOnLogin,
} from '../lib/sync.js';
import { registerSyncHooks } from '../lib/syncHooks.js';

import { apiFetch } from '../lib/api.js';
import { profileCompleteness } from '../lib/completeness.js';
import {
  IconCalendar,
  IconCheck,
  IconDownload,
  IconExternal,
  IconLightbulb,
  IconMail,
  IconMonitor,
  IconMoon,
  IconPause,
  IconPlay,
  IconPower,
  IconSettings,
  IconSparkles,
  IconSpinner,
  IconStar,
  IconSun,
} from './icons.js';

function isNeedsKey(res: Response): boolean {
  return res.status === 402;
}

type StatusKind = 'info' | 'success' | 'error';
interface StatusMsg {
  text: string;
  kind: StatusKind;
}
function statusOf(s: StatusMsg | string | null): StatusMsg | null {
  if (!s) return null;
  if (typeof s === 'string') return { text: s, kind: 'info' };
  return s;
}

registerSyncHooks({
  onProfileSaved: (p) => void pushProfile(p),
  onAppsSaved: (apps) => void pushApplications(apps),
  onAppDeleted: (id) => void deleteRemoteApplication(id),
});

type Tab = 'fill' | 'cover' | 'questions' | 'history' | 'profile' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'fill', label: 'Fill' },
  { id: 'cover', label: 'Cover' },
  { id: 'questions', label: 'Questions' },
  { id: 'history', label: 'History' },
  { id: 'profile', label: 'Profile' },
];

const ACTIVE_TAB_KEY = 'emplorioActiveTab';
const VALID_TABS: ReadonlySet<Tab> = new Set<Tab>(['fill', 'cover', 'questions', 'history', 'profile', 'settings']);

export function App() {
  const [tab, setTabState] = useState<Tab>('fill');
  const [tabReady, setTabReady] = useState(false);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');
  const [highlightAi, setHighlightAi] = useState(false);
  // Whether the user has finished the web onboarding tutorial (synced via profile).
  const [tutorialDone, setTutorialDone] = useState<boolean | null>(null);

  function setTab(next: Tab) {
    setTabState(next);
    void chrome.storage.local.set({ [ACTIVE_TAB_KEY]: next });
  }

  function goToSettings() {
    setHighlightAi(true);
    setTab('settings');
  }

  async function refreshTutorialDone() {
    const p = (await loadProfile().catch(() => null)) as { tutorialCompletedAt?: string } | null;
    setTutorialDone(!!p?.tutorialCompletedAt);
  }

  useEffect(() => {
    void chrome.storage.local.get(ACTIVE_TAB_KEY).then((r) => {
      const saved = r[ACTIVE_TAB_KEY] as Tab | undefined;
      if (saved && VALID_TABS.has(saved)) setTabState(saved);
      setTabReady(true);
    });
    void isOnboardingComplete().then(setOnboarded);
    void refreshTutorialDone();
    void loadSession().then(async (s) => {
      setSession(s);
      setCachedToken(s?.token ?? null);
      setAuthReady(true);
      if (s) {
        // Background: pull latest from server every popup open (no UI block)
        void syncOnLogin().then(() => {
          void isOnboardingComplete().then(setOnboarded);
          void refreshTutorialDone();
        });
      }
    });
    void loadTheme().then((t) => {
      setTheme(t);
      applyTheme(t);
    });
  }, []);

  function cycleTheme() {
    const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
    applyTheme(next);
    void saveTheme(next);
  }
  const ThemeIcon = theme === 'dark' ? IconMoon : theme === 'light' ? IconSun : IconMonitor;
  const themeTitle = `Theme: ${theme} (click to cycle)`;

  async function signOut() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // best effort
    }
    await clearSession();
    setCachedToken(null);
    await clearLocalUserData();
    setSession(null);
    setOnboarded(false);
  }

  if (onboarded === null || !authReady || !tabReady) {
    return <main style={styles.main} />;
  }
  if (!session) {
    return (
      <main style={styles.main}>
        <AuthPanel
          onSignedIn={async (s) => {
            setSession(s);
            await syncOnLogin();
            // Re-check onboarding in case the just-pulled profile has firstName/email
            setOnboarded(await isOnboardingComplete());
          }}
        />
      </main>
    );
  }
  if (!onboarded) {
    return (
      <main style={styles.main}>
        <Onboarding onDone={() => setOnboarded(true)} />
      </main>
    );
  }

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={styles.logoMark}>
            <img src="/icon-light.png" alt="" className="popup-logo popup-logo-light" />
            <img src="/icon-dark.png" alt="" className="popup-logo popup-logo-dark" />
          </span>
          <h1 style={styles.title}>Emplorio</h1>
          <div style={styles.headerActions}>
            <button
              onClick={() => chrome.tabs.create({ url: 'https://emplorio.co.uk/dashboard' })}
              className="icon-btn"
              title="Open Emplorio on the web"
              aria-label="Open Emplorio on the web"
            >
              <IconExternal />
            </button>
            <button
              onClick={() => {
                setTab('settings');
                setHighlightAi(false);
              }}
              className={`icon-btn ${tab === 'settings' ? 'active' : ''}`}
              title="Settings"
              aria-label="Settings"
            >
              <IconSettings />
            </button>
            <button onClick={cycleTheme} className="icon-btn" title={themeTitle} aria-label="Toggle theme">
              <ThemeIcon />
            </button>
            <button
              onClick={signOut}
              className="icon-btn icon-btn-danger"
              title={`Signed in as ${session.email}. Click to sign out.`}
              aria-label="Sign out"
            >
              <IconPower />
            </button>
          </div>
        </div>
        <nav style={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setHighlightAi(false);
              }}
              className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      {tutorialDone === false && (
        <div className="setup-banner">
          <div className="setup-banner-head">
            <IconLightbulb size={15} />
            <strong>Finish setting up on the web</strong>
          </div>
          <p className="setup-banner-text">
            Run the quick tutorial so you know how filling, cover letters, and question answers work.
          </p>
          <div className="setup-checklist">
            <span className="setup-item done">
              <IconCheck size={12} /> Account created
            </span>
            <span className="setup-item todo">
              <span className="setup-ring" /> Tutorial completed
            </span>
          </div>
          <button
            type="button"
            className="btn-primary btn-with-icon setup-banner-btn"
            onClick={() => chrome.tabs.create({ url: 'https://emplorio.co.uk/tutorial' })}
          >
            <IconExternal size={14} /> Finish on the web
          </button>
        </div>
      )}
      {tab === 'fill' && <FillPanel />}
      {tab === 'cover' && <CoverPanel onNeedKey={goToSettings} />}
      {tab === 'questions' && <QuestionsPanel onNeedKey={goToSettings} />}
      {tab === 'history' && <HistoryPanel onNeedKey={goToSettings} />}
      {tab === 'profile' && <ProfilePanel onNeedKey={goToSettings} />}
      {tab === 'settings' && (
        <SettingsPanel
          highlightAi={highlightAi}
          sessionEmail={session.email}
          onSignOut={signOut}
        />
      )}
    </main>
  );
}

function FillPanel() {
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [existing, setExisting] = useState<TrackedApplication | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [completeness, setCompleteness] = useState<{ filled: number; total: number; missing: string[] } | null>(null);

  useEffect(() => {
    void chrome.storage.local
      .get(['emplorioFillPaused'])
      .then((r) => setPaused(!!r.emplorioFillPaused));
    void refreshExisting();
    void loadProfile().then((p) => setCompleteness(profileCompleteness(p as Record<string, unknown> | null)));
  }, []);

  async function refreshExisting() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;
    setCurrentUrl(tab.url);
    setExisting(await findApplicationByUrl(tab.url));
  }

  async function togglePause() {
    const next = !paused;
    await chrome.storage.local.set({ emplorioFillPaused: next });
    setPaused(next);
  }

  async function scrapeMeta(): Promise<{ company: string; role: string; jobDescription: string } | null> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return null;
    try {
      return await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_JOB' });
    } catch {
      return null;
    }
  }

  async function saveForLater() {
    if (!currentUrl) return setStatus('No active tab.');
    const meta = await scrapeMeta();
    const entry = await upsertApplication({
      url: currentUrl,
      company: meta?.company ?? existing?.company ?? '',
      role: meta?.role ?? existing?.role ?? '',
      status: 'saved',
      savedAt: existing?.savedAt ?? Date.now(),
    });
    setExisting(entry);
    setStatus('Saved to History.');
  }

  async function unsave() {
    if (!existing) return;
    await deleteApplication(existing.id);
    setExisting(null);
    setStatus('Removed from History.');
  }

  async function fill() {
    setBusy(true);
    setStatus('');
    await chrome.storage.local.set({ emplorioFillPaused: false });
    setPaused(false);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return setStatus('No active tab.');
      const res = await chrome.tabs.sendMessage(tab.id, { type: 'FILL' });
      if (!res) return setStatus('Page not supported.');
      const meta = await scrapeMeta();
      if (tab.url) {
        const entry = await upsertApplication({
          url: tab.url,
          company: meta?.company ?? existing?.company ?? '',
          role: meta?.role ?? existing?.role ?? '',
          status: 'applied',
          savedAt: existing?.savedAt,
          appliedAt: existing?.appliedAt ?? Date.now(),
        });
        setExisting(entry);
      }
      setStatus(`Filled ${res.filled} field${res.filled === 1 ? '' : 's'}.`);
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={styles.panel}>
      {existing && (
        <div className={`banner ${existing.status === 'applied' ? 'success' : 'info'}`}>
          <strong className="banner-title">
            {existing.status === 'applied' ? <IconCheck /> : <IconStar filled />}
            {existing.status === 'applied'
              ? `Already applied · ${existing.appliedAt ? relativeDays(existing.appliedAt) : ''}`
              : `Saved ${existing.savedAt ? relativeDays(existing.savedAt) : 'recently'}`}
          </strong>
          {(existing.role || existing.company) && (
            <span style={styles.bannerSub}>
              {[existing.role, existing.company].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
      )}
      <p style={styles.helperText}>Open a job page, then fill the form.</p>
      {completeness && completeness.filled < completeness.total && (
        <div className="banner info profile-tip">
          <strong className="banner-title">
            <IconLightbulb />
            Profile {Math.round((completeness.filled / completeness.total) * 100)}% complete
          </strong>
          <span style={styles.bannerSub}>
            Add{' '}
            {completeness.missing.slice(0, 3).join(', ')}
            {completeness.missing.length > 3 ? ` +${completeness.missing.length - 3} more` : ''}{' '}
            in Profile to fill more fields and finish applications faster.
          </span>
        </div>
      )}
      <button onClick={fill} disabled={busy} className="btn-primary btn-with-icon">
        {busy && <IconSpinner />}
        {busy ? 'Filling…' : 'Fill this form'}
      </button>
      {busy && (
        <button onClick={togglePause} className="btn-secondary btn-with-icon">
          {paused ? <IconPlay /> : <IconPause />}
          {paused ? 'Resume' : 'Pause'}
        </button>
      )}
      {!busy && existing?.status !== 'applied' && (
        <button
          onClick={existing?.status === 'saved' ? unsave : saveForLater}
          className={`btn-secondary btn-with-icon${existing?.status === 'saved' ? ' is-saved' : ''}`}
        >
          <IconStar filled={existing?.status === 'saved'} />
          {existing?.status === 'saved' ? 'Saved. Click to remove' : 'Save for later'}
        </button>
      )}
      {status && <StatusLine status={status} />}
      <div className="card" style={styles.shortcuts}>
        <div style={styles.shortcutsHead}>Keyboard shortcuts</div>
        <div style={styles.shortcutRow}>
          <span><kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>E</kbd></span>
          <span style={styles.shortcutDesc}>Open Emplorio</span>
        </div>
        <div style={styles.shortcutRow}>
          <span><kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>F</kbd></span>
          <span style={styles.shortcutDesc}>Fill / pause / resume</span>
        </div>
        <div style={styles.shortcutRow}>
          <span><kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>S</kbd></span>
          <span style={styles.shortcutDesc}>Save current page</span>
        </div>
        <div style={styles.shortcutsFoot}>
          Customise at <code>chrome://extensions/shortcuts</code>
        </div>
      </div>
    </section>
  );
}

function CoverPanel({ onNeedKey }: { onNeedKey: () => void }) {
  const [tone, setTone] = useState<'friendly' | 'formal' | 'enthusiastic' | 'concise'>('friendly');
  const [text, setText] = useState('');
  const [meta, setMeta] = useState<{ company: string; role: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void loadLastCoverLetter().then((saved) => {
      if (saved) {
        setText(saved.text);
        setMeta({ company: saved.company, role: saved.role });
        setTone(saved.tone as typeof tone);
      }
    });
  }, []);

  async function generate() {
    setBusy(true);
    setText('');
    setMeta(null);
    setStatus('');
    abortRef.current = new AbortController();
    let accumulated = '';

    try {
      const raw = await loadProfile();
      if (!raw) {
        setStatus('Set up your profile first.');
        return;
      }
      const profile = Object.fromEntries(
        Object.entries(raw).filter(([k, v]) => v !== '' && v != null && k !== 'cvFile'),
      );

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return setStatus('No active tab.');

      let job;
      try {
        job = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_JOB' });
      } catch {
        setStatus('Open a supported job page (Greenhouse, Lever, Workday, Ashby).');
        return;
      }
      if (!job?.jobDescription || job.jobDescription.length < 50) {
        return setStatus('Could not find a job description on this page.');
      }

      const res = await apiFetch(`/generate/cover-letter`, {
        method: 'POST',
        signal: abortRef.current.signal,
        body: JSON.stringify({
          profile,
          jobDescription: job.jobDescription,
          company: job.company,
          role: job.role,
          tone,
        }),
      });

      if (isNeedsKey(res)) {
        setStatus('Add your Anthropic key in Settings to generate cover letters.');
        onNeedKey();
        return;
      }
      if (!res.ok || !res.body) {
        setStatus(`API error: ${res.status}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim());
            if (evt.delta) {
              accumulated += evt.delta;
              setText(accumulated);
            }
            if (evt.error) setStatus(`Error: ${evt.error}`);
          } catch {
            // skip malformed
          }
        }
      }

      if (accumulated) {
        setMeta({ company: job.company, role: job.role });
        await saveLastCoverLetter({
          text: accumulated,
          company: job.company,
          role: job.role,
          url: job.url,
          tone,
          createdAt: Date.now(),
        });
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    void navigator.clipboard.writeText(text);
    setStatus('Copied.');
  }

  return (
    <section style={styles.panel}>
      <label style={styles.label}>
        <span style={styles.labelText}>Tone</span>
        <select value={tone} onChange={(e) => setTone(e.target.value as typeof tone)}>
          <option value="friendly">Friendly</option>
          <option value="formal">Formal</option>
          <option value="enthusiastic">Enthusiastic</option>
          <option value="concise">Concise</option>
        </select>
      </label>
      <button onClick={generate} disabled={busy} className="btn-primary btn-with-icon">
        {busy ? <IconSpinner /> : <IconSparkles />}
        {busy ? 'Generating…' : 'Generate cover letter'}
      </button>
      {text && (
        <>
          {meta && (
            <p style={styles.helperText}>
              {meta.role} · {meta.company}
            </p>
          )}
          <textarea
            value={text}
            onChange={(e) => {
              const v = e.target.value;
              setText(v);
              if (meta) {
                void saveLastCoverLetter({
                  text: v,
                  company: meta.company,
                  role: meta.role,
                  url: '',
                  tone,
                  createdAt: Date.now(),
                });
              }
            }}
            rows={12}
          />
          <button onClick={copy} className="btn-secondary">
            Copy
          </button>
        </>
      )}
      {status && <StatusLine status={status} />}
    </section>
  );
}

function relativeDays(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function daysUntil(iso: string): number | null {
  const t = Date.parse(iso);
  if (isNaN(t)) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Math.round((t - start.getTime()) / 86_400_000);
}

function ApplicationRow({
  app,
  onChange,
  onDelete,
  onNeedKey,
}: {
  app: TrackedApplication;
  onChange: (patch: Partial<TrackedApplication>) => Promise<void>;
  onDelete: () => Promise<void>;
  onNeedKey: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(app);
  const [followUp, setFollowUp] = useState<{ subject: string; body: string } | null>(null);
  const [followUpBusy, setFollowUpBusy] = useState(false);
  const [followUpError, setFollowUpError] = useState('');

  useEffect(() => {
    setDraft(app);
  }, [app]);

  async function save() {
    await onChange({
      role: draft.role,
      company: draft.company,
      url: draft.url,
      notes: draft.notes,
      interviewDate: draft.interviewDate,
    });
    setEditing(false);
  }

  async function draftFollowUp() {
    setFollowUpBusy(true);
    setFollowUpError('');
    try {
      const raw = await loadProfile();
      if (!raw) {
        setFollowUpError('Set up your profile first.');
        return;
      }
      const profile = Object.fromEntries(
        Object.entries(raw).filter(([k, v]) => v !== '' && v != null && k !== 'cvFile'),
      );
      const days = app.appliedAt
        ? Math.floor((Date.now() - app.appliedAt) / 86_400_000)
        : 7;
      const res = await apiFetch(`/generate/follow-up`, {
        method: 'POST',
        body: JSON.stringify({
          profile,
          company: app.company || 'the company',
          role: app.role || 'the role',
          daysSinceApplied: days,
          notes: app.notes,
        }),
      });
      if (isNeedsKey(res)) {
        setFollowUpError('Add your Anthropic key in Settings to draft follow-ups.');
        onNeedKey();
        return;
      }
      if (!res.ok) {
        setFollowUpError(`API error: ${res.status}`);
        return;
      }
      const data = (await res.json()) as { subject: string; body: string };
      setFollowUp(data);
    } catch (err) {
      setFollowUpError(`Error: ${(err as Error).message}`);
    } finally {
      setFollowUpBusy(false);
    }
  }

  async function copyFollowUp() {
    if (!followUp) return;
    await navigator.clipboard.writeText(`Subject: ${followUp.subject}\n\n${followUp.body}`);
  }

  async function markFollowUpSent() {
    await onChange({ followUpSentAt: Date.now() });
    setFollowUp(null);
  }

  const upcoming = app.interviewDate ? daysUntil(app.interviewDate) : null;
  const stale = app.status === 'saved' && app.savedAt && Date.now() - app.savedAt > 7 * 86_400_000;
  const daysSinceApplied = app.appliedAt
    ? Math.floor((Date.now() - app.appliedAt) / 86_400_000)
    : null;
  const needsFollowUp =
    app.status === 'applied' &&
    daysSinceApplied != null &&
    daysSinceApplied >= 7 &&
    !app.followUpSentAt;

  return (
    <div className="card" style={styles.appRow}>
      <div style={styles.appHead}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <>
              <input
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                placeholder="Role"
              />
              <input
                value={draft.company}
                onChange={(e) => setDraft({ ...draft, company: e.target.value })}
                placeholder="Company"
                style={{ marginTop: 4 }}
              />
            </>
          ) : (
            <>
              <div style={styles.appTitle}>{app.role || 'Untitled role'}</div>
              <div style={styles.helperText}>{app.company || 'Unknown company'}</div>
            </>
          )}
        </div>
        <button onClick={() => (editing ? save() : setEditing(true))} className="btn-link">
          {editing ? 'Save' : 'Edit'}
        </button>
        <button onClick={onDelete} className="btn-link danger">
          Delete
        </button>
      </div>

      <div style={styles.metaRow}>
        <span className={`status-dot ${app.status}`} />
        <span style={styles.metaText}>
          {app.status} ·{' '}
          {app.appliedAt
            ? `applied ${relativeDays(app.appliedAt)}`
            : app.savedAt
              ? `saved ${relativeDays(app.savedAt)}`
              : relativeDays(app.updatedAt)}
        </span>
      </div>

      {upcoming != null && (
        <div className={`banner banner-row ${upcoming <= 3 ? 'warn' : 'info'}`}>
          <IconCalendar />
          <span>
            Interview{' '}
            {upcoming < 0
              ? `was ${-upcoming}d ago`
              : upcoming === 0
                ? 'today'
                : upcoming === 1
                  ? 'tomorrow'
                  : `in ${upcoming}d`}{' '}
            ({app.interviewDate})
          </span>
        </div>
      )}
      {stale && !editing && (
        <div className="banner banner-row info">
          <IconStar />
          <span>Saved {relativeDays(app.savedAt!)}. Still want to apply?</span>
        </div>
      )}
      {needsFollowUp && !followUp && !editing && (
        <div className="banner warn followup-banner">
          <span className="banner-row-inline">
            <IconMail />
            Applied {daysSinceApplied}d ago, no reply. Send a follow-up?
          </span>
          <button
            onClick={draftFollowUp}
            disabled={followUpBusy}
            className="btn-small btn-with-icon"
          >
            {followUpBusy ? <IconSpinner /> : <IconSparkles />}
            {followUpBusy ? 'Drafting…' : 'Draft follow-up'}
          </button>
        </div>
      )}
      {app.followUpSentAt && !editing && (
        <div className="banner banner-row success">
          <IconCheck />
          <span>Follow-up sent {relativeDays(app.followUpSentAt)}</span>
        </div>
      )}
      {followUpError && <div className="banner warn">{followUpError}</div>}
      {followUp && (
        <div className="card followup-draft">
          <div className="followup-subject">
            <span className="field-label">Subject</span>
            <input
              value={followUp.subject}
              onChange={(e) => setFollowUp({ ...followUp, subject: e.target.value })}
            />
          </div>
          <textarea
            value={followUp.body}
            onChange={(e) => setFollowUp({ ...followUp, body: e.target.value })}
            rows={8}
          />
          <div className="followup-actions">
            <button onClick={copyFollowUp} className="btn-secondary">Copy</button>
            <button onClick={markFollowUpSent} className="btn-primary">Mark as sent</button>
            <button onClick={() => setFollowUp(null)} className="btn-link">Cancel</button>
          </div>
        </div>
      )}

      {editing ? (
        <>
          <input
            value={draft.url ?? ''}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            placeholder="URL"
          />
          <input
            type="date"
            value={draft.interviewDate ?? ''}
            onChange={(e) => setDraft({ ...draft, interviewDate: e.target.value })}
          />
          <textarea
            value={draft.notes ?? ''}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Notes (recruiter, salary, follow-ups…)"
            rows={3}
          />
        </>
      ) : (
        app.notes && <div style={styles.notesBox}>{app.notes}</div>
      )}

      <div style={styles.appActions}>
        {app.url && (
          <button onClick={() => chrome.tabs.create({ url: app.url })} className="btn-small btn-with-icon">
            <IconExternal />
            Open
          </button>
        )}
        <select
          value={app.status}
          onChange={(e) => void onChange({ status: e.target.value as ApplicationStatus })}
          style={{ ...styles.statusSelect }}
        >
          <option value="saved">saved</option>
          <option value="applied">applied</option>
          <option value="interview">interview</option>
          <option value="offer">offer</option>
          <option value="rejected">rejected</option>
        </select>
      </div>
    </div>
  );
}

interface Insights {
  appliedThisWeek: number;
  appliedThisMonth: number;
  lastAppliedAt: number | null;
  responseRate: number | null;
  offerRate: number | null;
  medianResponseDays: number | null;
  topCompany: { name: string; count: number } | null;
}

function computeInsights(items: TrackedApplication[]): Insights {
  const now = Date.now();
  const weekAgo = now - 7 * 86_400_000;
  const monthAgo = now - 30 * 86_400_000;
  const applied = items.filter((a) => a.appliedAt);
  const appliedThisWeek = applied.filter((a) => a.appliedAt! >= weekAgo).length;
  const appliedThisMonth = applied.filter((a) => a.appliedAt! >= monthAgo).length;
  const lastAppliedAt = applied.length
    ? Math.max(...applied.map((a) => a.appliedAt!))
    : null;

  const responded = items.filter(
    (a) => a.appliedAt && (a.status === 'interview' || a.status === 'offer' || a.status === 'rejected'),
  );
  const positive = items.filter(
    (a) => a.appliedAt && (a.status === 'interview' || a.status === 'offer'),
  );
  const offers = items.filter((a) => a.status === 'offer');
  const interviewed = items.filter(
    (a) => a.status === 'interview' || a.status === 'offer',
  );
  const responseRate = applied.length ? positive.length / applied.length : null;
  const offerRate = interviewed.length ? offers.length / interviewed.length : null;

  const responseDays = responded
    .map((a) => Math.round((a.updatedAt - a.appliedAt!) / 86_400_000))
    .filter((d) => d >= 0)
    .sort((a, b) => a - b);
  const medianResponseDays = responseDays.length
    ? responseDays[Math.floor(responseDays.length / 2)] ?? null
    : null;

  const companyCounts = new Map<string, number>();
  for (const a of items) {
    const c = (a.company || '').trim();
    if (!c) continue;
    companyCounts.set(c, (companyCounts.get(c) ?? 0) + 1);
  }
  let topCompany: { name: string; count: number } | null = null;
  for (const [name, count] of companyCounts) {
    if (count >= 2 && (!topCompany || count > topCompany.count)) {
      topCompany = { name, count };
    }
  }

  return {
    appliedThisWeek,
    appliedThisMonth,
    lastAppliedAt,
    responseRate,
    offerRate,
    medianResponseDays,
    topCompany,
  };
}

function pct(v: number | null): string {
  return v == null ? '—' : `${Math.round(v * 100)}%`;
}

function InsightsBox({ insights }: { insights: Insights }) {
  const idle =
    insights.lastAppliedAt && Date.now() - insights.lastAppliedAt > 7 * 86_400_000
      ? Math.floor((Date.now() - insights.lastAppliedAt) / 86_400_000)
      : null;
  return (
    <div className="card insights">
      <div className="insights-head">Insights</div>
      <div className="insights-grid">
        <div className="insight">
          <div className="insight-num">{insights.appliedThisWeek}</div>
          <div className="insight-label">This Week</div>
        </div>
        <div className="insight">
          <div className="insight-num">{insights.appliedThisMonth}</div>
          <div className="insight-label">Past 30D</div>
        </div>
        <div className="insight">
          <div className="insight-num">{pct(insights.responseRate)}</div>
          <div className="insight-label">Response Rate</div>
        </div>
        <div className="insight">
          <div className="insight-num">{pct(insights.offerRate)}</div>
          <div className="insight-label">Offer Rate</div>
        </div>
        <div className="insight">
          <div className="insight-num">
            {insights.medianResponseDays == null ? '—' : `${insights.medianResponseDays}d`}
          </div>
          <div className="insight-label">Median Reply</div>
        </div>
        <div className="insight">
          <div className="insight-num">
            {insights.topCompany ? insights.topCompany.count : '—'}
          </div>
          <div className="insight-label">
            {insights.topCompany ? insights.topCompany.name.slice(0, 14) : 'Top Company'}
          </div>
        </div>
      </div>
      {idle != null && (
        <div className="insights-nudge">
          Nothing applied in {idle} days — momentum keeps recruiters warm.
        </div>
      )}
    </div>
  );
}

function isoOrEmpty(ts?: number): string {
  return ts ? new Date(ts).toISOString().slice(0, 10) : '';
}

function csvCell(v: string | number | undefined | null): string {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportApplicationsCsv(items: TrackedApplication[]) {
  const headers = [
    'Role',
    'Company',
    'Status',
    'URL',
    'Saved',
    'Applied',
    'Interview date',
    'Follow-up sent',
    'Notes',
    'Updated',
  ];
  const rows = items.map((a) =>
    [
      a.role,
      a.company,
      a.status,
      a.url,
      isoOrEmpty(a.savedAt),
      isoOrEmpty(a.appliedAt),
      a.interviewDate ?? '',
      isoOrEmpty(a.followUpSentAt),
      a.notes ?? '',
      isoOrEmpty(a.updatedAt),
    ]
      .map(csvCell)
      .join(','),
  );
  const csv = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `emplorio-applications-${stamp}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function HistoryPanel({ onNeedKey }: { onNeedKey: () => void }) {
  const [items, setItems] = useState<TrackedApplication[]>([]);
  const [filter, setFilter] = useState<'all' | ApplicationStatus>('all');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{
    role: string;
    company: string;
    url: string;
    notes: string;
    status: ApplicationStatus;
  }>({ role: '', company: '', url: '', notes: '', status: 'saved' });

  useEffect(() => {
    void loadApplications().then(setItems);
  }, []);

  async function submitDraft() {
    if (!draft.role && !draft.company) return;
    await upsertApplication({
      role: draft.role,
      company: draft.company,
      url: draft.url,
      notes: draft.notes || undefined,
      status: draft.status,
      savedAt: draft.status === 'saved' ? Date.now() : undefined,
      appliedAt: draft.status === 'applied' ? Date.now() : undefined,
    });
    setDraft({ role: '', company: '', url: '', notes: '', status: 'saved' });
    setAdding(false);
    await refresh();
  }

  async function refresh() {
    setItems(await loadApplications());
  }

  async function patchApp(id: string, patch: Partial<TrackedApplication>) {
    const item = items.find((a) => a.id === id);
    if (!item) return;
    await upsertApplication({
      ...item,
      ...patch,
      appliedAt:
        patch.status === 'applied' && !item.appliedAt ? Date.now() : item.appliedAt,
    });
    await refresh();
  }

  async function remove(id: string) {
    await deleteApplication(id);
    await refresh();
  }

  const counts = items.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  const sorted = [...items].sort((a, b) => {
    const aDays = a.interviewDate ? daysUntil(a.interviewDate) ?? 9999 : 9999;
    const bDays = b.interviewDate ? daysUntil(b.interviewDate) ?? 9999 : 9999;
    const aUpcoming = aDays >= 0 && aDays < 30 ? aDays : 9999;
    const bUpcoming = bDays >= 0 && bDays < 30 ? bDays : 9999;
    if (aUpcoming !== bUpcoming) return aUpcoming - bUpcoming;
    return b.updatedAt - a.updatedAt;
  });
  const visible = filter === 'all' ? sorted : sorted.filter((i) => i.status === filter);

  const insights = computeInsights(items);

  return (
    <section style={styles.panel}>
      {items.length > 0 && <InsightsBox insights={insights} />}
      {items.length > 0 && (
        <div style={styles.statsRow}>
          {(['saved', 'applied', 'interview', 'offer', 'rejected'] as const).map((s) => (
            <div key={s} className="card" style={styles.statBox}>
              <div style={styles.statNum}>{counts[s] ?? 0}</div>
              <div style={styles.statLabel}>
                <span className={`status-dot ${s}`} />
                {s}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="history-actions">
        <button onClick={() => setAdding((v) => !v)} className="btn-secondary">
          {adding ? 'Cancel' : '+ Add manually'}
        </button>
        {items.length > 0 && (
          <button
            onClick={() => exportApplicationsCsv(items)}
            className="btn-secondary btn-with-icon"
            title="Download applications.csv"
          >
            <IconDownload />
            Export CSV
          </button>
        )}
      </div>
      {adding && (
        <div className="card" style={styles.appRow}>
          <input
            placeholder="Role (e.g. Software Engineer)"
            value={draft.role}
            onChange={(e) => setDraft({ ...draft, role: e.target.value })}
          />
          <input
            placeholder="Company (e.g. Argos)"
            value={draft.company}
            onChange={(e) => setDraft({ ...draft, company: e.target.value })}
          />
          <input
            placeholder="URL (optional)"
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          />
          <textarea
            placeholder="Notes (optional)"
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            rows={2}
          />
          <select
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as ApplicationStatus })}
          >
            <option value="saved">saved</option>
            <option value="applied">applied</option>
            <option value="interview">interview</option>
            <option value="offer">offer</option>
            <option value="rejected">rejected</option>
          </select>
          <button onClick={submitDraft} className="btn-primary">
            Add to history
          </button>
        </div>
      )}
      <div style={styles.chips}>
        {(['all', 'saved', 'applied', 'interview', 'offer', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`chip ${filter === f ? 'active' : ''}`}
          >
            {f}
          </button>
        ))}
      </div>
      {visible.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><IconStar size={22} /></div>
          <div className="empty-state-title">
            {items.length === 0 ? 'No applications yet' : `No ${filter} applications`}
          </div>
          <div className="empty-state-body">
            {items.length === 0
              ? 'Hit Fill on a job page to log it, or Save for later.'
              : 'Try a different filter above, or add an application manually.'}
          </div>
        </div>
      )}
      {visible.map((a) => (
        <ApplicationRow
          key={a.id}
          app={a}
          onChange={(patch) => patchApp(a.id, patch)}
          onDelete={() => remove(a.id)}
          onNeedKey={onNeedKey}
        />
      ))}
    </section>
  );
}

interface QuestionRow {
  selector: string;
  label: string;
  answer: string;
}

function QuestionsPanel({ onNeedKey }: { onNeedKey: () => void }) {
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [pageUrl, setPageUrl] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab?.url ?? '';
      if (cancelled) return;
      setPageUrl(url);
      if (url) {
        const saved = await loadQuestionAnswers(url);
        if (!cancelled && saved.length) setRows(saved);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function generate() {
    setBusy(true);
    setStatus('');
    setRows([]);
    try {
      const raw = await loadProfile();
      if (!raw) return setStatus('Set up your profile first.');
      const profile = Object.fromEntries(
        Object.entries(raw).filter(([k, v]) => v !== '' && v != null && k !== 'cvFile'),
      );
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return setStatus('No active tab.');
      if (tab.url) setPageUrl(tab.url);

      let detected: { questions: { selector: string; label: string; existing: string }[] };
      try {
        detected = await chrome.tabs.sendMessage(tab.id, { type: 'DETECT_QUESTIONS' });
      } catch {
        return setStatus('Open a supported job page first.');
      }
      if (!detected?.questions?.length) return setStatus('No open questions found on this page.');

      let job: { jobDescription: string; company: string; role: string } = {
        jobDescription: '',
        company: '',
        role: '',
      };
      try {
        job = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_JOB' });
      } catch {
        // job scrape optional
      }

      setStatus(`Generating answers for ${detected.questions.length} question(s)…`);
      const res = await apiFetch(`/generate/answer-questions`, {
        method: 'POST',
        body: JSON.stringify({
          profile,
          jobDescription: job.jobDescription ?? '',
          company: job.company ?? '',
          role: job.role ?? '',
          questions: detected.questions.map((q) => q.label),
        }),
      });
      if (isNeedsKey(res)) {
        setStatus('Add your Anthropic key in Settings to draft answers.');
        onNeedKey();
        return;
      }
      if (!res.ok) return setStatus(`API error: ${res.status}`);
      const data = (await res.json()) as { answers: string[] };
      const next = detected.questions.map((q, i) => ({
        selector: q.selector,
        label: q.label,
        answer: data.answers[i] ?? '',
      }));
      setRows(next);
      if (tab.url) await saveQuestionAnswers(tab.url, next);
      setStatus('');
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function fillAll() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return setStatus('No active tab.');
    const res = await chrome.tabs.sendMessage(tab.id, {
      type: 'FILL_ANSWERS',
      answers: rows.map((r) => ({ selector: r.selector, answer: r.answer })),
    });
    setStatus(`Filled ${res?.filled ?? 0} answer(s).`);
  }

  function updateAnswer(i: number, val: string) {
    setRows((prev) => {
      const next = prev.map((r, idx) => (idx === i ? { ...r, answer: val } : r));
      if (pageUrl) void saveQuestionAnswers(pageUrl, next);
      return next;
    });
  }

  async function clearSaved() {
    if (pageUrl) await clearQuestionAnswers(pageUrl);
    setRows([]);
    setStatus('Cleared saved answers for this page.');
  }

  return (
    <section style={styles.panel}>
      <p style={styles.helperText}>
        Detects open-ended questions on the current form and drafts answers from your profile.
      </p>
      <button onClick={generate} disabled={busy} className="btn-primary btn-with-icon">
        {busy ? <IconSpinner /> : <IconSparkles />}
        {busy ? 'Working…' : 'Find questions & draft answers'}
      </button>
      {rows.map((r, i) => (
        <div key={r.selector} className="card" style={styles.qBox}>
          <div style={styles.qLabel}>{r.label}</div>
          <textarea
            value={r.answer}
            onChange={(e) => updateAnswer(i, e.target.value)}
            rows={5}
          />
        </div>
      ))}
      {rows.length > 0 && (
        <div className="history-actions">
          <button onClick={fillAll} className="btn-primary">
            Fill all answers on page
          </button>
          <button onClick={clearSaved} className="btn-link">
            Clear saved
          </button>
        </div>
      )}
      {status && <StatusLine status={status} />}
    </section>
  );
}

function classifyStatus(text: string): StatusKind {
  const t = text.trim();
  if (!t) return 'info';
  if (/^(error|api error|couldn't|could not|failed|no active|not supported|page not)/i.test(t)) return 'error';
  if (/^(filled |saved |copied|cleared|done|updated|generating)/i.test(t)) return 'success';
  return 'info';
}

function StatusLine({ status }: { status: StatusMsg | string | null }) {
  const msg = statusOf(status);
  if (!msg) return null;
  const kind = msg.kind === 'info' ? classifyStatus(msg.text) : msg.kind;
  return <p className={`status-line status-${kind}`}>{msg.text}</p>;
}

const styles: Record<string, React.CSSProperties> = {
  main: { width: 400, color: 'var(--text)' },
  header: {
    padding: '14px 16px 0',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-soft)',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  headerActions: { display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  logoMark: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
  },
  title: { fontSize: 15, margin: 0, fontWeight: 600, letterSpacing: '-0.01em' },
  tabs: { display: 'flex', gap: 0 },
  panel: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  helperText: { color: 'var(--text-muted)', fontSize: 12, margin: 0, lineHeight: 1.5 },
  status: {
    fontSize: 12,
    color: 'var(--text)',
    margin: 0,
    padding: '6px 8px',
    background: 'var(--bg-soft)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
  },
  bannerSub: { fontSize: 11, opacity: 0.85 },
  shortcuts: {
    marginTop: 4,
    fontSize: 11,
    color: 'var(--text-muted)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  shortcutsHead: { fontSize: 11, fontWeight: 600, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: 0.5 },
  shortcutRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  shortcutDesc: { color: 'var(--text-muted)' },
  shortcutsFoot: { fontSize: 10, color: 'var(--text-subtle)', marginTop: 2 },
  qBox: { display: 'flex', flexDirection: 'column', gap: 6 },
  qLabel: { fontSize: 12, fontWeight: 600, color: 'var(--text)' },
  appRow: { display: 'flex', flexDirection: 'column', gap: 6 },
  appHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 },
  appTitle: { fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  appActions: { display: 'flex', gap: 6, marginTop: 2, alignItems: 'center' },
  statusSelect: { width: 'auto', padding: '4px 6px', fontSize: 11 },
  metaRow: { display: 'flex', alignItems: 'center', gap: 2 },
  metaText: { fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' },
  statsRow: { display: 'flex', gap: 4 },
  statBox: { flex: 1, padding: '8px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 2 },
  statNum: { fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1 },
  statLabel: { fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' },
  notesBox: {
    padding: 8,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    fontSize: 11,
    color: 'var(--text)',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.5,
  },
  chips: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  label: { display: 'flex', flexDirection: 'column', gap: 4 },
  labelText: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 },
};
