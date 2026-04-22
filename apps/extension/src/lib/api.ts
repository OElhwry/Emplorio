import { getCachedToken } from './auth.js';
import { getAnthropicKey } from './settings.js';

export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3001';
const API_KEY = import.meta.env.VITE_EMPLORIO_API_KEY as string | undefined;

export class NeedsApiKeyError extends Error {
  constructor() {
    super('Add your Anthropic API key in Settings to use AI features.');
    this.name = 'NeedsApiKeyError';
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Authorization')) {
    const sessionToken = await getCachedToken();
    if (sessionToken) {
      headers.set('Authorization', `Bearer ${sessionToken}`);
    } else if (API_KEY) {
      headers.set('Authorization', `Bearer ${API_KEY}`);
    }
  }
  if (path.startsWith('/generate/') && !headers.has('X-Anthropic-Key')) {
    const key = await getAnthropicKey();
    if (key) headers.set('X-Anthropic-Key', key);
  }
  return fetch(`${API_ORIGIN}${path}`, { ...init, headers });
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  if (res.status === 402) throw new NeedsApiKeyError();
  if (!res.ok) throw new Error(`api ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}
