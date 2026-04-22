import { scrapeJob } from './scrape.js';

const SUBMIT_PATTERNS = [
  /submit\s+application/i,
  /send\s+application/i,
  /submit\s+your\s+application/i,
  /^\s*submit\s*$/i,
  /^\s*apply\s*now\s*$/i,
  /^\s*apply\s+for\s+(this\s+)?job\s*$/i,
  /finish\s+application/i,
  /complete\s+application/i,
  /i'?m\s+interested/i,
];

const APPLY_HOST_HINTS =
  /greenhouse|lever|workday|myworkdayjobs|ashby|smartrecruiters|workable|icims|smartapply|jobs\.|careers\.|linkedin\.com\/jobs/i;

const STORAGE_KEY = 'emplorioRecentSubmit';
const COOLDOWN_MS = 60_000;

function visibleText(el: Element): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function looksLikeSubmit(el: Element): boolean {
  const text = visibleText(el).slice(0, 80);
  if (text && SUBMIT_PATTERNS.some((re) => re.test(text))) return true;
  if (el instanceof HTMLInputElement && el.type === 'submit') {
    const v = (el.value ?? '').slice(0, 80);
    if (v && SUBMIT_PATTERNS.some((re) => re.test(v))) return true;
  }
  const aria = el.getAttribute('aria-label') ?? '';
  if (aria && SUBMIT_PATTERNS.some((re) => re.test(aria))) return true;
  return false;
}

function findSubmitAncestor(start: EventTarget | null): Element | null {
  let node = start as Element | null;
  for (let i = 0; node && i < 5; i++) {
    if (
      node instanceof HTMLButtonElement ||
      node instanceof HTMLInputElement ||
      node.getAttribute('role') === 'button'
    ) {
      if (looksLikeSubmit(node)) return node;
    }
    node = node.parentElement;
  }
  return null;
}

export function installSubmitDetector() {
  if (!APPLY_HOST_HINTS.test(location.hostname + location.pathname)) return;

  document.addEventListener(
    'click',
    async (e) => {
      const target = findSubmitAncestor(e.target);
      if (!target) return;
      try {
        const recent = await chrome.storage.local.get(STORAGE_KEY);
        const last = (recent[STORAGE_KEY] as Record<string, number> | undefined) ?? {};
        const key = location.origin + location.pathname;
        if (last[key] && Date.now() - last[key]! < COOLDOWN_MS) return;
        const meta = scrapeJob(document);
        await chrome.runtime.sendMessage({
          type: 'TRACK_APPLIED',
          url: location.href,
          company: meta?.company ?? '',
          role: meta?.role ?? '',
        });
        last[key] = Date.now();
        await chrome.storage.local.set({ [STORAGE_KEY]: last });
      } catch {
        // best-effort; never block the user's submit
      }
    },
    true,
  );
}
