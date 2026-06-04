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

export type ApiErrorKind = 'network' | 'server' | 'rate-limit' | 'auth' | 'unknown';

/** A normalised API error carrying a user-friendly message and a machine kind. */
export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  constructor(message: string, kind: ApiErrorKind = 'unknown', status?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

const NETWORK_MESSAGE =
  "We couldn't reach Emplorio. Check your internet connection and try again in a moment.";

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true; // fetch throws TypeError on network failure
  if (err instanceof Error) return /failed to fetch|load failed|networkerror|fetch failed/i.test(err.message);
  return false;
}

/** Turn any thrown value into a short, human-readable message for the UI. */
export function toFriendlyMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (isNetworkError(err)) return NETWORK_MESSAGE;
  if (err instanceof Error && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}

/** Read a server error message from a non-OK response, mapping common statuses. */
async function errorFromResponse(res: Response, fallback: string): Promise<ApiError> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 429) {
    return new ApiError(
      data.error ?? 'Too many attempts. Please wait a moment and try again.',
      'rate-limit',
      429,
    );
  }
  if (res.status === 401 || res.status === 403) {
    return new ApiError(data.error ?? 'Your session has expired. Please sign in again.', 'auth', res.status);
  }
  if (res.status >= 500) {
    return new ApiError(
      data.error ?? 'Emplorio is having a moment on our side. Please try again shortly.',
      'server',
      res.status,
    );
  }
  return new ApiError(data.error ?? fallback, 'unknown', res.status);
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
  try {
    return await fetch(`${API_ORIGIN}${path}`, { ...init, headers });
  } catch {
    // Connection refused / DNS / CORS block / offline all land here.
    throw new ApiError(NETWORK_MESSAGE, 'network');
  }
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
    throw await errorFromResponse(res, 'Could not send a code. Please try again.');
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
    throw await errorFromResponse(res, 'That code did not work. Try again.');
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
