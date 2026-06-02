import type { Profile } from '@emplorio/shared';

const FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'city',
  'country',
  'linkedinUrl',
  'currentTitle',
  'workAuthorization',
] as const;

/** A 0–100 completeness score across key fields plus experience/education presence. */
export function profileCompletionPct(p: Partial<Profile> | null | undefined): number {
  if (!p) return 0;
  const total = FIELDS.length + 2;
  let filled = 0;
  for (const k of FIELDS) {
    const v = (p as Record<string, unknown>)[k];
    if (typeof v === 'string' ? v.trim() : v != null && v !== '') filled++;
  }
  if ((p.workHistory?.length ?? 0) > 0) filled++;
  if ((p.education?.length ?? 0) > 0) filled++;
  return Math.round((filled / total) * 100);
}
