import { ProfileKey, type Profile } from '@emplorio/shared';
import { pickAdapter } from '../adapters/index.js';
import { detectByHeuristics } from '../lib/heuristics.js';
import { fillField, getProfile } from '../lib/fill.js';
import { fillDemographics } from '../lib/demographics.js';
import { fillSections } from '../lib/sections.js';
import { awaitUnpause } from '../lib/pause.js';

export interface FieldMatch {
  selector: string;
  key: ProfileKey;
}

export interface FillResult {
  /** Fields we newly changed on the page (the honest headline number). */
  filled: number;
  /** Fields that already held the right value, so we left them as-is. */
  alreadyCorrect: number;
  /** Selectors we recognised but had no data for — surfaced as skipped. */
  unmapped: string[];
  /** Elements we actually changed — used for the on-page flash. */
  filledEls: HTMLElement[];
}

/** Adapter matches first, then heuristic matches for anything the adapter missed. */
export function detectMatches(doc: Document): FieldMatch[] {
  const adapter = pickAdapter(location.href, doc);
  const adapterMatches = adapter ? adapter.detectFields(doc) : [];
  const heuristicMatches = detectByHeuristics(doc);
  const seen = new Set(adapterMatches.map((m) => m.selector));
  return [...adapterMatches, ...heuristicMatches.filter((m) => !seen.has(m.selector))];
}

/**
 * How many distinct, present fields this page exposes that we recognise — used
 * only to decide whether the page is an application form worth showing for.
 */
export function countDetectedFields(doc: Document): number {
  const seenEls = new WeakSet<Element>();
  let n = 0;
  for (const m of detectMatches(doc)) {
    const el = doc.querySelector(m.selector);
    if (el && !seenEls.has(el)) {
      seenEls.add(el);
      n++;
    }
  }
  return n;
}

/** Whether we actually hold a value that `fillField` would write for this key. */
function canFill(profile: Partial<Profile>, key: ProfileKey, el: Element): boolean {
  if (key === ProfileKey.Resume) {
    return el instanceof HTMLInputElement && el.type === 'file' && !!profile.cvFile;
  }
  const v = (profile as Record<string, unknown>)[key];
  if (v != null && v !== '') return true;
  if (key === ProfileKey.FullName) {
    return !!((profile.firstName ?? '') || (profile.lastName ?? ''));
  }
  return false;
}

/**
 * How many fields we can genuinely fill right now: present, recognised, and
 * backed by a value in the profile. This is the number the panel promises, so
 * it matches what the fill actually does.
 */
export function countFillable(doc: Document, profile: Partial<Profile> | null): number {
  if (!profile) return 0;
  const seenEls = new WeakSet<Element>();
  let n = 0;
  for (const m of detectMatches(doc)) {
    const el = doc.querySelector(m.selector);
    if (!el || seenEls.has(el)) continue;
    seenEls.add(el);
    if (canFill(profile, m.key, el)) n++;
  }
  return n;
}

export async function runFill(): Promise<FillResult> {
  try {
    await chrome.storage.local.set({ emplorioFillRunning: true });
  } catch {
    // ignore
  }
  try {
    return await doFill();
  } finally {
    try {
      await chrome.storage.local.set({ emplorioFillRunning: false, emplorioFillPaused: false });
    } catch {
      // ignore
    }
  }
}

async function doFill(): Promise<FillResult> {
  const profile = await getProfile();
  if (!profile) return { filled: 0, alreadyCorrect: 0, unmapped: [], filledEls: [] };

  const merged = detectMatches(document);

  const hasPhoneCountryField = merged.some((m) => m.key === ProfileKey.PhoneCountryCode);
  const splitPhone = hasPhoneCountryField && !!profile.phoneCountryCode;
  const effectiveProfile: Partial<typeof profile> = splitPhone
    ? { ...profile, phone: (profile.phone ?? '').replace(/^0+/, '') }
    : profile;

  const filledSet = new WeakSet<HTMLInputElement>();
  const filledEls: HTMLElement[] = [];
  let filled = 0;
  let alreadyCorrect = 0;
  const unmapped: string[] = [];

  for (const m of merged) {
    await awaitUnpause();
    const el = document.querySelector<HTMLInputElement>(m.selector);
    if (!el || filledSet.has(el)) continue;
    const before = el.value;
    if (fillField(el, effectiveProfile, m.key)) {
      filledSet.add(el);
      if (el.value !== before) {
        filled++;
        filledEls.push(el);
      } else {
        alreadyCorrect++;
      }
    } else {
      unmapped.push(m.selector);
    }
  }

  // Demographics and repeated sections fill selects/groups we can't diff cheaply;
  // treat anything they touch as a fresh change.
  filled += fillDemographics(document, effectiveProfile);
  filled += await fillSections(document, effectiveProfile);

  return { filled, alreadyCorrect, unmapped, filledEls };
}
