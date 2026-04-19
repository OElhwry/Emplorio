import type { Profile, ProfileKey } from '@emplorio/shared';
import { loadProfile } from './storage.js';

export async function getProfile(): Promise<Partial<Profile> | null> {
  return loadProfile();
}

export function fillField(
  el: HTMLInputElement,
  profile: Partial<Profile>,
  key: ProfileKey,
): boolean {
  let value = (profile as Record<string, unknown>)[key];
  if ((value == null || value === '') && key === 'fullName') {
    const fn = profile.firstName ?? '';
    const ln = profile.lastName ?? '';
    if (fn || ln) value = `${fn} ${ln}`.trim();
  }
  if (value == null || value === '') return false;
  const str = String(value);

  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(el, str);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}
