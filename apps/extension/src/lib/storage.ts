import type { Profile } from '@emplorio/shared';

const KEY = 'profile';

export async function loadProfile(): Promise<Partial<Profile> | null> {
  const got = await chrome.storage.local.get(KEY);
  return (got[KEY] as Partial<Profile> | undefined) ?? null;
}

export async function saveProfile(profile: Partial<Profile>): Promise<void> {
  await chrome.storage.local.set({ [KEY]: profile });
}

export async function clearProfile(): Promise<void> {
  await chrome.storage.local.remove(KEY);
}
