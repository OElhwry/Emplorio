import { upsertApplication } from '../lib/storage.js';
import { apiFetch } from '../lib/api.js';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[emplorio] installed');
});

/** Reads a /generate SSE stream to completion and returns the joined text. */
async function readSseText(res: Response): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      try {
        const evt = JSON.parse(line.slice(5).trim());
        if (evt.delta) text += evt.delta;
      } catch {
        // skip malformed events
      }
    }
  }
  return text;
}

function flashBadge(tabId: number, text: string, color: string) {
  chrome.action.setBadgeText({ text, tabId });
  chrome.action.setBadgeBackgroundColor({ color, tabId });
  setTimeout(() => chrome.action.setBadgeText({ text: '', tabId }), 1800);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'PING') {
    sendResponse({ type: 'PONG' });
    return true;
  }
  if (msg?.type === 'GENERATE_COVER') {
    void (async () => {
      try {
        const res = await apiFetch('/generate/cover-letter', {
          method: 'POST',
          body: JSON.stringify(msg.payload),
        });
        if (res.status === 402) return sendResponse({ needsKey: true });
        if (!res.ok) return sendResponse({ error: `API ${res.status}` });
        const text = await readSseText(res);
        sendResponse(text ? { text } : { error: 'empty' });
      } catch (err) {
        sendResponse({ error: (err as Error).message });
      }
    })();
    return true;
  }
  if (msg?.type === 'GENERATE_ANSWERS') {
    void (async () => {
      try {
        const res = await apiFetch('/generate/answer-questions', {
          method: 'POST',
          body: JSON.stringify(msg.payload),
        });
        if (res.status === 402) return sendResponse({ needsKey: true });
        if (!res.ok) return sendResponse({ error: `API ${res.status}` });
        const data = (await res.json()) as { answers?: string[] };
        sendResponse({ answers: data.answers ?? [] });
      } catch (err) {
        sendResponse({ error: (err as Error).message });
      }
    })();
    return true;
  }
  if (msg?.type === 'TRACK_APPLIED') {
    void (async () => {
      const url = msg.url ?? sender.tab?.url ?? '';
      if (!url) return sendResponse({ ok: false });
      await upsertApplication({
        url,
        company: msg.company ?? '',
        role: msg.role ?? '',
        status: 'applied',
        appliedAt: Date.now(),
      });
      if (sender.tab?.id) flashBadge(sender.tab.id, '✓', '#0a7d18');
      sendResponse({ ok: true });
    })();
    return true;
  }
  return false;
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  if (command === 'fill-form') {
    const state = await chrome.storage.local.get(['emplorioFillRunning', 'emplorioFillPaused']);
    if (state.emplorioFillRunning) {
      await chrome.storage.local.set({ emplorioFillPaused: !state.emplorioFillPaused });
      return;
    }
    await chrome.storage.local.set({ emplorioFillPaused: false });
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'FILL' });
    } catch (err) {
      console.warn('[emplorio] fill command failed:', err);
    }
    return;
  }

  if (command === 'save-page') {
    if (!tab.url) return;
    let meta: { company?: string; role?: string } = {};
    try {
      meta = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_JOB' });
    } catch {
      // unsupported page — still save with URL alone
    }
    await upsertApplication({
      url: tab.url,
      company: meta?.company ?? '',
      role: meta?.role ?? '',
      status: 'saved',
      savedAt: Date.now(),
    });
    flashBadge(tab.id, '✓', '#0a7d18');
  }
});
