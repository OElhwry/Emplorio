'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/useAuth';
import { AppShell } from '../_components/AppShell';
import { PageLoader } from '../_components/PageLoader';
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
        <div style={{ padding: '2rem 0' }}>
          {status === 'loading' ? (
            <PageLoader />
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Redirecting to sign in…</p>
          )}
        </div>
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
