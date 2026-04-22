import { useEffect, useRef, useState } from 'react';
import type { Profile } from '@emplorio/shared';
import { loadProfile, saveProfile } from '../lib/storage.js';
import { extractPdfText, fileToDataUrl } from '../lib/cv.js';
import { apiFetch } from '../lib/api.js';

const GENDER_OPTIONS = ['Man', 'Woman', 'Non-Binary', 'Another Gender Identity', 'I prefer not to answer'];
const YES_NO_PREF = ['Yes', 'No', 'I prefer not to answer'];

const BASIC_FIELDS: Array<[keyof Profile, string, string?]> = [
  ['firstName', 'First name'],
  ['lastName', 'Last name'],
  ['email', 'Email', 'email'],
  ['phoneCountryCode', 'Phone country code (e.g. +44)'],
  ['phone', 'Phone'],
  ['country', 'Country'],
  ['city', 'City'],
  ['addressLine1', 'Address line 1'],
  ['addressLine2', 'Address line 2'],
  ['state', 'State / Region'],
  ['postalCode', 'Postal / ZIP code'],
  ['linkedinUrl', 'LinkedIn URL', 'url'],
  ['githubUrl', 'GitHub URL', 'url'],
  ['portfolioUrl', 'Portfolio URL', 'url'],
  ['currentTitle', 'Current title'],
  ['currentCompany', 'Current company'],
];

export function ProfilePanel({ onNeedKey }: { onNeedKey?: () => void } = {}) {
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [saved, setSaved] = useState(false);
  const [cvStatus, setCvStatus] = useState('');
  const [extractStatus, setExtractStatus] = useState('');
  const [extracting, setExtracting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void loadProfile().then((p) => p && setProfile(p));
  }, []);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function updateCsv(key: 'eeoEthnicity' | 'eeoCommunities', raw: string) {
    const arr = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setProfile((prev) => ({ ...prev, [key]: arr }));
    setSaved(false);
  }

  async function onCvChange(e: React.ChangeEvent<HTMLInputElement>) {
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
        websites: [],
        workHistory: [],
        education: [],
        skills: [],
      };
      setProfile(next);
      await saveProfile(next);
      setCvStatus(text ? `Saved · ${text.length.toLocaleString()} chars extracted` : 'Saved (no text extracted — AI tailoring will be limited)');
    } catch (err) {
      setCvStatus(`Error: ${(err as Error).message}`);
    }
  }

  async function clearCv() {
    const next: Partial<Profile> = {
      ...profile,
      cvFile: undefined,
      baseCvText: undefined,
      websites: [],
      workHistory: [],
      education: [],
      skills: [],
    };
    setProfile(next);
    await saveProfile(next);
    if (fileRef.current) fileRef.current.value = '';
    setCvStatus('');
    setExtractStatus('');
  }

  async function extractFromCv() {
    if (!profile.baseCvText || profile.baseCvText.length < 50) {
      setExtractStatus('No CV text available — upload a PDF first.');
      return;
    }
    setExtracting(true);
    setExtractStatus('Extracting structured data with AI…');
    try {
      const res = await apiFetch(`/generate/parse-cv`, {
        method: 'POST',
        body: JSON.stringify({ cvText: profile.baseCvText }),
      });
      if (res.status === 402) {
        setExtractStatus('Add your Anthropic key in Settings to extract CV details.');
        onNeedKey?.();
        return;
      }
      if (!res.ok) {
        setExtractStatus(`API error: ${res.status}`);
        return;
      }
      const data = await res.json();
      const next: Partial<Profile> = {
        ...profile,
        websites: data.websites ?? [],
        workHistory: data.workHistory ?? [],
        education: data.education ?? [],
        skills: data.skills ?? [],
      };
      setProfile(next);
      await saveProfile(next);
      const counts = [
        `${data.workHistory?.length ?? 0} jobs`,
        `${data.education?.length ?? 0} education`,
        `${data.skills?.length ?? 0} skills`,
        `${data.websites?.length ?? 0} websites`,
      ].join(' · ');
      setExtractStatus(`Saved · ${counts}`);
    } catch (err) {
      setExtractStatus(`Error: ${(err as Error).message}`);
    } finally {
      setExtracting(false);
    }
  }

  async function save() {
    await saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <section className="profile-panel">
      <div className="save-bar save-bar-top">
        <button onClick={save} className="btn-primary save-btn">
          {saved ? 'Saved ✓' : 'Save profile'}
        </button>
      </div>
      <SectionHeader title="Basics" />
      <div className="card field-group">
        {BASIC_FIELDS.map(([key, label, type]) => (
          <Field key={key} label={label}>
            <input
              type={type ?? 'text'}
              value={(profile[key] as string) ?? ''}
              onChange={(e) => update(key, e.target.value as Profile[typeof key])}
            />
          </Field>
        ))}
      </div>

      <SectionHeader title="Availability" />
      <div className="card field-group">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={profile.availableStartDate === 'Immediately' || profile.availableStartDate === todayIso()}
            onChange={(e) => update('availableStartDate', e.target.checked ? todayIso() : '')}
          />
          <span>Available to start immediately</span>
        </label>
        <Field label="Available start date (YYYY-MM-DD)">
          <input
            type="text"
            value={profile.availableStartDate ?? ''}
            onChange={(e) => update('availableStartDate', e.target.value)}
            placeholder="e.g. 2026-06-01"
          />
        </Field>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={profile.noticePeriod === 'None'}
            onChange={(e) => update('noticePeriod', e.target.checked ? 'None' : '')}
          />
          <span>No notice period (currently unemployed)</span>
        </label>
        <Field label="Notice period">
          <input
            type="text"
            value={profile.noticePeriod ?? ''}
            onChange={(e) => update('noticePeriod', e.target.value)}
            placeholder="e.g. 2 weeks"
          />
        </Field>
      </div>

      <SectionHeader title="CV / Resume" />
      <div className="card field-group">
        <p className="helper">
          Upload your CV (PDF recommended). It gets attached to applications when you click Fill, and the
          text is used to tailor each cover letter.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf"
          onChange={onCvChange}
          className="file-input"
        />
        {profile.cvFile && (
          <div className="cv-badge">
            <span>📄 {profile.cvFile.name} · {(profile.cvFile.size / 1024).toFixed(0)} KB</span>
            <button onClick={clearCv} className="btn-link danger">Remove</button>
          </div>
        )}
        {cvStatus && <p className="helper">{cvStatus}</p>}

        {profile.baseCvText && (
          <>
            <button
              onClick={extractFromCv}
              disabled={extracting}
              className="btn-secondary"
              title="Sends your CV text to Claude to extract structured work history, education, skills, and websites. Uses AI credits."
            >
              {extracting ? 'Extracting…' : '✨ Extract details from CV (uses AI)'}
            </button>
            {extractStatus && <p className="helper">{extractStatus}</p>}
            {(profile.workHistory?.length || profile.education?.length || profile.skills?.length || profile.websites?.length) ? (
              <div className="preview-box">
                {profile.websites && profile.websites.length > 0 && (
                  <div className="preview-row">
                    <strong>Websites:</strong> {profile.websites.join(', ')}
                  </div>
                )}
                {profile.workHistory && profile.workHistory.length > 0 && (
                  <div className="preview-row">
                    <strong>Work history ({profile.workHistory.length}):</strong>
                    <ul className="preview-list">
                      {profile.workHistory.slice(0, 4).map((w, i) => (
                        <li key={i}>
                          {w.title} · {w.company} ({w.startDate}–{w.endDate ?? 'present'})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {profile.education && profile.education.length > 0 && (
                  <div className="preview-row">
                    <strong>Education ({profile.education.length}):</strong>
                    <ul className="preview-list">
                      {profile.education.map((e, i) => (
                        <li key={i}>
                          {[e.degree, e.fieldOfStudy].filter(Boolean).join(' ')} · {e.institution}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {profile.skills && profile.skills.length > 0 && (
                  <div className="preview-row">
                    <strong>Skills:</strong> {profile.skills.slice(0, 20).join(', ')}
                    {profile.skills.length > 20 ? ` +${profile.skills.length - 20} more` : ''}
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>

      <SectionHeader title="Demographics" subtitle="Optional — used for EEO/diversity questions" />
      <div className="card field-group">
        <Field label="Age">
          <input
            type="number"
            min={1}
            max={120}
            value={profile.eeoAge ?? ''}
            onChange={(e) => update('eeoAge', e.target.value === '' ? undefined : Number(e.target.value))}
            placeholder="e.g. 25"
          />
        </Field>
        <SelectField
          label="Gender identity"
          value={profile.eeoGender ?? ''}
          options={GENDER_OPTIONS}
          onChange={(v) => update('eeoGender', v)}
        />
        <Field label="Ethnicity (comma-separated)" hint='Use the words you’d recognise in a form (e.g. "White", "Black", "Asian", "Hispanic"). Each will be matched fuzzily.'>
          <input
            type="text"
            value={(profile.eeoEthnicity ?? []).join(', ')}
            onChange={(e) => updateCsv('eeoEthnicity', e.target.value)}
            placeholder="e.g. Asian, Hispanic"
          />
        </Field>
        <Field label="Communities (comma-separated)">
          <input
            type="text"
            value={(profile.eeoCommunities ?? []).join(', ')}
            onChange={(e) => updateCsv('eeoCommunities', e.target.value)}
            placeholder="e.g. Parent, Veteran, Neurodivergent"
          />
        </Field>
        <SelectField
          label="Veteran status"
          value={profile.eeoVeteranStatus ?? ''}
          options={YES_NO_PREF}
          onChange={(v) => update('eeoVeteranStatus', v)}
        />
        <SelectField
          label="Disability status"
          value={profile.eeoDisabilityStatus ?? ''}
          options={YES_NO_PREF}
          onChange={(v) => update('eeoDisabilityStatus', v)}
        />
      </div>

      <div className="save-bar">
        <button onClick={save} className="btn-primary save-btn">
          {saved ? 'Saved ✓' : 'Save profile'}
        </button>
      </div>
    </section>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {subtitle && <span>{subtitle}</span>}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function todayIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}
