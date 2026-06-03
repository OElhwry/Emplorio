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
      <AppShell active="applications" title="Applications">
        <p style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>
          {status === 'loading' ? 'Loading…' : 'Redirecting to sign in…'}
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell
      active="applications"
      title="Applications"
      subtitle="Track your pipeline from saved to offer."
      email={email}
      onSignOut={signOut}
    >
      <ApplicationsHub showInsights={false} />
    </AppShell>
  );
}
