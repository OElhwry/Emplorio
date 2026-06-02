import { useEffect, useState } from 'react';
import { getAnthropicKey, setAnthropicKey } from '../lib/settings.js';
import { IconCheck, IconEye, IconEyeOff, IconLock, IconPower, IconSparkles } from './icons.js';

export function SettingsPanel({
  highlightAi = false,
  sessionEmail,
  onSignOut,
}: {
  highlightAi?: boolean;
  sessionEmail?: string;
  onSignOut?: () => void | Promise<void>;
}) {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState<string | undefined>(undefined);
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState('');
  const [panelEnabled, setPanelEnabled] = useState(true);

  useEffect(() => {
    void getAnthropicKey().then((k) => {
      setSaved(k);
      setKey(k ?? '');
    });
    void chrome.storage.local.get('emplorioPanelEnabled').then((r) => {
      setPanelEnabled(r.emplorioPanelEnabled !== false);
    });
  }, []);

  async function togglePanel(next: boolean) {
    setPanelEnabled(next);
    await chrome.storage.local.set({ emplorioPanelEnabled: next });
  }

  async function save() {
    const trimmed = key.trim();
    if (trimmed && !trimmed.startsWith('sk-ant-')) {
      setStatus('Anthropic keys start with "sk-ant-". Double-check what you pasted.');
      return;
    }
    await setAnthropicKey(trimmed || undefined);
    setSaved(trimmed || undefined);
    setStatus(trimmed ? 'Key saved locally on your device.' : 'Key cleared.');
  }

  async function clearKey() {
    await setAnthropicKey(undefined);
    setSaved(undefined);
    setKey('');
    setStatus('Key removed.');
  }

  const masked = saved ? `${saved.slice(0, 10)}…${saved.slice(-4)}` : null;

  return (
    <section className="profile-panel">
      <div className="card" style={highlightAi ? { borderColor: 'var(--accent)', borderWidth: 2 } : undefined}>
        <div className="section-header">
          <h3>AI provider</h3>
          {masked && <span className="cv-badge">{masked}</span>}
        </div>
        <p className="field-hint">
          Emplorio uses Anthropic's Claude for cover letters, question answers, follow-ups, and CV
          parsing. Bring your own key — it stays on your device and is sent only with AI requests.
        </p>
        <p className="field-hint">
          Don't have one yet? Get a key at{' '}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
            console.anthropic.com/settings/keys
          </a>
          . The free tier is enough to try Emplorio.
        </p>
        <div className="field-group">
          <label className="field">
            <span className="field-label">Anthropic API key</span>
            <div className="key-input-wrap">
              <input
                type={show ? 'text' : 'password'}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sk-ant-..."
                spellCheck={false}
                autoComplete="off"
                className="key-input"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="key-toggle"
                aria-label={show ? 'Hide key' : 'Show key'}
                title={show ? 'Hide key' : 'Show key'}
              >
                {show ? <IconEyeOff size={15} /> : <IconEye size={15} />}
              </button>
            </div>
          </label>
          {status && <p className={`helper ${status.startsWith('✓') ? 'helper-success' : ''}`}>{status}</p>}
          <div className="key-actions">
            {saved && (
              <button type="button" onClick={clearKey} className="btn-ghost-danger">
                Remove key
              </button>
            )}
            <button type="button" onClick={save} className="btn-primary save-key-btn">
              {saved ? 'Update key' : 'Save key'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <h3>On-page assistant</h3>
        </div>
        <p className="field-hint">
          Show the Emplorio panel automatically on job application pages, so you can fill without
          opening the popup. It never fills anything until you click.
        </p>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={panelEnabled}
            onChange={(e) => void togglePanel(e.target.checked)}
          />
          Show the panel on application pages
        </label>
        <p className="field-hint">
          Use the minimise button on the panel to tuck it into a pill on any page.
        </p>
      </div>

      <div className="card feature-card">
        <div className="section-header">
          <h3>What you get</h3>
        </div>
        <div className="feature-cols">
          <div className="feature-col">
            <div className="feature-col-head feature-col-included">
              <IconCheck size={12} /> Included free
            </div>
            <ul className="feature-list">
              <li><span className="feature-yes"><IconCheck size={11} /></span> Auto-fill application forms</li>
              <li><span className="feature-yes"><IconCheck size={11} /></span> Track applications in History</li>
              <li><span className="feature-yes"><IconCheck size={11} /></span> Save jobs from any page</li>
              <li><span className="feature-yes"><IconCheck size={11} /></span> Sync profile across devices</li>
            </ul>
          </div>
          <div className="feature-col">
            <div className="feature-col-head feature-col-unlock">
              {saved ? <IconCheck size={12} /> : <IconLock size={12} />}
              {saved ? 'Unlocked' : 'Unlock with key'}
            </div>
            <ul className="feature-list">
              <li><span className={saved ? 'feature-yes' : 'feature-unlock'}>{saved ? <IconCheck size={11} /> : <IconSparkles size={11} />}</span> Cover letter generator</li>
              <li><span className={saved ? 'feature-yes' : 'feature-unlock'}>{saved ? <IconCheck size={11} /> : <IconSparkles size={11} />}</span> Open-ended question drafts</li>
              <li><span className={saved ? 'feature-yes' : 'feature-unlock'}>{saved ? <IconCheck size={11} /> : <IconSparkles size={11} />}</span> Follow-up email drafts</li>
              <li><span className={saved ? 'feature-yes' : 'feature-unlock'}>{saved ? <IconCheck size={11} /> : <IconSparkles size={11} />}</span> Extract details from CV</li>
            </ul>
          </div>
        </div>
      </div>

      {onSignOut && (
        <div className="card account-card">
          <div className="section-header">
            <h3>Account</h3>
          </div>
          {sessionEmail && (
            <p className="field-hint account-email">Signed in as <strong>{sessionEmail}</strong></p>
          )}
          <button type="button" onClick={onSignOut} className="btn-signout btn-with-icon">
            <IconPower size={14} /> Sign out
          </button>
        </div>
      )}
    </section>
  );
}
