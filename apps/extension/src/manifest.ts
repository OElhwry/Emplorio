import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Emplorio',
  description: 'Apply once. Send everywhere.',
  version: '0.0.1',
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'Emplorio',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: [
        'https://boards.greenhouse.io/*',
        'https://*.greenhouse.io/*',
        'https://jobs.lever.co/*',
        'https://*.myworkdayjobs.com/*',
        'https://jobs.ashbyhq.com/*',
      ],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  permissions: ['storage', 'activeTab', 'scripting'],
  host_permissions: ['https://*/*'],
});
