import { useEffect, useRef, useState } from 'react';
import type { EducationEntry, Profile, WorkHistoryEntry } from '@emplorio/shared';
import { loadProfile, saveProfile } from '../lib/storage.js';
import { extractPdfText, fileToDataUrl } from '../lib/cv.js';
import { apiFetch } from '../lib/api.js';

const GENDER_OPTIONS = ['Man', 'Woman', 'Non-Binary', 'Another Gender Identity', 'I prefer not to answer'];
const YES_NO_PREF = ['Yes', 'No', 'I prefer not to answer'];
const SPONSORSHIP_OPTIONS = ['No', 'Yes'];

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

      <SectionHeader title="Work eligibility" />
      <div className="card field-group">
        <Field label="Work authorization" hint="e.g. UK citizen, US Green Card, requires Tier 2">
          <input
            type="text"
            value={profile.workAuthorization ?? ''}
            onChange={(e) => update('workAuthorization', e.target.value)}
            placeholder="e.g. UK citizen"
          />
        </Field>
        <SelectField
          label="Requires visa sponsorship?"
          value={profile.requiresSponsorship == null ? '' : profile.requiresSponsorship ? 'Yes' : 'No'}
          options={SPONSORSHIP_OPTIONS}
          onChange={(v) => update('requiresSponsorship', v === '' ? undefined : v === 'Yes')}
        />
        <Field label="Years of experience">
          <input
            type="number"
            min={0}
            value={profile.yearsExperience ?? ''}
            onChange={(e) => update('yearsExperience', e.target.value === '' ? undefined : Number(e.target.value))}
            placeholder="e.g. 5"
          />
        </Field>
        <Field label="Desired salary">
          <input
            type="text"
            value={profile.desiredSalary ?? ''}
            onChange={(e) => update('desiredSalary', e.target.value)}
            placeholder="e.g. £65,000"
          />
        </Field>
      </div>

      <SectionHeader title="Experience" />
      <WorkHistoryEditor
        items={profile.workHistory ?? []}
        onChange={(v) => update('workHistory', v)}
      />

      <SectionHeader title="Education" />
      <EducationEditor
        items={profile.education ?? []}
        onChange={(v) => update('education', v)}
      />

      <SectionHeader title="Skills" />
      <SkillsEditor skills={profile.skills ?? []} onChange={(v) => update('skills', v)} />

      <SectionHeader title="Websites" />
      <WebsitesEditor sites={profile.websites ?? []} onChange={(v) => update('websites', v)} />

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

function WorkHistoryEditor({
  items,
  onChange,
}: {
  items: WorkHistoryEntry[];
  onChange: (v: WorkHistoryEntry[]) => void;
}) {
  function upd(i: number, patch: Partial<WorkHistoryEntry>) {
    onChange(items.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }
  function add() {
    onChange([
      ...items,
      { id: crypto.randomUUID(), company: '', title: '', startDate: '', endDate: null, current: false, location: '', bullets: [] },
    ]);
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  return (
    <>
      {items.map((e, i) => (
        <div key={e.id ?? i} className="card field-group">
          <div className="entry-head">
            <h3>{e.title || e.company || `Role ${i + 1}`}</h3>
            <button onClick={() => remove(i)} className="btn-link danger">Remove</button>
          </div>
          <Field label="Job title">
            <input value={e.title} onChange={(ev) => upd(i, { title: ev.target.value })} />
          </Field>
          <Field label="Company">
            <input value={e.company} onChange={(ev) => upd(i, { company: ev.target.value })} />
          </Field>
          <Field label="Location">
            <input value={e.location ?? ''} onChange={(ev) => upd(i, { location: ev.target.value })} />
          </Field>
          <Field label="Start (YYYY-MM)">
            <input value={e.startDate} placeholder="2022-01" onChange={(ev) => upd(i, { startDate: ev.target.value })} />
          </Field>
          {!e.current && (
            <Field label="End (YYYY-MM)">
              <input value={e.endDate ?? ''} placeholder="2024-06" onChange={(ev) => upd(i, { endDate: ev.target.value || null })} />
            </Field>
          )}
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={!!e.current}
              onChange={(ev) => upd(i, { current: ev.target.checked, endDate: ev.target.checked ? null : e.endDate })}
            />
            <span>I currently work here</span>
          </label>
          <Field label="Highlights (one per line)">
            <textarea
              rows={3}
              value={(e.bullets ?? []).join('\n')}
              onChange={(ev) => upd(i, { bullets: ev.target.value.split('\n').filter((b) => b.trim() !== '') })}
            />
          </Field>
        </div>
      ))}
      <button onClick={add} className="btn-secondary">+ Add experience</button>
    </>
  );
}

function EducationEditor({
  items,
  onChange,
}: {
  items: EducationEntry[];
  onChange: (v: EducationEntry[]) => void;
}) {
  function upd(i: number, patch: Partial<EducationEntry>) {
    onChange(items.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }
  function add() {
    onChange([
      ...items,
      { id: crypto.randomUUID(), institution: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', gpa: '' },
    ]);
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  return (
    <>
      {items.map((e, i) => (
        <div key={e.id ?? i} className="card field-group">
          <div className="entry-head">
            <h3>{e.institution || `Education ${i + 1}`}</h3>
            <button onClick={() => remove(i)} className="btn-link danger">Remove</button>
          </div>
          <Field label="School / Institution">
            <input value={e.institution} onChange={(ev) => upd(i, { institution: ev.target.value })} />
          </Field>
          <Field label="Degree">
            <input value={e.degree ?? ''} placeholder="BSc" onChange={(ev) => upd(i, { degree: ev.target.value })} />
          </Field>
          <Field label="Field of study">
            <input value={e.fieldOfStudy ?? ''} placeholder="Computer Science" onChange={(ev) => upd(i, { fieldOfStudy: ev.target.value })} />
          </Field>
          <Field label="Start (YYYY-MM)">
            <input value={e.startDate ?? ''} placeholder="2018-09" onChange={(ev) => upd(i, { startDate: ev.target.value })} />
          </Field>
          <Field label="End (YYYY-MM)">
            <input value={e.endDate ?? ''} placeholder="2021-06" onChange={(ev) => upd(i, { endDate: ev.target.value })} />
          </Field>
          <Field label="GPA / Grade">
            <input value={e.gpa ?? ''} onChange={(ev) => upd(i, { gpa: ev.target.value })} />
          </Field>
        </div>
      ))}
      <button onClick={add} className="btn-secondary">+ Add education</button>
    </>
  );
}

function SkillsEditor({ skills, onChange }: { skills: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('');
  function add() {
    const v = draft.trim();
    if (!v || skills.includes(v)) {
      setDraft('');
      return;
    }
    onChange([...skills, v]);
    setDraft('');
  }
  return (
    <div className="card field-group">
      <div className="tag-list">
        {skills.map((s, i) => (
          <span key={`${s}-${i}`} className="tag">
            {s}
            <button onClick={() => onChange(skills.filter((_, idx) => idx !== i))} aria-label={`Remove ${s}`}>✕</button>
          </span>
        ))}
        {skills.length === 0 && <span className="helper">No skills yet. Add some below.</span>}
      </div>
      <div className="history-actions">
        <input
          value={draft}
          placeholder="Type a skill, press Enter"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button onClick={add} className="btn-secondary">Add</button>
      </div>
    </div>
  );
}

function WebsitesEditor({ sites, onChange }: { sites: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="card field-group">
      {sites.map((w, i) => (
        <div key={i} className="history-actions">
          <input
            value={w}
            placeholder="https://…"
            onChange={(e) => {
              const next = [...sites];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <button onClick={() => onChange(sites.filter((_, idx) => idx !== i))} className="btn-link danger">Remove</button>
        </div>
      ))}
      <button onClick={() => onChange([...sites, ''])} className="btn-secondary">+ Add website</button>
    </div>
  );
}
