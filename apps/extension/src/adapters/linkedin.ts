import type { AtsAdapter, ProfileKey as PK } from '@emplorio/shared';
import { ProfileKey } from '@emplorio/shared';

const SELECTORS: Array<[string, PK]> = [
  ['input[id*="first-name" i]', ProfileKey.FirstName],
  ['input[id*="firstName" i]', ProfileKey.FirstName],
  ['input[name="firstName"]', ProfileKey.FirstName],

  ['input[id*="last-name" i]', ProfileKey.LastName],
  ['input[id*="lastName" i]', ProfileKey.LastName],
  ['input[name="lastName"]', ProfileKey.LastName],

  ['input[id*="email" i][type="email"]', ProfileKey.Email],
  ['input[id*="email-address" i]', ProfileKey.Email],
  ['input[type="email"]', ProfileKey.Email],

  ['input[id*="phoneNumber-nationalNumber" i]', ProfileKey.Phone],
  ['input[id*="phone" i][type="tel"]', ProfileKey.Phone],
  ['input[type="tel"]', ProfileKey.Phone],

  ['input[id*="address" i]', ProfileKey.AddressLine1],
  ['input[id*="city" i]', ProfileKey.City],
  ['input[id*="postal" i]', ProfileKey.PostalCode],
  ['input[id*="zip" i]', ProfileKey.PostalCode],
];

function inEasyApplyModal(doc: Document): boolean {
  return !!doc.querySelector(
    '.jobs-easy-apply-modal, [data-test-modal-id="easy-apply-modal"], .artdeco-modal[role="dialog"]',
  );
}

export const linkedin: AtsAdapter = {
  id: 'linkedin',
  matches: (url, doc) => /linkedin\.com\/(jobs|hiring)/.test(url) && inEasyApplyModal(doc),
  detectFields: (doc) => {
    const root =
      doc.querySelector('.jobs-easy-apply-modal') ??
      doc.querySelector('[data-test-modal-id="easy-apply-modal"]') ??
      doc.querySelector('.artdeco-modal[role="dialog"]') ??
      doc;
    const seen = new Set<PK>();
    const out: Array<{ selector: string; key: PK }> = [];
    for (const [selector, key] of SELECTORS) {
      if (seen.has(key)) continue;
      const el = root.querySelector(selector);
      if (!el?.id) continue;
      out.push({ selector: `#${CSS.escape(el.id)}`, key });
      seen.add(key);
    }
    return out;
  },
};
