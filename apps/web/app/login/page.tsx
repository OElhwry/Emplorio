'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchProfile, requestCode, verifyCode } from '../lib/api';
import { profileCompletionPct } from '../lib/completeness';
import styles from './login.module.css';

type Step = 'email' | 'code';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await requestCode(email.trim());
      setStep('code');
    } catch {
      setError('Could not send a code. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await verifyCode(email.trim(), code.trim());
      // Send people with an empty profile straight to fill it; otherwise home.
      const profile = await fetchProfile().catch(() => null);
      const pct = profileCompletionPct(profile);
      router.push(pct < 20 ? '/profile?welcome=1' : '/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/emplorio-mark-light.png" alt="" className={`${styles.markImg} ${styles.markLight}`} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/emplorio-mark-dark.png" alt="" className={`${styles.markImg} ${styles.markDark}`} />
          Emplorio
        </div>

        {step === 'email' ? (
          <>
            <h1 className={styles.title}>Sign in</h1>
            <p className={styles.sub}>We&apos;ll email you a 6-digit code. No password needed.</p>
            <form onSubmit={sendCode} className={styles.form}>
              <label className={styles.field}>
                <span className={styles.label}>Email</span>
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.input}
                />
              </label>
              {error && <p className={styles.error}>{error}</p>}
              <button type="submit" disabled={busy} className={styles.button}>
                {busy ? 'Sending…' : 'Send code'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className={styles.title}>Enter your code</h1>
            <p className={styles.sub}>
              We sent a 6-digit code to <strong>{email}</strong>.
            </p>
            <form onSubmit={submitCode} className={styles.form}>
              <label className={styles.field}>
                <span className={styles.label}>6-digit code</span>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className={`${styles.input} ${styles.codeInput}`}
                />
              </label>
              {error && <p className={styles.error}>{error}</p>}
              <button type="submit" disabled={busy || code.length < 6} className={styles.button}>
                {busy ? 'Verifying…' : 'Verify & continue'}
              </button>
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setError('');
                }}
              >
                Use a different email
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
