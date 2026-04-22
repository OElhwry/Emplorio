import type { AtsAdapter, ProfileKey as PK } from '@emplorio/shared';
import { ProfileKey } from '@emplorio/shared';

const SELECTORS: Array<[string, PK]> = [
  ['[data-automation-id="legalNameSection_firstName"] input', ProfileKey.FirstName],
  ['input[data-automation-id="firstName"]', ProfileKey.FirstName],
  ['[data-automation-id="legalNameSection_lastName"] input', ProfileKey.LastName],
  ['input[data-automation-id="lastName"]', ProfileKey.LastName],
  ['[data-automation-id="email"] input', ProfileKey.Email],
  ['input[data-automation-id="email"]', ProfileKey.Email],
  ['[data-automation-id="phoneNumber"] input', ProfileKey.Phone],
  ['input[data-automation-id="phone-number"]', ProfileKey.Phone],
  ['[data-automation-id="addressSection_addressLine1"] input', ProfileKey.AddressLine1],
  ['input[data-automation-id="addressLine1"]', ProfileKey.AddressLine1],
  ['input[data-automation-id="addressSection_addressLine1"]', ProfileKey.AddressLine1],
  ['[data-automation-id="addressSection_city"] input', ProfileKey.City],
  ['input[data-automation-id="city"]', ProfileKey.City],
  ['input[data-automation-id="addressSection_city"]', ProfileKey.City],
  ['[data-automation-id="addressSection_postalCode"] input', ProfileKey.PostalCode],
  ['input[data-automation-id="postalCode"]', ProfileKey.PostalCode],
  ['input[data-automation-id="addressSection_postalCode"]', ProfileKey.PostalCode],
  ['input[id="address--addressLine1"]', ProfileKey.AddressLine1],
  ['input[id="address--addressLine2"]', ProfileKey.AddressLine2],
  ['input[id="address--city"]', ProfileKey.City],
  ['input[id="address--postalCode"]', ProfileKey.PostalCode],
  ['input[id="address--countryRegion"]', ProfileKey.State],
  ['input[name="addressLine1"]', ProfileKey.AddressLine1],
  ['input[name="addressLine2"]', ProfileKey.AddressLine2],
  ['input[name="city"]', ProfileKey.City],
  ['input[name="postalCode"]', ProfileKey.PostalCode],
  ['input[data-automation-id="file-upload-input-ref"]', ProfileKey.Resume],
  ['input[type="file"][data-automation-id*="resume" i]', ProfileKey.Resume],
  ['input[type="file"][data-automation-id*="file" i]', ProfileKey.Resume],
];

export const workday: AtsAdapter = {
  id: 'workday',
  matches: (url) => /myworkdayjobs\.com|workday\.com/.test(url),
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
