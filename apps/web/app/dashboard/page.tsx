'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/useAuth';
import { AppShell } from '../_components/AppShell';
import { ApplicationsHub } from '../_components/ApplicationsHub';

export default function DashboardPage() {
  const router = useRouter();
  const { status, email, signOut } = useAuth();

  useEffect(() => {
    if (status === 'anon') router.replace('/login');
  }, [status, router]);

  if (status !== 'authed') {
    return (
      <AppShell active="dashboard" title="Dashboard">
        <p style={{ color: 'var(--text-muted)', padding: '2rem 0' }}>
          {status === 'loading' ? 'Loading…' : 'Redirecting to sign in…'}
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell
      active="dashboard"
      title="Dashboard"
      subtitle="Every application you've saved or applied to, synced from the extension."
      email={email}
      onSignOut={signOut}
    >
      <ApplicationsHub showInsights />
    </AppShell>
  );
}
