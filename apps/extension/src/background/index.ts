import { upsertApplication } from '../lib/storage.js';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[emplorio] installed');
});

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
