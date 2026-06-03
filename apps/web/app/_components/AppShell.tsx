'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { AmbientShapes } from './AmbientShapes';
import styles from './AppShell.module.css';

type Section = 'dashboard' | 'applications' | 'profile';

const NAV: { id: Section; label: string; href: string; icon: ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: <IconGrid /> },
  { id: 'applications', label: 'Applications', href: '/applications', icon: <IconList /> },
  { id: 'profile', label: 'Profile', href: '/profile', icon: <IconUser /> },
];

export function AppShell({
  email,
  active,
  title,
  subtitle,
  onSignOut,
  children,
}: {
  email?: string | null;
  active?: Section;
  title?: string;
  subtitle?: string;
  onSignOut?: () => void | Promise<void>;
  children: ReactNode;
}) {
  useEffect(() => {
    document.title = title ? `Emplorio · ${title}` : 'Emplorio · Apply Once. Send Everywhere.';
  }, [title]);

  return (
    <div className={styles.shell}>
      <AmbientShapes />
      <aside className={styles.sidebar}>
        <a href="/" className={styles.brand} aria-label="Emplorio home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/emplorio-mark-light.png" alt="" className={`${styles.markImg} ${styles.markLight}`} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/emplorio-mark-dark.png" alt="" className={`${styles.markImg} ${styles.markDark}`} />
          <span className={styles.brandText}>Emplorio</span>
        </a>

        <nav className={styles.nav} aria-label="Primary">
          {NAV.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={active === item.id ? styles.navItemActive : styles.navItem}
              aria-current={active === item.id ? 'page' : undefined}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <div className={styles.sidebarFoot}>
          {email && (
            <div className={styles.user}>
              <span className={styles.avatar} aria-hidden="true">
                {email.slice(0, 1).toUpperCase()}
              </span>
              <span className={styles.userEmail}>{email}</span>
            </div>
          )}
          {onSignOut && (
            <button type="button" onClick={() => void onSignOut()} className={styles.signout}>
              Sign out
            </button>
          )}
        </div>
      </aside>

      <div className={styles.content}>
        <header className={styles.topbar}>
          <div>
            {title && <h1 className={styles.topTitle}>{title}</h1>}
            {subtitle && <p className={styles.topSubtitle}>{subtitle}</p>}
          </div>
          <ThemeToggle />
        </header>
        <main className={styles.main}>{children}</main>
      </div>
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
      {theme === 'dark' ? '☾ Dark' : '☀ Light'}
    </button>
  );
}

function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function IconList() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
