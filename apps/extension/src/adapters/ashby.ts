import type { AtsAdapter, ProfileKey as PK } from '@emplorio/shared';
import { ProfileKey } from '@emplorio/shared';

const SELECTORS: Array<[string, PK]> = [
  ['input[name="_systemfield_name"]', ProfileKey.FullName],
  ['input[id="_systemfield_name"]', ProfileKey.FullName],
  ['input[name="_systemfield_email"]', ProfileKey.Email],
  ['input[id="_systemfield_email"]', ProfileKey.Email],
  ['input[name="_systemfield_phone"]', ProfileKey.Phone],
  ['input[id="_systemfield_phone"]', ProfileKey.Phone],
  ['input[name="_systemfield_linkedinUrl"]', ProfileKey.LinkedinUrl],
  ['input[name="_systemfield_github"]', ProfileKey.GithubUrl],
  ['input[name="_systemfield_website"]', ProfileKey.PortfolioUrl],
  ['input[name="_systemfield_location"]', ProfileKey.City],
  ['input[name="_systemfield_resume"]', ProfileKey.Resume],
  ['input[type="file"][name*="resume" i]', ProfileKey.Resume],
];

export const ashby: AtsAdapter = {
  id: 'ashby',
  matches: (url, doc) =>
    /jobs\.ashbyhq\.com|ashbyhq\.com\/.+\/application/.test(url) ||
    !!doc.querySelector('[class*="ashby" i], [data-ashby]'),
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
