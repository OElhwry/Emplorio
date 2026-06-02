/**
 * Watches the page (including SPA route changes like Workday and LinkedIn) and
 * surfaces the on-page panel when a fillable application form appears. The panel
 * never fills anything on its own — it only offers to.
 */
import { scrapeJob } from '../lib/scrape.js';
import { loadProfile, upsertApplication } from '../lib/storage.js';
import { profileCompleteness } from '../lib/completeness.js';
import { detectQuestions, fillAnswer } from '../lib/questions.js';
import { countDetectedFields, countFillable, runFill } from './fill-run.js';
import {
  clearPanelResult,
  flashFields,
  hidePanel,
  mountOrUpdatePanel,
  outlineUnmapped,
  setPanelActionBusy,
  setPanelBusy,
  setPanelFilled,
  setPanelResult,
  showToast,
} from './ui.js';

/** Minimum recognised fields before we consider a page an application form. */
const FIELD_THRESHOLD = 3;
const DEBOUNCE_MS = 400;

const PANEL_ENABLED_KEY = 'emplorioPanelEnabled';
/** Persisted generated cover letter, so it survives navigation between steps. */
const COVER_KEY = 'emplorioPanelCover';

interface StoredCover {
  text: string;
  company: string;
  createdAt: number;
}

let debounceTimer: number | undefined;
let lastSig = '';

export function startAutoDetect(): void {
  // Top frame only — avoids duplicate panels inside embedded iframes.
  if (window.top !== window.self) return;

  patchHistory();
  window.addEventListener('emplorio:locationchange', onRouteChange);
  window.addEventListener('popstate', onRouteChange);

  const observer = new MutationObserver(scheduleDetect);
  const startObserving = () => observer.observe(document.body, { childList: true, subtree: true });
  if (document.body) startObserving();
  else document.addEventListener('DOMContentLoaded', startObserving, { once: true });

  scheduleDetect();
}

function onRouteChange(): void {
  // A new route is effectively a new form; let it re-evaluate from scratch.
  lastSig = '';
  scheduleDetect();
}

function scheduleDetect(): void {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => void detect(), DEBOUNCE_MS);
}

async function detect(): Promise<void> {
  const store = await chrome.storage.local.get(PANEL_ENABLED_KEY);
  if (store[PANEL_ENABLED_KEY] === false) {
    hidePanel();
    return;
  }

  // Gate on recognised fields (is this a form?), but promise only what we can
  // actually fill from the profile (how many will the click write?).
  const detected = countDetectedFields(document);
  if (detected < FIELD_THRESHOLD) {
    hidePanel();
    lastSig = '';
    return;
  }

  const profile = await loadProfile();
  const fillable = countFillable(document, profile);
  const job = scrapeJob(document);
  const completeness = profileCompleteness(profile as Record<string, unknown> | null);
  const hasNext = findNextButton() != null;

  const sig = `${fillable}|${completeness.pct}|${job.role}|${job.company}|${hasNext}`;
  if (sig === lastSig) return; // nothing meaningful changed
  lastSig = sig;

  mountOrUpdatePanel(
    { role: job.role, company: job.company, fillable, completeness, hasNext },
    {
      onFill: () => void handleFill(),
      onCover: () => void handleCover(),
      onQuestions: () => void handleQuestions(),
      onNext: () => handleNext(),
      onResultClose: () => {
        void chrome.storage.local.remove(COVER_KEY);
        clearPanelResult();
      },
    },
  );

  // Restore a previously generated cover letter for this employer.
  await restoreCover(job.company);
}

/** Re-show a saved cover letter if it belongs to the employer on screen. */
async function restoreCover(company: string): Promise<void> {
  const got = await chrome.storage.local.get(COVER_KEY);
  const cover = got[COVER_KEY] as StoredCover | undefined;
  if (!cover?.text) return;
  // Different employer means a stale letter — drop it rather than mislead.
  if (cover.company && company && cover.company !== company) {
    await chrome.storage.local.remove(COVER_KEY);
    return;
  }
  setPanelResult('Cover letter', cover.text);
}

async function handleFill(): Promise<void> {
  setPanelBusy(true);
  try {
    await chrome.storage.local.set({ emplorioFillPaused: false });
    const res = await runFill();
    flashFields(res.filledEls);
    outlineUnmapped(res.unmapped);
    const parts: string[] = [];
    if (res.alreadyCorrect) parts.push(`${res.alreadyCorrect} already set`);
    if (res.unmapped.length) parts.push(`${res.unmapped.length} to check`);
    const tail = parts.length ? ` · ${parts.join(' · ')}` : '';
    showToast(`Filled ${res.filled} field${res.filled === 1 ? '' : 's'}${tail}`, 'success');
    setPanelFilled(res.filled);
    await logApplication();
    // Force the next mutation tick to re-render the panel with fresh counts.
    lastSig = '';
  } catch {
    showToast('Could not fill this form', 'error');
    setPanelBusy(false);
  }
}

/** Strip the CV blob and empty values before sending the profile to the model. */
function sanitizedProfile(raw: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!raw) return null;
  return Object.fromEntries(
    Object.entries(raw).filter(([k, v]) => v !== '' && v != null && k !== 'cvFile'),
  );
}

async function handleCover(): Promise<void> {
  setPanelActionBusy('cover');
  try {
    const profile = sanitizedProfile((await loadProfile()) as Record<string, unknown> | null);
    if (!profile) {
      showToast('Set up your profile first', 'error');
      return;
    }
    const job = scrapeJob(document);
    if (!job.jobDescription || job.jobDescription.length < 50) {
      showToast('No job description found on this page', 'error');
      return;
    }
    const resp = await chrome.runtime.sendMessage({
      type: 'GENERATE_COVER',
      payload: {
        profile,
        jobDescription: job.jobDescription,
        company: job.company,
        role: job.role,
        tone: 'friendly',
      },
    });
    if (resp?.needsKey) {
      showToast('Add your Anthropic key in the extension settings', 'error');
      return;
    }
    if (resp?.error || !resp?.text) {
      showToast('Could not generate a cover letter', 'error');
      return;
    }
    const cover: StoredCover = { text: resp.text, company: job.company ?? '', createdAt: Date.now() };
    await chrome.storage.local.set({ [COVER_KEY]: cover });
    setPanelResult('Cover letter', resp.text);
  } catch {
    showToast('Could not generate a cover letter', 'error');
  } finally {
    setPanelActionBusy(null);
  }
}

async function handleQuestions(): Promise<void> {
  setPanelActionBusy('questions');
  try {
    const profile = sanitizedProfile((await loadProfile()) as Record<string, unknown> | null);
    if (!profile) {
      showToast('Set up your profile first', 'error');
      return;
    }
    const questions = detectQuestions(document);
    if (!questions.length) {
      showToast('No open-ended questions found on this page', 'error');
      return;
    }
    const job = scrapeJob(document);
    const resp = await chrome.runtime.sendMessage({
      type: 'GENERATE_ANSWERS',
      payload: {
        profile,
        jobDescription: job.jobDescription ?? '',
        company: job.company ?? '',
        role: job.role ?? '',
        questions: questions.map((q) => q.label),
      },
    });
    if (resp?.needsKey) {
      showToast('Add your Anthropic key in the extension settings', 'error');
      return;
    }
    const answers = resp?.answers as string[] | undefined;
    if (resp?.error || !answers) {
      showToast('Could not draft answers', 'error');
      return;
    }
    const filledEls: HTMLElement[] = [];
    questions.forEach((q, i) => {
      const ans = answers[i];
      if (ans && fillAnswer(document, q.selector, ans)) {
        const el = document.querySelector(q.selector);
        if (el instanceof HTMLElement) filledEls.push(el);
      }
    });
    flashFields(filledEls);
    showToast(
      `Drafted ${filledEls.length} answer${filledEls.length === 1 ? '' : 's'} — review before submitting`,
      'success',
    );
  } catch {
    showToast('Could not draft answers', 'error');
  } finally {
    setPanelActionBusy(null);
  }
}

function handleNext(): void {
  const btn = findNextButton();
  if (!btn) {
    showToast('No next step found', 'error');
    return;
  }
  btn.click();
  // The new step renders asynchronously; let the watcher pick it up.
  lastSig = '';
  scheduleDetect();
}

/** A visible "next / continue" control, deliberately excluding final submit/apply. */
function findNextButton(): HTMLElement | null {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      'button, a[role="button"], input[type="button"], input[type="submit"]',
    ),
  );
  for (const el of candidates) {
    const label = (
      el.textContent ||
      el.getAttribute('value') ||
      el.getAttribute('aria-label') ||
      ''
    )
      .trim()
      .toLowerCase();
    if (!label) continue;
    if (/\b(submit|apply now|send application)\b/.test(label)) continue;
    if (/\b(next|continue|save and continue|save & continue)\b/.test(label)) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return el;
    }
  }
  return null;
}

async function logApplication(): Promise<void> {
  try {
    const job = scrapeJob(document);
    await upsertApplication({
      url: location.href,
      company: job.company ?? '',
      role: job.role ?? '',
      status: 'applied',
      appliedAt: Date.now(),
    });
  } catch {
    // logging is best-effort; never block the fill
  }
}

function patchHistory(): void {
  const w = window as unknown as { __emplorioHistoryPatched?: boolean };
  if (w.__emplorioHistoryPatched) return;
  w.__emplorioHistoryPatched = true;

  const fire = () => window.dispatchEvent(new Event('emplorio:locationchange'));
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = history[method];
    history[method] = function (this: History, ...args: unknown[]) {
      const result = original.apply(this, args as Parameters<History['pushState']>);
      fire();
      return result;
    } as History[typeof method];
  }
}
