export type Theme = 'light' | 'dark' | 'system';
const KEY = 'emplorioTheme';

export async function loadTheme(): Promise<Theme> {
  const got = await chrome.storage.local.get(KEY);
  return (got[KEY] as Theme | undefined) ?? 'system';
}

export async function saveTheme(t: Theme): Promise<void> {
  await chrome.storage.local.set({ [KEY]: t });
}

export function resolveTheme(t: Theme): 'light' | 'dark' {
  if (t === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return t;
}

export function applyTheme(t: Theme): void {
  document.documentElement.dataset.theme = resolveTheme(t);
}
