/**
 * Single source of truth for "how complete is the profile". Used by both the
 * popup Fill tab and the on-page panel so the percentage never disagrees.
 */

export const FILL_KEY_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'phoneCountryCode', label: 'Phone country code' },
  { key: 'addressLine1', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'postalCode', label: 'Postal code' },
  { key: 'country', label: 'Country' },
  { key: 'linkedinUrl', label: 'LinkedIn' },
  { key: 'currentTitle', label: 'Current title' },
  { key: 'currentCompany', label: 'Current company' },
  { key: 'workAuthorization', label: 'Work authorization' },
];

export interface Completeness {
  filled: number;
  total: number;
  missing: string[];
  pct: number;
}

export function profileCompleteness(p: Record<string, unknown> | null | undefined): Completeness {
  const total = FILL_KEY_FIELDS.length;
  if (!p) {
    return { filled: 0, total, missing: FILL_KEY_FIELDS.map((f) => f.label), pct: 0 };
  }
  const missing: string[] = [];
  let filled = 0;
  for (const f of FILL_KEY_FIELDS) {
    const v = p[f.key];
    if (typeof v === 'string' ? v.trim() : v != null && v !== '') filled++;
    else missing.push(f.label);
  }
  return { filled, total, missing, pct: Math.round((filled / total) * 100) };
}
