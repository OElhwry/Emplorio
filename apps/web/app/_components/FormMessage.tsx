'use client';

import styles from './FormMessage.module.css';

type Tone = 'error' | 'success' | 'info';

const ICONS: Record<Tone, React.ReactNode> = {
  error: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

/**
 * A small, consistent inline banner for form errors, successes and hints.
 * Errors announce themselves to assistive tech via role="alert".
 */
export function FormMessage({
  tone = 'error',
  children,
  action,
}: {
  tone?: Tone;
  children: React.ReactNode;
  /** Optional action, e.g. a "Try again" button. */
  action?: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <div
      className={`${styles.msg} ${styles[tone]}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span className={styles.icon}>{ICONS[tone]}</span>
      <span className={styles.text}>{children}</span>
      {action && <span className={styles.action}>{action}</span>}
    </div>
  );
}
