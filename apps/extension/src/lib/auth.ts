const SESSION_KEY = 'emplorioSession';

export interface Session {
  token: string;
  userId: string;
  email: string;
  expiresAt: number; // ms epoch
}

export async function loadSession(): Promise<Session | null> {
  const got = await chrome.storage.local.get(SESSION_KEY);
  const s = got[SESSION_KEY] as Session | undefined;
  if (!s) return null;
  if (s.expiresAt && s.expiresAt < Date.now()) {
    await clearSession();
    return null;
  }
  return s;
}

export async function saveSession(session: Session): Promise<void> {
  await chrome.storage.local.set({ [SESSION_KEY]: session });
}

export async function clearSession(): Promise<void> {
  await chrome.storage.local.remove(SESSION_KEY);
}

let cachedToken: string | null = null;

export async function getCachedToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  const s = await loadSession();
  cachedToken = s?.token ?? null;
  return cachedToken;
}

export function setCachedToken(token: string | null) {
  cachedToken = token;
}
