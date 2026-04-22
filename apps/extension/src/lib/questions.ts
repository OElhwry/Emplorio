export interface DetectedQuestion {
  selector: string;
  label: string;
  existing: string;
}

const SKIP_LABEL = /description|responsibilit|bullet|summary of role|achievement/i;
const QUESTION_HINT = /\?$|^(why|what|how|describe|tell us|explain|share|provide)\b/i;

export function detectQuestions(doc: Document): DetectedQuestion[] {
  const out: DetectedQuestion[] = [];
  const seen = new Set<string>();
  const textareas = Array.from(doc.querySelectorAll<HTMLTextAreaElement>('textarea'));

  textareas.forEach((el, idx) => {
    if (!isVisible(el)) return;
    const label = findLabel(el).trim();
    if (!label) return;
    if (SKIP_LABEL.test(label)) return;
    if (!QUESTION_HINT.test(label) && label.length < 15) return;
    const selector = cssPath(el, idx);
    if (seen.has(selector)) return;
    seen.add(selector);
    out.push({ selector, label, existing: el.value });
  });

  return out;
}

export function fillAnswer(doc: Document, selector: string, answer: string): boolean {
  const el = doc.querySelector<HTMLTextAreaElement>(selector);
  if (!el) return false;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value',
  )?.set;
  setter?.call(el, answer);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function isVisible(el: HTMLElement): boolean {
  if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function findLabel(el: HTMLElement): string {
  const doc = el.ownerDocument ?? document;
  if (el.id) {
    const lab = doc.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(el.id)}"]`);
    if (lab) return lab.textContent ?? '';
  }
  const aria = el.getAttribute('aria-label');
  if (aria) return aria;
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const parts = labelledBy
      .split(/\s+/)
      .map((id) => doc.getElementById(id)?.textContent ?? '')
      .filter(Boolean);
    if (parts.length) return parts.join(' ');
  }
  const wrapping = el.closest('label');
  if (wrapping) return wrapping.textContent ?? '';
  const prev = el.previousElementSibling;
  if (prev && /label|legend|span|div/i.test(prev.tagName)) {
    const t = prev.textContent?.trim() ?? '';
    if (t && t.length < 200) return t;
  }
  return '';
}

function cssPath(el: Element, fallbackIdx: number): string {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const name = (el as HTMLTextAreaElement).name;
  if (name) return `textarea[name="${CSS.escape(name)}"]`;
  return `textarea:nth-of-type(${fallbackIdx + 1})`;
}
