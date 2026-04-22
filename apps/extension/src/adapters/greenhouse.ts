import type { AtsAdapter, ProfileKey as PK } from '@emplorio/shared';
import { ProfileKey } from '@emplorio/shared';

const SELECTORS: Array<[string, PK]> = [
  ['#first_name', ProfileKey.FirstName],
  ['input[name="job_application[first_name]"]', ProfileKey.FirstName],
  ['input[autocomplete="given-name"]', ProfileKey.FirstName],

  ['#last_name', ProfileKey.LastName],
  ['input[name="job_application[last_name]"]', ProfileKey.LastName],
  ['input[autocomplete="family-name"]', ProfileKey.LastName],

  ['#email', ProfileKey.Email],
  ['input[name="job_application[email]"]', ProfileKey.Email],
  ['input[type="email"]', ProfileKey.Email],

  ['#phone', ProfileKey.Phone],
  ['input[name="job_application[phone]"]', ProfileKey.Phone],
  ['input[type="tel"]', ProfileKey.Phone],

  ['#resume', ProfileKey.Resume],
  ['input[name="job_application[resume]"]', ProfileKey.Resume],
  ['input[type="file"][name*="resume" i]', ProfileKey.Resume],
];

export const greenhouse: AtsAdapter = {
  id: 'greenhouse',
  matches: (url, doc) =>
    /greenhouse\.io/.test(url) ||
    !!doc.querySelector('form#application_form, form[action*="greenhouse"]'),
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
