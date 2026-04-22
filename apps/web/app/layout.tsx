import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Emplorio — Apply once. Send everywhere.',
  description:
    'Chrome extension that auto-fills job applications, drafts tailored cover letters, and tracks every application — so you can apply to 10 jobs in the time it took to apply to one.',
  openGraph: {
    title: 'Emplorio — Apply once. Send everywhere.',
    description:
      'Auto-fill job applications, draft cover letters with AI, track every application. Free Chrome extension.',
    url: 'https://emplorio.co.uk',
    siteName: 'Emplorio',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
