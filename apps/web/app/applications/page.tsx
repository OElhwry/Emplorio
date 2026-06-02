'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/useAuth';
import { AppShell } from '../_components/AppShell';
import { ApplicationsHub } from '../_components/ApplicationsHub';

export default function ApplicationsPage() {
  const router = useRouter();
  const { status, email, signOut } = useAuth();

  useEffect(() => {
    if (status === 'anon') router.replace('/login');
  }, [status, router]);

  if (status !== 'authed') {
    return (
      <AppShell active="applications">
        <p style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>
          {status === 'loading' ? 'Loading…' : 'Redirecting to sign in…'}
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell active="applications" email={email} onSignOut={signOut}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem', letterSpacing: '-0.02em' }}>Applications</h1>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
          Track your pipeline from saved to offer.
        </p>
      </div>
      <ApplicationsHub showInsights={false} />
    </AppShell>
  );
}
