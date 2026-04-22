import type { AtsAdapter, ProfileKey as PK } from '@emplorio/shared';
import { ProfileKey } from '@emplorio/shared';

const SELECTORS: Array<[string, PK]> = [
  ['#input-applicant\\.name', ProfileKey.FullName],
  ['input[name="applicant.name"]', ProfileKey.FullName],
  ['#input-applicant\\.firstName', ProfileKey.FirstName],
  ['input[name="applicant.firstName"]', ProfileKey.FirstName],
  ['#input-applicant\\.lastName', ProfileKey.LastName],
  ['input[name="applicant.lastName"]', ProfileKey.LastName],
  ['#input-applicant\\.email', ProfileKey.Email],
  ['input[name="applicant.email"]', ProfileKey.Email],
  ['input[type="email"]', ProfileKey.Email],
  ['#input-applicant\\.phoneNumber', ProfileKey.Phone],
  ['input[name="applicant.phoneNumber"]', ProfileKey.Phone],
  ['input[type="tel"]', ProfileKey.Phone],
  ['#input-applicant\\.address\\.city', ProfileKey.City],
  ['input[name="applicant.address.city"]', ProfileKey.City],
  ['#input-applicant\\.address\\.postalCode', ProfileKey.PostalCode],
  ['input[name="applicant.address.postalCode"]', ProfileKey.PostalCode],
  ['input[type="file"][name*="resume" i]', ProfileKey.Resume],
];

export const indeed: AtsAdapter = {
  id: 'indeed',
  matches: (url) => /(?:smartapply|apply)\.indeed\.com|indeed\.com\/.+\/apply/.test(url),
  detectFields: (doc) => {
    const seen = new Set<PK>();
    const out: Array<{ selector: string; key: PK }> = [];
    for (const [selector, key] of SELECTORS) {
      if (seen.has(key)) continue;
      try {
        if (doc.querySelector(selector)) {
          out.push({ selector, key });
          seen.add(key);
        }
      } catch {
        // skip invalid selectors
      }
    }
    return out;
  },
};
