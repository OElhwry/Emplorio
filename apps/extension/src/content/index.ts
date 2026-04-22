import { pickAdapter } from '../adapters/index.js';
import { detectByHeuristics } from '../lib/heuristics.js';
import { fillField, getProfile } from '../lib/fill.js';
import { fillDemographics } from '../lib/demographics.js';
import { fillSections } from '../lib/sections.js';
import { scrapeJob } from '../lib/scrape.js';
import { awaitUnpause } from '../lib/pause.js';
import { detectQuestions, fillAnswer } from '../lib/questions.js';
import { installSubmitDetector } from '../lib/submit-detect.js';

installSubmitDetector();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'FILL') {
    void runFill().then(sendResponse);
    return true;
  }
  if (msg?.type === 'SCRAPE_JOB') {
    sendResponse(scrapeJob(document));
    return true;
  }
  if (msg?.type === 'DETECT_QUESTIONS') {
    sendResponse({ questions: detectQuestions(document) });
    return true;
  }
  if (msg?.type === 'FILL_ANSWERS') {
    const pairs = (msg.answers ?? []) as Array<{ selector: string; answer: string }>;
    let filled = 0;
    for (const p of pairs) {
      if (fillAnswer(document, p.selector, p.answer)) filled++;
    }
    sendResponse({ filled });
    return true;
  }
  return false;
});

async function runFill() {
  try {
    await chrome.storage.local.set({ emplorioFillRunning: true });
  } catch {
    // ignore
  }
  try {
    return await doFill();
  } finally {
    try {
      await chrome.storage.local.set({ emplorioFillRunning: false, emplorioFillPaused: false });
    } catch {
      // ignore
    }
  }
}

async function doFill() {
  const profile = await getProfile();
  if (!profile) return { filled: 0, skipped: 0, unmapped: [] };

  const adapter = pickAdapter(location.href, document);
  const adapterMatches = adapter ? adapter.detectFields(document) : [];
  const heuristicMatches = detectByHeuristics(document);

  const seenSelectors = new Set(adapterMatches.map((m) => m.selector));
  const merged = [
    ...adapterMatches,
    ...heuristicMatches.filter((m) => !seenSelectors.has(m.selector)),
  ];

  const hasPhoneCountryField = merged.some((m) => m.key === 'phoneCountryCode');
  const splitPhone = hasPhoneCountryField && !!profile.phoneCountryCode;
  const effectiveProfile: Partial<typeof profile> = splitPhone
    ? { ...profile, phone: (profile.phone ?? '').replace(/^0+/, '') }
    : profile;

  const filledEls = new WeakSet<HTMLInputElement>();
  let filled = 0;
  const unmapped: string[] = [];

  for (const m of merged) {
    await awaitUnpause();
    const el = document.querySelector<HTMLInputElement>(m.selector);
    if (!el || filledEls.has(el)) continue;
    if (fillField(el, effectiveProfile, m.key)) {
      filled++;
      filledEls.add(el);
    } else {
      unmapped.push(m.selector);
    }
  }

  filled += fillDemographics(document, effectiveProfile);
  filled += await fillSections(document, effectiveProfile);

  return { filled, skipped: 0, unmapped };
}
