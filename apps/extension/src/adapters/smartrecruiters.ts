import type { AtsAdapter, ProfileKey as PK } from '@emplorio/shared';
import { ProfileKey } from '@emplorio/shared';

const SELECTORS: Array<[string, PK]> = [
  ['input[id="firstName"]', ProfileKey.FirstName],
  ['input[name="firstName"]', ProfileKey.FirstName],
  ['input[id="lastName"]', ProfileKey.LastName],
  ['input[name="lastName"]', ProfileKey.LastName],
  ['input[id="email"]', ProfileKey.Email],
  ['input[name="email"]', ProfileKey.Email],
  ['input[type="email"]', ProfileKey.Email],
  ['input[id="phoneNumber"]', ProfileKey.Phone],
  ['input[name="phoneNumber"]', ProfileKey.Phone],
  ['input[type="tel"]', ProfileKey.Phone],
  ['input[id="location"]', ProfileKey.City],
  ['input[name="location"]', ProfileKey.City],
  ['input[id="currentCompany"]', ProfileKey.CurrentCompany],
  ['input[name="currentCompany"]', ProfileKey.CurrentCompany],
  ['input[id="currentJobTitle"]', ProfileKey.CurrentTitle],
  ['input[name="currentJobTitle"]', ProfileKey.CurrentTitle],
  ['input[id="linkedinProfile"]', ProfileKey.LinkedinUrl],
  ['input[name="linkedinProfile"]', ProfileKey.LinkedinUrl],
  ['input[type="file"][name*="resume" i]', ProfileKey.Resume],
  ['input[type="file"][name*="cv" i]', ProfileKey.Resume],
];

export const smartrecruiters: AtsAdapter = {
  id: 'smartrecruiters',
  matches: (url, doc) =>
    /smartrecruiters\.com|jobs\.smartrecruiters\.com|careers\.smartrecruiters\.com/.test(url) ||
    !!doc.querySelector('form[action*="smartrecruiters"]'),
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
