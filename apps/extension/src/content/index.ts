import { scrapeJob } from '../lib/scrape.js';
import { detectQuestions, fillAnswer } from '../lib/questions.js';
import { installSubmitDetector } from '../lib/submit-detect.js';
import { runFill } from './fill-run.js';
import { startAutoDetect } from './detect.js';
import { flashFields, outlineUnmapped, showToast } from './ui.js';

installSubmitDetector();
startAutoDetect();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'FILL') {
    void runFill().then((res) => {
      // On-page feedback even when fill is triggered from the popup.
      flashFields(res.filledEls);
      outlineUnmapped(res.unmapped);
      const parts: string[] = [];
      if (res.alreadyCorrect) parts.push(`${res.alreadyCorrect} already set`);
      if (res.unmapped.length) parts.push(`${res.unmapped.length} to check`);
      const tail = parts.length ? ` · ${parts.join(' · ')}` : '';
      showToast(`Filled ${res.filled} field${res.filled === 1 ? '' : 's'}${tail}`, 'success');
      // Only serializable data crosses the messaging boundary.
      sendResponse({ filled: res.filled, alreadyCorrect: res.alreadyCorrect, unmapped: res.unmapped });
    });
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
