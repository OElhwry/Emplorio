import type { AtsAdapter } from '@emplorio/shared';
import { ProfileKey } from '@emplorio/shared';

export const ashby: AtsAdapter = {
  id: 'ashby',
  matches: (url) => /jobs\.ashbyhq\.com/.test(url),
  detectFields: () => [
    { selector: 'input[name="_systemfield_name"]', key: ProfileKey.FullName },
    { selector: 'input[name="_systemfield_email"]', key: ProfileKey.Email },
    { selector: 'input[name="_systemfield_phone"]', key: ProfileKey.Phone },
  ],
};
