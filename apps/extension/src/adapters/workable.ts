import type { AtsAdapter, ProfileKey as PK } from '@emplorio/shared';
import { ProfileKey } from '@emplorio/shared';

const SELECTORS: Array<[string, PK]> = [
  ['input[name="firstname"]', ProfileKey.FirstName],
  ['input[id="firstname"]', ProfileKey.FirstName],
  ['input[name="lastname"]', ProfileKey.LastName],
  ['input[id="lastname"]', ProfileKey.LastName],
  ['input[name="email"]', ProfileKey.Email],
  ['input[type="email"]', ProfileKey.Email],
  ['input[name="phone"]', ProfileKey.Phone],
  ['input[type="tel"]', ProfileKey.Phone],
  ['input[name="headline"]', ProfileKey.CurrentTitle],
  ['input[name="address"]', ProfileKey.AddressLine1],
  ['input[name="resume"]', ProfileKey.Resume],
  ['input[type="file"][name*="resume" i]', ProfileKey.Resume],
  ['input[type="file"][id*="resume" i]', ProfileKey.Resume],
];

export const workable: AtsAdapter = {
  id: 'workable',
  matches: (url, doc) =>
    /apply\.workable\.com|workable\.com\/j\//.test(url) ||
    !!doc.querySelector('form[action*="workable.com"]'),
  detectFields: (doc) => {
    const seen = new Set<PK>();
    const out: Array<{ selector: string; key: PK }> = [];
    for (const [selector, key] of SELECTORS) {
      if (seen.has(key)) continue;
      if (doc.querySelector(selector)) {
        out.push({ selector, key });
        seen.add(key);
      }
    }
    return out;
  },
};
