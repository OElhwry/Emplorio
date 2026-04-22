const SETTINGS_KEY = 'emplorioSettings';

export interface Settings {
  anthropicKey?: string;
}

let cached: Settings | null = null;

export async function loadSettings(): Promise<Settings> {
  if (cached) return cached;
  const got = await chrome.storage.local.get(SETTINGS_KEY);
  cached = (got[SETTINGS_KEY] as Settings | undefined) ?? {};
  return cached;
}

export async function saveSettings(s: Settings): Promise<void> {
  cached = s;
  await chrome.storage.local.set({ [SETTINGS_KEY]: s });
}

export async function getAnthropicKey(): Promise<string | undefined> {
  return (await loadSettings()).anthropicKey;
}

export async function setAnthropicKey(key: string | undefined): Promise<void> {
  const s = await loadSettings();
  await saveSettings({ ...s, anthropicKey: key && key.trim().length > 0 ? key.trim() : undefined });
}

export function clearSettingsCache() {
  cached = null;
}
