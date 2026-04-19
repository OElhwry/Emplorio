import type { AtsAdapter } from '@emplorio/shared';
import { ProfileKey } from '@emplorio/shared';

export const lever: AtsAdapter = {
  id: 'lever',
  matches: (url) => /jobs\.lever\.co/.test(url),
  detectFields: () => [
    { selector: 'input[name="name"]', key: ProfileKey.FullName },
    { selector: 'input[name="email"]', key: ProfileKey.Email },
    { selector: 'input[name="phone"]', key: ProfileKey.Phone },
    { selector: 'input[name="urls[LinkedIn]"]', key: ProfileKey.LinkedinUrl },
    { selector: 'input[name="urls[GitHub]"]', key: ProfileKey.GithubUrl },
  ],
};
