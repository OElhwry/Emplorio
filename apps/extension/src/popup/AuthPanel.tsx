import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { saveSession, setCachedToken, type Session } from '../lib/auth.js';

type Step = 'email' | 'code';

const AUTH_DRAFT_KEY = 'emplorioAuthDraft';

interface AuthDraft {
  step: Step;
  email: string;
  code: string;
  remember: boolean;
}

async function loadDraft(): Promise<AuthDraft | null> {
  const got = await chrome.storage.local.get(AUTH_DRAFT_KEY);
  return (got[AUTH_DRAFT_KEY] as AuthDraft | undefined) ?? null;
}

async function saveDraft(d: AuthDraft): Promise<void> {
  await chrome.storage.local.set({ [AUTH_DRAFT_KEY]: d });
}

async function clearDraft(): Promise<void> {
  await chrome.storage.local.remove(AUTH_DRAFT_KEY);
}

export function AuthPanel({ onSignedIn }: { onSignedIn: (s: Session) => void }) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void loadDraft().then((d) => {
      if (d) {
        setStep(d.step);
        setEmail(d.email);
        setCode(d.code);
        setRemember(d.remember);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void saveDraft({ step, email, code, remember });
  }, [hydrated, step, email, code, remember]);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus('');
    if (!email.trim()) return;
    setBusy(true);
    try {
      const res = await apiFetch('/auth/request-code', {
        method: 'POST',
        headers: { Authorization: '' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        setStatus(`Couldn't send code (${res.status}). Check your email and try again.`);
        return;
      }
      setStep('code');
      setStatus('Code sent — check your inbox (and spam).');
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setStatus('');
    if (!/^\d{6}$/.test(code)) {
      setStatus('Code must be 6 digits.');
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch('/auth/verify', {
        method: 'POST',
        headers: { Authorization: '' },
        body: JSON.stringify({ email: email.trim(), code, remember }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data?.error ?? `Sign-in failed (${res.status}).`);
        return;
      }
      const session: Session = {
        token: data.token,
        userId: data.userId,
        email: data.email,
        expiresAt: data.expiresAt,
      };
      await saveSession(session);
      setCachedToken(session.token);
      await clearDraft();
      onSignedIn(session);
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setStatus('');
    setBusy(true);
    try {
      await apiFetch('/auth/request-code', {
        method: 'POST',
        headers: { Authorization: '' },
        body: JSON.stringify({ email: email.trim() }),
      });
      setStatus('New code sent.');
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated) return <section className="onboarding" />;

  return (
    <section className="onboarding">
      <h2 className="onb-title">Sign in to Emplorio</h2>
      <p className="onb-body">
        Sign in with your email so your profile and applications sync across devices.
      </p>

      {step === 'email' && (
        <form onSubmit={requestCode} className="field-group">
          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span>Keep me signed in for 30 days</span>
          </label>
          {status && <p className="helper">{status}</p>}
          <div className="onb-actions">
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? 'Sending…' : 'Email me a code'}
            </button>
          </div>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={verify} className="field-group">
          <p className="helper">Sent a 6-digit code to <strong>{email}</strong>.</p>
          <label className="field">
            <span className="field-label">Code</span>
            <input
              autoFocus
              required
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              style={{ letterSpacing: '6px', fontSize: '20px', textAlign: 'center' }}
            />
          </label>
          {status && <p className="helper">{status}</p>}
          <div className="onb-actions">
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
                setStatus('');
                void saveDraft({ step: 'email', email, code: '', remember });
              }}
              className="btn-link"
            >
              Use different email
            </button>
            <button type="submit" disabled={busy || code.length !== 6} className="btn-primary">
              {busy ? 'Verifying…' : 'Sign in'}
            </button>
          </div>
          <div className="onb-actions" style={{ justifyContent: 'flex-end' }}>
            <button type="button" onClick={resend} disabled={busy} className="btn-link">
              Resend code
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
