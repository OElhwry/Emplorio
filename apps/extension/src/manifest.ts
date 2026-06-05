import { defineManifest } from '@crxjs/vite-plugin';

// The job sites where the content script runs (and where the panel renders the icon).
const SITE_MATCHES = [
  'https://boards.greenhouse.io/*',
  'https://job-boards.greenhouse.io/*',
  'https://*.greenhouse.io/*',
  'https://jobs.lever.co/*',
  'https://*.lever.co/*',
  'https://*.myworkdayjobs.com/*',
  'https://*.workday.com/*',
  'https://jobs.ashbyhq.com/*',
  'https://*.ashbyhq.com/*',
  'https://www.linkedin.com/*',
  'https://*.indeed.com/*',
  'https://smartapply.indeed.com/*',
  'https://apply.workable.com/*',
  'https://*.workable.com/*',
  'https://*.smartrecruiters.com/*',
  'https://jobs.smartrecruiters.com/*',
  'https://careers.smartrecruiters.com/*',
  'https://*.icims.com/*',
];

export default defineManifest({
  manifest_version: 3,
  name: 'Emplorio · Autofill Job Applications, AI Cover Letters & Tracker',
  description: 'The faster way to apply. Autofill job applications in one click, write AI cover letters, and track every role all in one place.',
  version: '1.0.4',
  homepage_url: 'https://emplorio.co.uk',
  icons: {
    '16': 'icon16.png',
    '32': 'icon32.png',
    '48': 'icon48.png',
    '128': 'icon128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'Emplorio',
    default_icon: {
      '16': 'icon16.png',
      '32': 'icon32.png',
      '48': 'icon48.png',
    },
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: SITE_MATCHES,
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  permissions: ['storage', 'activeTab'],
  host_permissions: ['https://emplorio-api.fly.dev/*'],
  // The on-page panel (injected into a shadow DOM) renders the brand icon, so the
  // icon file must be reachable from page context, but only on the job sites above.
  web_accessible_resources: [
    {
      resources: ['icon128.png'],
      matches: SITE_MATCHES,
    },
  ],
  commands: {
    _execute_action: {
      suggested_key: { default: 'Alt+Shift+E' },
      description: 'Open Emplorio',
    },
    'fill-form': {
      suggested_key: { default: 'Alt+Shift+F' },
      description: 'Fill the current form',
    },
    'save-page': {
      suggested_key: { default: 'Alt+Shift+S' },
      description: 'Save current job to history',
    },
  },
});
