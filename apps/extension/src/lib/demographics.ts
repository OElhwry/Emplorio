import type { Profile } from '@emplorio/shared';
import { ProfileKey } from '@emplorio/shared';

type Key =
  | typeof ProfileKey.EeoAge
  | typeof ProfileKey.EeoGender
  | typeof ProfileKey.EeoEthnicity
  | typeof ProfileKey.EeoCommunities
  | typeof ProfileKey.EeoVeteranStatus
  | typeof ProfileKey.EeoDisabilityStatus;

interface QuestionPattern {
  re: RegExp;
  key: Key;
  multi: boolean;
}

const QUESTIONS: QuestionPattern[] = [
  { re: /current age|age range|how old|^age\b/i, key: ProfileKey.EeoAge, multi: false },
  { re: /gender identity|^gender\b/i, key: ProfileKey.EeoGender, multi: false },
  { re: /ethnicit|race/i, key: ProfileKey.EeoEthnicity, multi: true },
  { re: /communit/i, key: ProfileKey.EeoCommunities, multi: true },
  { re: /veteran/i, key: ProfileKey.EeoVeteranStatus, multi: false },
  { re: /disab/i, key: ProfileKey.EeoDisabilityStatus, multi: false },
];

export function fillDemographics(doc: Document, profile: Partial<Profile>): number {
  const groups = findGroups(doc);
  let filled = 0;
  for (const g of groups) {
    if (g.key === ProfileKey.EeoAge) {
      if (typeof profile.eeoAge !== 'number') continue;
      if (selectAgeBucket(g.container, profile.eeoAge)) filled++;
      continue;
    }
    const wanted = valueFor(profile, g.key);
    if (!wanted.length) continue;
    if (selectInGroup(g.container, wanted, g.multi)) filled++;
  }
  return filled;
}

function selectAgeBucket(container: Element, age: number): boolean {
  const inputs = Array.from(
    container.querySelectorAll<HTMLInputElement>('input[type="radio"], input[type="checkbox"]'),
  );
  for (const input of inputs) {
    const label = inputLabelText(input);
    const range = parseAgeRange(label);
    if (range && age >= range.min && age <= range.max) {
      setChecked(input, true);
      return true;
    }
  }
  return false;
}

function parseAgeRange(label: string): { min: number; max: number } | null {
  const s = label.toLowerCase();
  if (/prefer not|decline|not\s+to\s+answer/.test(s)) return null;
  const between = s.match(/(\d+)\s*(?:-|to|–|—|through)\s*(\d+)/);
  if (between) return { min: +between[1]!, max: +between[2]! };
  const under = s.match(/under\s+(\d+)|less\s+than\s+(\d+)|below\s+(\d+)/);
  if (under) {
    const n = +(under[1] ?? under[2] ?? under[3]!);
    return { min: 0, max: n - 1 };
  }
  const over =
    s.match(/(\d+)\s*\+/) ||
    s.match(/(\d+)\s+(?:or\s+)?(?:older|more|above|over|plus)/);
  if (over) return { min: +over[1]!, max: 999 };
  return null;
}

function valueFor(profile: Partial<Profile>, key: Key): string[] {
  const v = (profile as Record<string, unknown>)[key];
  if (v == null || v === '') return [];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && x !== '');
  return [String(v)];
}

interface Group {
  container: Element;
  key: Key;
  multi: boolean;
}

function findGroups(doc: Document): Group[] {
  const out: Group[] = [];
  const seen = new WeakSet<Element>();
  const candidates = doc.querySelectorAll<HTMLElement>(
    'fieldset, [role="radiogroup"], [role="group"]',
  );

  candidates.forEach((c) => {
    if (seen.has(c)) return;
    if (!c.querySelector('input[type="radio"], input[type="checkbox"]')) return;
    const text = groupQuestionText(c);
    if (!text) return;
    for (const q of QUESTIONS) {
      if (q.re.test(text)) {
        out.push({ container: c, key: q.key, multi: q.multi });
        seen.add(c);
        return;
      }
    }
  });

  return out;
}

function groupQuestionText(el: Element): string {
  const legend = el.querySelector('legend')?.textContent?.trim();
  if (legend) return legend;
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const ref = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
    if (ref) return ref;
  }
  const heading = el.querySelector('h1, h2, h3, h4, h5, h6, label')?.textContent?.trim();
  if (heading) return heading;
  return '';
}

function selectInGroup(container: Element, wanted: string[], multi: boolean): boolean {
  const inputs = Array.from(
    container.querySelectorAll<HTMLInputElement>('input[type="radio"], input[type="checkbox"]'),
  );
  let matched = false;
  for (const w of wanted) {
    let best: HTMLInputElement | null = null;
    let bestScore = 0;
    for (const input of inputs) {
      const label = inputLabelText(input);
      const score = matchScore(w, label);
      if (score > bestScore) {
        best = input;
        bestScore = score;
      }
    }
    if (best && bestScore > 0) {
      setChecked(best, true);
      matched = true;
      if (!multi) break;
    }
  }
  return matched;
}

function inputLabelText(el: HTMLInputElement): string {
  if (el.id) {
    const lab = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(el.id)}"]`);
    if (lab) return lab.textContent?.trim() ?? '';
  }
  const wrapping = el.closest('label');
  if (wrapping) return wrapping.textContent?.trim() ?? '';
  const aria = el.getAttribute('aria-label');
  if (aria) return aria;
  return el.value ?? '';
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchScore(want: string, label: string): number {
  const w = normalize(want);
  const l = normalize(label);
  if (!w || !l) return 0;
  if (l === w) return 100;
  if (l.includes(w) || w.includes(l)) return 80;
  const tokens = w.split(' ').filter((t) => t.length > 3);
  const overlap = tokens.filter((t) => l.includes(t)).length;
  if (overlap === 0) return 0;
  return 40 + overlap * 10;
}

function setChecked(el: HTMLInputElement, checked: boolean): void {
  if (el.checked === checked) return;
  el.click();
  if (el.checked !== checked) {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'checked',
    )?.set;
    setter?.call(el, checked);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
