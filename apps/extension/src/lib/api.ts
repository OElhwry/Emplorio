const ORIGIN = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3001';

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${ORIGIN}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`api ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}
