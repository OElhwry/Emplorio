'use client';

import { useEffect, useState } from 'react';
import { fetchMe, getToken, logout as apiLogout } from './api';

export type AuthStatus = 'loading' | 'authed' | 'anon';

export interface AuthState {
  status: AuthStatus;
  email: string | null;
  signOut: () => Promise<void>;
}

/**
 * Client-side auth state backed by the bearer token in localStorage, validated
 * against /auth/me. Pages can redirect when status is 'anon'.
 */
export function useAuth(): AuthState {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!getToken()) {
      setStatus('anon');
      return;
    }
    void fetchMe().then((me) => {
      if (cancelled) return;
      if (me) {
        setEmail(me.email);
        setStatus('authed');
      } else {
        setStatus('anon');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    await apiLogout();
    setEmail(null);
    setStatus('anon');
  }

  return { status, email, signOut };
}
