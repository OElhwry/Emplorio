import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Emplorio — Apply once. Send everywhere.',
  description:
    'Chrome extension that auto-fills job applications, drafts tailored cover letters, and tracks every application — so you can apply to 10 jobs in the time it took to apply to one.',
  icons: {
    icon: '/emplorio-mark-dark.png',
    apple: '/emplorio-mark-dark.png',
  },
  openGraph: {
    title: 'Emplorio — Apply once. Send everywhere.',
    description:
      'Auto-fill job applications, draft cover letters with AI, track every application. Free Chrome extension.',
    url: 'https://emplorio.co.uk',
    siteName: 'Emplorio',
    type: 'website',
    images: [{ url: '/emplorio-mark-dark.png' }],
  },
};

const themeBootScript = `(function(){try{var t=localStorage.getItem('emplorio-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
