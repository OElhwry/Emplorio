import { pickAdapter } from '../adapters/index.js';
import { detectByHeuristics } from '../lib/heuristics.js';
import { fillField, getProfile } from '../lib/fill.js';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'FILL') return false;
  void runFill().then(sendResponse);
  return true;
});

async function runFill() {
  const profile = await getProfile();
  if (!profile) return { filled: 0, skipped: 0, unmapped: [] };

  const adapter = pickAdapter(location.href, document);
  const matches = adapter
    ? adapter.detectFields(document)
    : detectByHeuristics(document);

  let filled = 0;
  const unmapped: string[] = [];

  for (const m of matches) {
    const el = document.querySelector<HTMLInputElement>(m.selector);
    if (!el) {
      unmapped.push(m.selector);
      continue;
    }
    if (fillField(el, profile, m.key)) filled++;
  }

  return { filled, skipped: 0, unmapped };
}
