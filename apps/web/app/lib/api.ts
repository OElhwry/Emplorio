'use client';

import type { ApplicationStatus, Profile } from '@emplorio/shared';

export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? 'https://emplorio-api.fly.dev';

const TOKEN_KEY = 'emplorio_token';
const ANTHROPIC_KEY = 'emplorio_anthropic_key';

export interface Session {
  token: string;
  userId: string;
  email: string;
  expiresAt: number;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore storage failures
  }
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function getAnthropicKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(ANTHROPIC_KEY);
  } catch {
    return null;
  }
}

export function setAnthropicKey(key: string | null): void {
  try {
    if (key && key.trim()) window.localStorage.setItem(ANTHROPIC_KEY, key.trim());
    else window.localStorage.removeItem(ANTHROPIC_KEY);
  } catch {
    // ignore
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (path.startsWith('/generate/') && !headers.has('X-Anthropic-Key')) {
    const key = getAnthropicKey();
    if (key) headers.set('X-Anthropic-Key', key);
  }
  return fetch(`${API_ORIGIN}${path}`, { ...init, headers });
}

export interface ParsedCv {
  websites?: string[];
  workHistory?: unknown[];
  education?: unknown[];
  skills?: string[];
}

/** Returns parsed CV fields, or 'needsKey' when no Anthropic key is available. */
export async function parseCv(cvText: string): Promise<ParsedCv | 'needsKey'> {
  const res = await apiFetch('/generate/parse-cv', {
    method: 'POST',
    body: JSON.stringify({ cvText }),
  });
  if (res.status === 402) return 'needsKey';
  if (!res.ok) throw new Error(`Parse failed (${res.status})`);
  return (await res.json()) as ParsedCv;
}

/* ---------- Auth ---------- */

/** Returns a dev code only in non-production (so local sign-in works without email). */
export async function requestCode(email: string): Promise<{ devCode?: string }> {
  const res = await apiFetch('/auth/request-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? 'Could not send a code. Please try again.');
  }
  const data = (await res.json().catch(() => ({}))) as { devCode?: string };
  return { devCode: data.devCode };
}

export async function verifyCode(email: string, code: string): Promise<Session> {
  const res = await apiFetch('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code, remember: true }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? 'That code did not work. Try again.');
  }
  const session = (await res.json()) as Session;
  setToken(session.token);
  return session;
}

export async function fetchMe(): Promise<{ userId: string; email: string } | null> {
  const res = await apiFetch('/auth/me');
  if (!res.ok) return null;
  return (await res.json()) as { userId: string; email: string };
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    // best effort
  }
  clearToken();
}

/* ---------- Profile ---------- */

export async function fetchProfile(): Promise<Partial<Profile> | null> {
  const res = await apiFetch('/profile');
  if (!res.ok) return null;
  const data = (await res.json()) as { profile: Partial<Profile> | null };
  return data.profile;
}

export async function saveProfile(profile: Partial<Profile>): Promise<void> {
  const res = await apiFetch('/profile', {
    method: 'PUT',
    body: JSON.stringify({ profile }),
  });
  if (!res.ok) throw new Error(`Save failed (${res.status})`);
}

/* ---------- Applications ---------- */

export interface WebApplication {
  id: string;
  company: string;
  role: string;
  jobUrl: string;
  jdSnapshot: string;
  status: ApplicationStatus;
  notes?: string;
  source?: string;
  savedAt: string | null;
  appliedAt: string | null;
  interviewDate: string | null;
  followUpSentAt: string | null;
  updatedAt: string;
}

export async function fetchApplications(): Promise<WebApplication[]> {
  const res = await apiFetch('/applications');
  if (!res.ok) return [];
  const data = (await res.json()) as { items: WebApplication[] };
  return data.items ?? [];
}

export async function deleteApplicationRemote(id: string): Promise<void> {
  await apiFetch(`/applications/${id}`, { method: 'DELETE' });
}

/** Upsert (keyed by jobUrl on the server) — used to change status or edit. */
export async function saveApplication(app: WebApplication): Promise<void> {
  const res = await apiFetch('/applications', {
    method: 'POST',
    body: JSON.stringify({
      company: app.company || 'Unknown',
      role: app.role || 'Untitled role',
      jobUrl: app.jobUrl,
      jdSnapshot: app.jdSnapshot ?? '',
      status: app.status,
      notes: app.notes,
      source: app.source,
      savedAt: app.savedAt,
      appliedAt: app.appliedAt,
      interviewDate: app.interviewDate,
      followUpSentAt: app.followUpSentAt,
    }),
  });
  if (!res.ok) throw new Error(`Save failed (${res.status})`);
}
