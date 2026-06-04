'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/useAuth';
import { AppShell } from '../_components/AppShell';
import { PageLoader } from '../_components/PageLoader';
import { ProfileEditor } from './ProfileEditor';

export default function ProfilePage() {
  const router = useRouter();
  const { status, email, signOut } = useAuth();

  useEffect(() => {
    if (status === 'anon') router.replace('/login');
  }, [status, router]);

  if (status !== 'authed') {
    return (
      <AppShell active="profile" title="Profile">
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
      active="profile"
      title="Profile"
      subtitle="Fill it once. Emplorio autofills every application for you."
      email={email}
      onSignOut={signOut}
    >
      <ProfileEditor />
    </AppShell>
  );
}
