import type { AtsAdapter } from '@emplorio/shared';
import { ProfileKey } from '@emplorio/shared';

export const greenhouse: AtsAdapter = {
  id: 'greenhouse',
  matches: (url) => /greenhouse\.io/.test(url),
  detectFields: () => [
    { selector: '#first_name', key: ProfileKey.FirstName },
    { selector: '#last_name', key: ProfileKey.LastName },
    { selector: '#email', key: ProfileKey.Email },
    { selector: '#phone', key: ProfileKey.Phone },
  ],
};
