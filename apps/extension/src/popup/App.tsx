import { useEffect, useState } from 'react';
import type { Profile } from '@emplorio/shared';
import { loadProfile, saveProfile } from '../lib/storage.js';

type Tab = 'fill' | 'profile';

export function App() {
  const [tab, setTab] = useState<Tab>('fill');

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <h1 style={styles.title}>Emplorio</h1>
        <nav style={styles.tabs}>
          <TabButton active={tab === 'fill'} onClick={() => setTab('fill')}>
            Fill
          </TabButton>
          <TabButton active={tab === 'profile'} onClick={() => setTab('profile')}>
            Profile
          </TabButton>
        </nav>
      </header>
      {tab === 'fill' ? <FillPanel /> : <ProfilePanel />}
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.tabBtn,
        background: active ? '#111' : 'transparent',
        color: active ? '#fff' : '#444',
      }}
    >
      {children}
    </button>
  );
}

function FillPanel() {
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);

  async function fill() {
    setBusy(true);
    setStatus('');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        setStatus('No active tab.');
        return;
      }
      const res = await chrome.tabs.sendMessage(tab.id, { type: 'FILL' });
      if (!res) {
        setStatus('Page not supported (no content script loaded).');
        return;
      }
      setStatus(`Filled ${res.filled} field${res.filled === 1 ? '' : 's'}.`);
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={styles.panel}>
      <p style={styles.muted}>Open a job application page, then click Fill.</p>
      <button onClick={fill} disabled={busy} style={styles.primaryBtn}>
        {busy ? 'Filling...' : 'Fill this form'}
      </button>
      {status && <p style={styles.status}>{status}</p>}
    </section>
  );
}

const FIELDS: Array<[keyof Profile, string, string?]> = [
  ['firstName', 'First name'],
  ['lastName', 'Last name'],
  ['email', 'Email', 'email'],
  ['phone', 'Phone', 'tel'],
  ['linkedinUrl', 'LinkedIn URL', 'url'],
  ['githubUrl', 'GitHub URL', 'url'],
  ['portfolioUrl', 'Portfolio URL', 'url'],
];

function ProfilePanel() {
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void loadProfile().then((p) => p && setProfile(p));
  }, []);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    await saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <section style={styles.panel}>
      {FIELDS.map(([key, label, type]) => (
        <label key={key} style={styles.label}>
          <span style={styles.labelText}>{label}</span>
          <input
            type={type ?? 'text'}
            value={(profile[key] as string) ?? ''}
            onChange={(e) => update(key, e.target.value as Profile[typeof key])}
            style={styles.input}
          />
        </label>
      ))}
      <button onClick={save} style={styles.primaryBtn}>
        {saved ? 'Saved ✓' : 'Save'}
      </button>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { width: 320, fontFamily: 'system-ui, sans-serif', color: '#111' },
  header: { padding: '12px 16px 0', borderBottom: '1px solid #eee' },
  title: { fontSize: 16, margin: '0 0 8px' },
  tabs: { display: 'flex', gap: 4 },
  tabBtn: {
    flex: 1,
    padding: '6px 10px',
    fontSize: 12,
    border: '1px solid #ddd',
    borderBottom: 'none',
    borderRadius: '6px 6px 0 0',
    cursor: 'pointer',
  },
  panel: { padding: 16, display: 'flex', flexDirection: 'column', gap: 10 },
  muted: { color: '#666', fontSize: 12, margin: 0 },
  primaryBtn: {
    padding: '10px 14px',
    fontSize: 13,
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  status: { fontSize: 12, color: '#333', margin: 0 },
  label: { display: 'flex', flexDirection: 'column', gap: 4 },
  labelText: { fontSize: 11, color: '#555' },
  input: {
    padding: '6px 8px',
    fontSize: 13,
    border: '1px solid #ccc',
    borderRadius: 4,
  },
};
