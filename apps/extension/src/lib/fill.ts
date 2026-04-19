import type { Profile, ProfileKey } from '@emplorio/shared';

export async function getProfile(): Promise<Profile | null> {
  const { profile } = await chrome.storage.local.get('profile');
  return (profile as Profile | undefined) ?? null;
}

export function fillField(el: HTMLInputElement, profile: Profile, key: ProfileKey): boolean {
  const value = (profile as Record<string, unknown>)[key];
  if (value == null || value === '') return false;
  const str = String(value);

  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(el, str);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}
