import type { AtsAdapter, ProfileKey as PK } from '@emplorio/shared';
import { ProfileKey } from '@emplorio/shared';

const SELECTORS: Array<[string, PK]> = [
  ['input[id="firstname"]', ProfileKey.FirstName],
  ['input[name*="firstname" i]', ProfileKey.FirstName],
  ['input[id="lastname"]', ProfileKey.LastName],
  ['input[name*="lastname" i]', ProfileKey.LastName],
  ['input[id="email"]', ProfileKey.Email],
  ['input[name*="email" i][type="email"]', ProfileKey.Email],
  ['input[type="email"]', ProfileKey.Email],
  ['input[id="phone"]', ProfileKey.Phone],
  ['input[name*="phone" i]', ProfileKey.Phone],
  ['input[type="tel"]', ProfileKey.Phone],
  ['input[id="addr1"]', ProfileKey.AddressLine1],
  ['input[name*="addr1" i]', ProfileKey.AddressLine1],
  ['input[id="city"]', ProfileKey.City],
  ['input[name*="city" i]', ProfileKey.City],
  ['input[id="zip"]', ProfileKey.PostalCode],
  ['input[name*="zip" i]', ProfileKey.PostalCode],
  ['input[name*="postal" i]', ProfileKey.PostalCode],
  ['input[type="file"][name*="resume" i]', ProfileKey.Resume],
  ['input[type="file"][id*="resume" i]', ProfileKey.Resume],
];

export const icims: AtsAdapter = {
  id: 'icims',
  matches: (url, doc) =>
    /icims\.com/.test(url) || !!doc.querySelector('form[action*="icims"]'),
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
