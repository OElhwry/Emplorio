import type { AtsAdapter, ProfileKey as PK } from '@emplorio/shared';
import { ProfileKey } from '@emplorio/shared';

const SELECTORS: Array<[string, PK]> = [
  ['input[name="name"]', ProfileKey.FullName],
  ['input[name="email"]', ProfileKey.Email],
  ['input[name="phone"]', ProfileKey.Phone],
  ['input[name="org"]', ProfileKey.CurrentCompany],
  ['input[name="urls[LinkedIn]"]', ProfileKey.LinkedinUrl],
  ['input[name="urls[GitHub]"]', ProfileKey.GithubUrl],
  ['input[name="urls[Portfolio]"]', ProfileKey.PortfolioUrl],
  ['input[name="urls[Other]"]', ProfileKey.PortfolioUrl],
  ['input[name="location"]', ProfileKey.City],
  ['input[name="resume"]', ProfileKey.Resume],
  ['input[type="file"][name*="resume" i]', ProfileKey.Resume],
];

export const lever: AtsAdapter = {
  id: 'lever',
  matches: (url, doc) =>
    /jobs\.lever\.co/.test(url) || !!doc.querySelector('form[action*="lever.co"]'),
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
