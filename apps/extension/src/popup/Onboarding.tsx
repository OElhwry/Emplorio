import { useRef, useState } from 'react';
import type { Profile } from '@emplorio/shared';
import { loadProfile, saveProfile } from '../lib/storage.js';
import { extractPdfText, fileToDataUrl } from '../lib/cv.js';
import { apiFetch } from '../lib/api.js';

const ONBOARDING_KEY = 'emplorioOnboardingComplete';

export async function isOnboardingComplete(): Promise<boolean> {
  const got = await chrome.storage.local.get(ONBOARDING_KEY);
  if (got[ONBOARDING_KEY]) return true;
  const profile = await loadProfile();
  return !!(profile?.firstName && profile?.email);
}

export async function markOnboardingComplete() {
  await chrome.storage.local.set({ [ONBOARDING_KEY]: true });
}

type Step = 'welcome' | 'cv' | 'extract' | 'basics' | 'done';

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>('welcome');
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [cvStatus, setCvStatus] = useState('');
  const [extractStatus, setExtractStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleCv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCvStatus('Reading…');
    try {
      const dataUrl = await fileToDataUrl(file);
      let text = '';
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setCvStatus('Extracting text…');
        text = await extractPdfText(file);
      }
      const next: Partial<Profile> = {
        ...profile,
        cvFile: {
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl,
          uploadedAt: Date.now(),
        },
        baseCvText: text || profile.baseCvText,
      };
      setProfile(next);
      await saveProfile(next);
      setCvStatus(text ? `✓ ${file.name} · ${text.length.toLocaleString()} chars` : `✓ ${file.name}`);
    } catch (err) {
      setCvStatus(`Error: ${(err as Error).message}`);
    }
  }

  async function runExtract() {
    if (!profile.baseCvText) {
      setStep('basics');
      return;
    }
    setBusy(true);
    setExtractStatus('Asking Claude to read your CV…');
    try {
      const res = await apiFetch(`/generate/parse-cv`, {
        method: 'POST',
        body: JSON.stringify({ cvText: profile.baseCvText }),
      });
      if (res.status === 402) {
        setExtractStatus(
          'No AI key set yet — skip this step and add your Anthropic key in Settings later to use CV extract.',
        );
        return;
      }
      if (!res.ok) {
        setExtractStatus(`API error: ${res.status} — you can fill the rest manually later.`);
        return;
      }
      const data = await res.json();
      const next: Partial<Profile> = {
        ...profile,
        websites: data.websites ?? [],
        workHistory: data.workHistory ?? [],
        education: data.education ?? [],
        skills: data.skills ?? [],
        currentTitle: profile.currentTitle ?? data.workHistory?.[0]?.title,
        currentCompany: profile.currentCompany ?? data.workHistory?.[0]?.company,
      };
      setProfile(next);
      await saveProfile(next);
      const counts = `${data.workHistory?.length ?? 0} jobs · ${data.education?.length ?? 0} education · ${data.skills?.length ?? 0} skills`;
      setExtractStatus(`✓ Extracted ${counts}`);
      setStep('basics');
    } catch (err) {
      setExtractStatus(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function saveBasicsAndFinish() {
    await saveProfile(profile);
    await markOnboardingComplete();
    onDone();
  }

  async function skip() {
    await markOnboardingComplete();
    onDone();
  }

  return (
    <section className="onboarding">
      <div className="onb-progress">
        {(['welcome', 'cv', 'extract', 'basics', 'done'] as Step[]).map((s, i) => (
          <span
            key={s}
            className={`onb-dot ${s === step ? 'active' : ''} ${stepIndex(step) > i ? 'done' : ''}`}
          />
        ))}
      </div>

      {step === 'welcome' && (
        <>
          <h2 className="onb-title">Welcome to Emplorio</h2>
          <p className="onb-body">
            Apply once, send everywhere. We'll set you up in three quick steps so the extension can fill
            forms with your details.
          </p>
          <ul className="onb-list">
            <li>📄 Upload your CV</li>
            <li>✨ Let AI extract your work history</li>
            <li>👤 Confirm the basics</li>
          </ul>
          <div className="onb-actions">
            <button onClick={skip} className="btn-link">Skip — I'll do it later</button>
            <button onClick={() => setStep('cv')} className="btn-primary">Get started</button>
          </div>
        </>
      )}

      {step === 'cv' && (
        <>
          <h2 className="onb-title">Step 1 · Upload your CV</h2>
          <p className="onb-body">
            PDF works best. We extract the text so cover letters can quote your actual experience.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf"
            onChange={handleCv}
            className="file-input"
          />
          {cvStatus && <p className="helper">{cvStatus}</p>}
          <div className="onb-actions">
            <button onClick={() => setStep('basics')} className="btn-link">Skip CV</button>
            <button
              onClick={() => setStep(profile.baseCvText ? 'extract' : 'basics')}
              className="btn-primary"
              disabled={!profile.cvFile}
            >
              Next
            </button>
          </div>
        </>
      )}

      {step === 'extract' && (
        <>
          <h2 className="onb-title">Step 2 · Extract details</h2>
          <p className="onb-body">
            Claude reads your CV and pulls out work history, education, skills, and websites. One AI call
            saves you from typing it all in.
          </p>
          {extractStatus && <p className="helper">{extractStatus}</p>}
          <div className="onb-actions">
            <button onClick={() => setStep('basics')} className="btn-link">Skip — fill manually</button>
            <button onClick={runExtract} disabled={busy} className="btn-primary">
              {busy ? 'Extracting…' : '✨ Extract with AI'}
            </button>
          </div>
        </>
      )}

      {step === 'basics' && (
        <>
          <h2 className="onb-title">Step 3 · Confirm the basics</h2>
          <p className="onb-body">These are the most-asked fields on every form.</p>
          <div className="field-group">
            <Field label="First name">
              <input
                value={profile.firstName ?? ''}
                onChange={(e) => update('firstName', e.target.value)}
              />
            </Field>
            <Field label="Last name">
              <input
                value={profile.lastName ?? ''}
                onChange={(e) => update('lastName', e.target.value)}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={profile.email ?? ''}
                onChange={(e) => update('email', e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <input
                value={profile.phone ?? ''}
                onChange={(e) => update('phone', e.target.value)}
              />
            </Field>
          </div>
          <div className="onb-actions">
            <button onClick={skip} className="btn-link">Skip</button>
            <button
              onClick={() => setStep('done')}
              className="btn-primary"
              disabled={!profile.firstName || !profile.email}
            >
              Next
            </button>
          </div>
        </>
      )}

      {step === 'done' && (
        <>
          <h2 className="onb-title">You're set 🎉</h2>
          <p className="onb-body">Open a job page and try the keyboard shortcuts:</p>
          <div className="card onb-shortcuts">
            <div className="onb-shortcut"><span><kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>F</kbd></span><span>Fill the current form</span></div>
            <div className="onb-shortcut"><span><kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>S</kbd></span><span>Save job to history</span></div>
            <div className="onb-shortcut"><span><kbd>Alt</kbd> <kbd>Shift</kbd> <kbd>E</kbd></span><span>Open Emplorio</span></div>
          </div>
          <p className="helper">You can edit your profile any time from the Profile tab.</p>
          <div className="onb-actions">
            <button onClick={saveBasicsAndFinish} className="btn-primary onb-finish">
              Start applying
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function stepIndex(s: Step): number {
  return ['welcome', 'cv', 'extract', 'basics', 'done'].indexOf(s);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
