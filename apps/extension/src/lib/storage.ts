import type { Profile } from '@emplorio/shared';
import { emitAppDeleted, emitAppsSaved, emitProfileSaved } from './syncHooks.js';

const PROFILE_KEY = 'profile';
const LAST_LETTER_KEY = 'lastCoverLetter';
const APPS_KEY = 'trackedApplications';
const QUESTION_ANSWERS_KEY = 'questionAnswers';
const MAX_QUESTION_PAGES = 30;

export async function loadProfile(): Promise<Partial<Profile> | null> {
  const got = await chrome.storage.local.get(PROFILE_KEY);
  return (got[PROFILE_KEY] as Partial<Profile> | undefined) ?? null;
}

export async function saveProfile(profile: Partial<Profile>): Promise<void> {
  await chrome.storage.local.set({ [PROFILE_KEY]: profile });
  emitProfileSaved(profile);
}

export interface SavedCoverLetter {
  text: string;
  company: string;
  role: string;
  url: string;
  tone: string;
  createdAt: number;
}

export async function loadLastCoverLetter(): Promise<SavedCoverLetter | null> {
  const got = await chrome.storage.local.get(LAST_LETTER_KEY);
  return (got[LAST_LETTER_KEY] as SavedCoverLetter | undefined) ?? null;
}

export async function saveLastCoverLetter(letter: SavedCoverLetter): Promise<void> {
  await chrome.storage.local.set({ [LAST_LETTER_KEY]: letter });
}

export interface SavedQuestionAnswer {
  selector: string;
  label: string;
  answer: string;
}

interface QuestionAnswersEntry {
  rows: SavedQuestionAnswer[];
  updatedAt: number;
}

function questionPageKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url;
  }
}

export async function loadQuestionAnswers(url: string): Promise<SavedQuestionAnswer[]> {
  const got = await chrome.storage.local.get(QUESTION_ANSWERS_KEY);
  const all = (got[QUESTION_ANSWERS_KEY] as Record<string, QuestionAnswersEntry> | undefined) ?? {};
  return all[questionPageKey(url)]?.rows ?? [];
}

export async function saveQuestionAnswers(
  url: string,
  rows: SavedQuestionAnswer[],
): Promise<void> {
  const got = await chrome.storage.local.get(QUESTION_ANSWERS_KEY);
  const all = (got[QUESTION_ANSWERS_KEY] as Record<string, QuestionAnswersEntry> | undefined) ?? {};
  all[questionPageKey(url)] = { rows, updatedAt: Date.now() };
  const entries = Object.entries(all);
  if (entries.length > MAX_QUESTION_PAGES) {
    entries.sort((a, b) => b[1].updatedAt - a[1].updatedAt);
    const trimmed = Object.fromEntries(entries.slice(0, MAX_QUESTION_PAGES));
    await chrome.storage.local.set({ [QUESTION_ANSWERS_KEY]: trimmed });
    return;
  }
  await chrome.storage.local.set({ [QUESTION_ANSWERS_KEY]: all });
}

export async function clearQuestionAnswers(url: string): Promise<void> {
  const got = await chrome.storage.local.get(QUESTION_ANSWERS_KEY);
  const all = (got[QUESTION_ANSWERS_KEY] as Record<string, QuestionAnswersEntry> | undefined) ?? {};
  delete all[questionPageKey(url)];
  await chrome.storage.local.set({ [QUESTION_ANSWERS_KEY]: all });
}

export type ApplicationStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected';

export interface TrackedApplication {
  id: string;
  url: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  notes?: string;
  interviewDate?: string;
  savedAt?: number;
  appliedAt?: number;
  followUpSentAt?: number;
  updatedAt: number;
}

export async function loadApplications(): Promise<TrackedApplication[]> {
  const got = await chrome.storage.local.get(APPS_KEY);
  const list = (got[APPS_KEY] as TrackedApplication[] | undefined) ?? [];
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveApplications(list: TrackedApplication[]): Promise<void> {
  await chrome.storage.local.set({ [APPS_KEY]: list });
  emitAppsSaved(list);
}

export function normaliseUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    u.search = '';
    return `${u.origin}${u.pathname.replace(/\/+$/, '')}`;
  } catch {
    return url;
  }
}

export async function findApplicationByUrl(url: string): Promise<TrackedApplication | null> {
  if (!url) return null;
  const list = await loadApplications();
  const norm = normaliseUrl(url);
  return list.find((a) => a.url && normaliseUrl(a.url) === norm) ?? null;
}

export async function upsertApplication(
  patch: Partial<TrackedApplication> & { company: string; role: string; url?: string },
): Promise<TrackedApplication> {
  const list = await loadApplications();
  const now = Date.now();
  let idx = -1;
  if (patch.id) {
    idx = list.findIndex((a) => a.id === patch.id);
  } else if (patch.url) {
    const norm = normaliseUrl(patch.url);
    idx = list.findIndex((a) => a.url && normaliseUrl(a.url) === norm);
  }
  let entry: TrackedApplication;
  if (idx >= 0) {
    entry = { ...list[idx]!, ...patch, url: patch.url ?? list[idx]!.url, updatedAt: now };
    list[idx] = entry;
  } else {
    entry = {
      id: crypto.randomUUID(),
      status: 'saved',
      url: '',
      ...patch,
      updatedAt: now,
    };
    list.unshift(entry);
  }
  await saveApplications(list);
  return entry;
}

export async function deleteApplication(id: string): Promise<void> {
  const list = await loadApplications();
  await saveApplications(list.filter((a) => a.id !== id));
  emitAppDeleted(id);
}
