import type { Profile, ProfileKey } from '@emplorio/shared';
import { loadProfile } from './storage.js';
import { dataUrlToFile } from './cv.js';

export async function getProfile(): Promise<Partial<Profile> | null> {
  return loadProfile();
}

export function fillField(
  el: HTMLInputElement,
  profile: Partial<Profile>,
  key: ProfileKey,
): boolean {
  if (key === 'resume') return attachCvFile(el, profile);

  let value = (profile as Record<string, unknown>)[key];
  if ((value == null || value === '') && key === 'fullName') {
    const fn = profile.firstName ?? '';
    const ln = profile.lastName ?? '';
    if (fn || ln) value = `${fn} ${ln}`.trim();
  }
  if (value == null || value === '') return false;
  const str = String(value);

  if (el.value === str) return true;

  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(el, str);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

const attachedFiles = new WeakSet<HTMLInputElement>();

function attachCvFile(el: HTMLInputElement, profile: Partial<Profile>): boolean {
  if (el.type !== 'file' || !profile.cvFile) return false;
  if (attachedFiles.has(el)) return true;
  if (el.files && el.files.length > 0 && el.files[0]?.name === profile.cvFile.name) {
    attachedFiles.add(el);
    return true;
  }
  try {
    const file = dataUrlToFile(profile.cvFile.dataUrl, profile.cvFile.name, profile.cvFile.type);
    const dt = new DataTransfer();
    dt.items.add(file);
    el.files = dt.files;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    attachedFiles.add(el);
    return true;
  } catch {
    return false;
  }
}
