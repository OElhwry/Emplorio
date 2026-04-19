import type { AtsAdapter } from '@emplorio/shared';
import { ProfileKey } from '@emplorio/shared';

export const workday: AtsAdapter = {
  id: 'workday',
  matches: (url) => /myworkdayjobs\.com/.test(url),
  detectFields: () => [
    { selector: '[data-automation-id="legalNameSection_firstName"] input', key: ProfileKey.FirstName },
    { selector: '[data-automation-id="legalNameSection_lastName"] input', key: ProfileKey.LastName },
    { selector: '[data-automation-id="email"] input', key: ProfileKey.Email },
    { selector: '[data-automation-id="phoneNumber"] input', key: ProfileKey.Phone },
  ],
};
