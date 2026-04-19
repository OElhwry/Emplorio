import { useState } from 'react';

export function App() {
  const [status, setStatus] = useState<string>('');

  async function fill() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'FILL' });
    setStatus(`Filled ${res?.filled ?? 0} fields`);
  }

  return (
    <main style={{ width: 280, padding: 16, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 16, margin: 0 }}>Emplorio</h1>
      <p style={{ color: '#666', fontSize: 12 }}>Apply once. Send everywhere.</p>
      <button onClick={fill} style={{ width: '100%', padding: 8 }}>
        Fill this form
      </button>
      {status && <p style={{ fontSize: 12 }}>{status}</p>}
    </main>
  );
}
