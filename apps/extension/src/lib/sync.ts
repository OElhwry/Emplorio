import { apiFetch } from './api.js';
import {
  loadApplications,
  loadProfile,
  saveApplications,
  saveProfile,
  type TrackedApplication,
} from './storage.js';
import { loadSession } from './auth.js';
import type { Profile } from '@emplorio/shared';

// ---- profile ----

function isoOrNull(ms: number | undefined | null): string | null {
  if (!ms) return null;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function msFromIso(s: string | null | undefined): number | undefined {
  if (!s) return undefined;
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? undefined : t;
}

export async function pushProfile(profile: Partial<Profile>): Promise<void> {
  const session = await loadSession();
  if (!session) return;
  try {
    await apiFetch('/profile', {
      method: 'PUT',
      body: JSON.stringify({ profile }),
    });
  } catch {
    // best effort
  }
}

export async function pullProfile(): Promise<Partial<Profile> | null> {
  const session = await loadSession();
  if (!session) return null;
  try {
    const res = await apiFetch('/profile');
    if (!res.ok) return null;
    const data = (await res.json()) as { profile: Partial<Profile> | null };
    return data.profile ?? null;
  } catch {
    return null;
  }
}

// ---- applications ----

interface ApplicationDto {
  id: string;
  company: string;
  role: string;
  jobUrl: string;
  jdSnapshot: string;
  status: TrackedApplication['status'];
  notes?: string;
  source?: string;
  savedAt: string | null;
  appliedAt: string | null;
  interviewDate: string | null;
  followUpSentAt: string | null;
  updatedAt: string;
}

function dtoToLocal(d: ApplicationDto): TrackedApplication {
  return {
    id: d.id,
    url: d.jobUrl,
    company: d.company,
    role: d.role,
    status: d.status,
    notes: d.notes,
    interviewDate: d.interviewDate
      ? new Date(d.interviewDate).toISOString().slice(0, 10)
      : undefined,
    savedAt: msFromIso(d.savedAt),
    appliedAt: msFromIso(d.appliedAt),
    followUpSentAt: msFromIso(d.followUpSentAt),
    updatedAt: msFromIso(d.updatedAt) ?? Date.now(),
  };
}

function localToDto(a: TrackedApplication) {
  if (!a.url) return null;
  let validatedUrl: string;
  try {
    validatedUrl = new URL(a.url).toString();
  } catch {
    return null;
  }
  return {
    company: a.company || 'Unknown',
    role: a.role || 'Unknown',
    jobUrl: validatedUrl,
    jdSnapshot: '',
    status: a.status,
    notes: a.notes,
    savedAt: isoOrNull(a.savedAt),
    appliedAt: isoOrNull(a.appliedAt),
    interviewDate: a.interviewDate
      ? new Date(a.interviewDate + 'T00:00:00Z').toISOString()
      : null,
    followUpSentAt: isoOrNull(a.followUpSentAt),
  };
}

export async function pushApplications(apps: TrackedApplication[]): Promise<void> {
  const session = await loadSession();
  if (!session) return;
  const valid = apps.map(localToDto).filter((x): x is NonNullable<typeof x> => x !== null);
  if (valid.length === 0) return;
  try {
    await apiFetch('/applications/sync', {
      method: 'PUT',
      body: JSON.stringify({ applications: valid }),
    });
  } catch {
    // best effort
  }
}

export async function pushApplication(app: TrackedApplication): Promise<void> {
  await pushApplications([app]);
}

export async function pullApplications(): Promise<TrackedApplication[] | null> {
  const session = await loadSession();
  if (!session) return null;
  try {
    const res = await apiFetch('/applications');
    if (!res.ok) return null;
    const data = (await res.json()) as { items: ApplicationDto[] };
    return data.items.map(dtoToLocal);
  } catch {
    return null;
  }
}

export async function deleteRemoteApplication(id: string): Promise<void> {
  const session = await loadSession();
  if (!session) return;
  try {
    await apiFetch(`/applications/${id}`, { method: 'DELETE' });
  } catch {
    // best effort
  }
}

// ---- login orchestration ----

function nonEmpty(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/**
 * The server profile is the source of truth (so edits made on the web are never
 * lost). Every field the server has wins; the local copy only contributes fields
 * the server is missing, e.g. data entered in the extension before first sync.
 */
function mergeServerWins(
  remote: Partial<Profile> | null,
  local: Partial<Profile> | null,
): Partial<Profile> {
  return { ...(local ?? {}), ...(remote ?? {}) };
}

export async function syncOnLogin(): Promise<void> {
  const session = await loadSession();
  if (!session) return;

  const [localProfile, localApps] = await Promise.all([loadProfile(), loadApplications()]);

  // Applications use an additive /sync endpoint, so it's safe to push local up first.
  if (localApps.length > 0) {
    await pushApplications(localApps);
  }

  const [remoteProfile, remoteApps] = await Promise.all([pullProfile(), pullApplications()]);

  // Profile: server values win, local only fills fields the server is missing.
  // saveProfile also pushes the result back via the sync hook, but because this
  // is a server-wins merge that push can only ADD local-only fields, it can never
  // overwrite a value that was just edited on the web. This was the bug: the old
  // code pushed the whole stale local profile first, clobbering web edits.
  const merged = mergeServerWins(remoteProfile, localProfile);
  if (Object.keys(merged).length > 0) {
    await saveProfile(merged);
    // Upload only what the server is missing (first sync, or local-only fields).
    // Existing server values are never included, so web edits are preserved.
    const remoteObj = (remoteProfile ?? {}) as Record<string, unknown>;
    const gap: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(merged)) {
      if (!(k in remoteObj) && nonEmpty(v)) gap[k] = v;
    }
    if (Object.keys(gap).length > 0) {
      await pushProfile(gap);
    }
  }

  if (remoteApps) {
    await saveApplications(remoteApps);
  }
}

export async function clearLocalUserData(): Promise<void> {
  await chrome.storage.local.remove([
    'profile',
    'trackedApplications',
    'lastCoverLetter',
    'questionAnswers',
    'emplorioOnboardingComplete',
    'emplorioSettings',
    'emplorioAuthDraft',
    'emplorioFillPaused',
    'emplorioFillRunning',
    'emplorioRecentSubmit',
  ]);
  const { clearSettingsCache } = await import('./settings.js');
  clearSettingsCache();
}
