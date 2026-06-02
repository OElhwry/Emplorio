'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import styles from './AppShell.module.css';

export function AppShell({
  email,
  active,
  onSignOut,
  children,
}: {
  email?: string | null;
  active?: 'profile' | 'applications' | 'dashboard';
  onSignOut?: () => void | Promise<void>;
  children: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <a href="/dashboard" className={styles.brand} aria-label="Emplorio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/emplorio-mark-light.png" alt="" className={`${styles.markImg} ${styles.markLight}`} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/emplorio-mark-dark.png" alt="" className={`${styles.markImg} ${styles.markDark}`} />
            Emplorio
          </a>
          <nav className={styles.links} aria-label="Primary">
            <a href="/dashboard" className={active === 'dashboard' ? styles.linkActive : styles.link}>
              Dashboard
            </a>
            <a href="/profile" className={active === 'profile' ? styles.linkActive : styles.link}>
              Profile
            </a>
            <a
              href="/applications"
              className={active === 'applications' ? styles.linkActive : styles.link}
            >
              Applications
            </a>
            <ThemeToggle />
            {email && <span className={styles.email}>{email}</span>}
            {onSignOut && (
              <button type="button" onClick={() => void onSignOut()} className={styles.signout}>
                Sign out
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const initial = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'dark';
    setTheme(initial);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('emplorio-theme', next);
    } catch {
      // ignore
    }
  }

  return (
    <button type="button" onClick={toggle} className={styles.theme} aria-label="Toggle theme">
      {theme === 'dark' ? '☾' : '☀'}
    </button>
  );
}
