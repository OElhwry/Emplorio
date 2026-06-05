import type { Profile } from '@emplorio/shared';
import { awaitUnpause } from './pause.js';

interface RowField {
  kind?: 'text' | 'date' | 'select' | 'typeahead';
  labels: RegExp[];
  value: (entry: unknown) => string | boolean | undefined;
}

interface SectionSpec {
  heading: RegExp;
  source: 'workHistory' | 'education' | 'websites';
  fields: RowField[];
}

const SPECS: SectionSpec[] = [
  {
    heading: /work experience|employment history/i,
    source: 'workHistory',
    fields: [
      { labels: [/^job title\b|^title\b|^position\b/i], value: (e) => (e as { title: string }).title },
      { labels: [/^company\b|employer/i], value: (e) => (e as { company: string }).company },
      { labels: [/^location\b/i], value: (e) => (e as { location?: string }).location },
      {
        labels: [/currently work here|i currently work/i],
        value: (e) => !!(e as { current?: boolean }).current,
      },
      {
        kind: 'date',
        labels: [/^from\b|start date|^start\b/i],
        value: (e) => (e as { startDate?: string }).startDate,
      },
      {
        kind: 'date',
        labels: [/^to\b|end date|^end\b/i],
        value: (e) => {
          const entry = e as { endDate?: string | null; current?: boolean };
          if (entry.current) return undefined;
          return entry.endDate ?? undefined;
        },
      },
      {
        labels: [/role description|^description\b|responsibilit/i],
        value: (e) => {
          const bullets = (e as { bullets?: string[] }).bullets ?? [];
          return bullets.length ? bullets.map((b) => `• ${b}`).join('\n') : undefined;
        },
      },
    ],
  },
  {
    heading: /^education$|education history/i,
    source: 'education',
    fields: [
      {
        kind: 'typeahead',
        labels: [/school|university|institution/i],
        value: (e) => (e as { institution: string }).institution,
      },
      {
        kind: 'select',
        labels: [/^degree\b|qualification/i],
        value: (e) => (e as { degree?: string }).degree,
      },
      {
        labels: [/field of study|major|concentration/i],
        value: (e) => (e as { fieldOfStudy?: string }).fieldOfStudy,
      },
      {
        kind: 'date',
        labels: [/^from\b|start date|^start\b/i],
        value: (e) => (e as { startDate?: string }).startDate,
      },
      {
        kind: 'date',
        labels: [/^to\b|end date|^end\b|completion|graduat/i],
        value: (e) => (e as { endDate?: string }).endDate,
      },
      { labels: [/^gpa\b/i], value: (e) => (e as { gpa?: string }).gpa },
    ],
  },
  {
    heading: /^websites?\b|^links?\b/i,
    source: 'websites',
    fields: [{ labels: [/^url\b|^link\b|^website\b/i], value: (e) => e as string }],
  },
];

export async function fillSections(doc: Document, profile: Partial<Profile>): Promise<number> {
  let filled = 0;
  for (const spec of SPECS) {
    const entries = (profile as Record<string, unknown>)[spec.source] as unknown[] | undefined;
    if (!entries?.length) continue;
    filled += await fillSpec(doc, spec, entries);
  }
  filled += await fillSkills(doc, profile.skills ?? []);
  return filled;
}

async function fillSpec(
  doc: Document,
  spec: SectionSpec,
  entries: unknown[],
): Promise<number> {
  const section = findSectionByHeading(doc, spec.heading);
  if (!section) return 0;

  let count = 0;
  for (let i = 0; i < entries.length; i++) {
    let rows = findSubRows(section);
    while (rows.length <= i) {
      const addBtn = findAddButton(section);
      if (!addBtn) return count;
      const before = rows.length;
      addBtn.click();
      await waitFor(() => findSubRows(section).length > before, 1500);
      const after = findSubRows(section);
      if (after.length === before) return count;
      rows = after;
    }
    const row = rows[i];
    if (!row) continue;
    count += await fillRow(row, entries[i]!, spec.fields);
  }
  return count;
}

function findSectionByHeading(doc: Document, heading: RegExp): Element | null {
  const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6, legend'));
  for (const h of headings) {
    const text = (h.textContent ?? '').trim();
    if (!heading.test(text)) continue;
    let cur: Element | null = h.parentElement;
    for (let i = 0; i < 6 && cur; i++) {
      if (
        cur.getAttribute('role') === 'group' ||
        cur.tagName === 'FIELDSET' ||
        cur.tagName === 'SECTION'
      ) {
        if (cur.querySelector('button')) return cur;
      }
      cur = cur.parentElement;
    }
    return h.parentElement;
  }
  return null;
}

function findSubRows(section: Element): Element[] {
  const candidates = Array.from(
    section.querySelectorAll<HTMLElement>('[role="group"], fieldset'),
  );
  return candidates.filter((c) => {
    if (c === section) return false;
    if (!c.querySelector('input, textarea')) return false;
    let p: Element | null = c.parentElement;
    while (p && p !== section) {
      if (p.getAttribute('role') === 'group' || p.tagName === 'FIELDSET') return false;
      p = p.parentElement;
    }
    return true;
  });
}

function findAddButton(section: Element): HTMLButtonElement | null {
  const btns = Array.from(section.querySelectorAll<HTMLButtonElement>('button'));
  for (const b of btns) {
    if (b.getAttribute('data-automation-id') === 'add-button') return b;
    const t = (b.textContent ?? '').trim();
    if (/^add(?:\s+another)?$/i.test(t)) return b;
  }
  return null;
}

async function fillRow(row: Element, entry: unknown, fields: RowField[]): Promise<number> {
  let count = 0;
  for (const f of fields) {
    const value = f.value(entry);
    if (value == null || value === '') continue;
    const kind = f.kind ?? 'text';
    if (kind === 'date') {
      if (typeof value === 'string') count += fillDateField(row, f.labels, value);
      continue;
    }
    if (kind === 'select') {
      if (typeof value === 'string') count += await fillSelectField(row, f.labels, value);
      continue;
    }
    if (kind === 'typeahead') {
      if (typeof value === 'string') count += await fillTypeaheadField(row, f.labels, value);
      continue;
    }
    const input = findInputByLabel(row, f.labels);
    if (!input) continue;
    if (typeof value === 'boolean') {
      if (input instanceof HTMLInputElement && input.type === 'checkbox') {
        if (input.checked !== value) input.click();
        count++;
      }
      continue;
    }
    const str = String(value);
    if (input.value === str) {
      count++;
      continue;
    }
    const proto =
      input instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    setter?.call(input, str);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    count++;
  }
  return count;
}

function parseMonthYear(s: string): { month?: number; year?: number } {
  if (!s) return {};
  const iso = s.match(/^(\d{4})-(\d{1,2})/);
  if (iso?.[1] && iso[2]) return { year: +iso[1], month: +iso[2] };
  const slash = s.match(/^(\d{1,2})\/(\d{4})/);
  if (slash?.[1] && slash[2]) return { month: +slash[1], year: +slash[2] };
  const months = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  ];
  const mYr = s.toLowerCase().match(/([a-z]+)\s+(\d{4})/);
  if (mYr?.[1] && mYr[2]) {
    const idx = months.findIndex((m) => mYr[1]!.startsWith(m));
    if (idx >= 0) return { month: idx + 1, year: +mYr[2] };
  }
  const yearOnly = s.match(/\b(\d{4})\b/);
  if (yearOnly?.[1]) return { year: +yearOnly[1] };
  return {};
}

function fillDateField(row: Element, labels: RegExp[], value: string): number {
  const { month, year } = parseMonthYear(value);
  if (!month && !year) return 0;

  const container = findLabelContainer(row, labels);
  if (!container) return 0;

  const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('input'));
  const monthInput = inputs.find((i) => /month/i.test(attrHint(i)));
  const yearInput = inputs.find((i) => /year/i.test(attrHint(i)));

  if (monthInput && yearInput) {
    let count = 0;
    if (month) {
      monthInput.focus();
      writeInputValue(monthInput, String(month).padStart(2, '0'));
      count++;
    }
    if (year) {
      yearInput.focus();
      writeInputValue(yearInput, String(year));
      count++;
    }
    yearInput.blur();
    return count;
  }

  const single = inputs[0];
  if (!single) return 0;
  const mm = month ? String(month).padStart(2, '0') : '';
  const yyyy = year ? String(year) : '';
  const str = mm && yyyy ? `${mm}/${yyyy}` : yyyy;
  if (!str) return 0;
  single.focus();
  writeInputValue(single, str);
  single.blur();
  return 1;
}

function writeInputValue(input: HTMLInputElement, value: string): void {
  if (input.value === value) return;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function attrHint(el: HTMLInputElement): string {
  return [
    el.getAttribute('data-automation-id') ?? '',
    el.getAttribute('aria-label') ?? '',
    el.getAttribute('placeholder') ?? '',
    el.getAttribute('name') ?? '',
    el.id,
  ].join(' ');
}

const DEGREE_PATTERNS: { match: RegExp; option: RegExp }[] = [
  { match: /\bmba\b/i, option: /master.*business|mba/i },
  { match: /\bphd\b|doctorate|d\.phil/i, option: /doctor.*philosophy|phd|doctorate/i },
  { match: /\bm\.?sc\b|master.*science/i, option: /master.*science|^m\.?sc|^ms\b/i },
  { match: /\bm\.?a\b|master.*arts/i, option: /master.*arts|^m\.?a\b/i },
  { match: /master/i, option: /master/i },
  { match: /\bb\.?sc\b|bachelor.*science/i, option: /bachelor.*science|^b\.?sc|^bs\b/i },
  { match: /\bb\.?a\b|bachelor.*arts/i, option: /bachelor.*arts|^b\.?a\b/i },
  { match: /bachelor|undergrad/i, option: /bachelor|undergrad/i },
  { match: /a.?level|a2|gce/i, option: /a.?level|secondary|high school/i },
  { match: /diploma/i, option: /diploma/i },
  { match: /associate/i, option: /associate/i },
];

async function fillSelectField(row: Element, labels: RegExp[], value: string): Promise<number> {
  const select = findSelectByLabel(row, labels);
  if (select) {
    const options = Array.from(select.options);
    const target = matchOption(value, options, (o) => o.text);
    if (!target) return 0;
    if (select.value === target.value) return 1;
    select.value = target.value;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return 1;
  }
  return await fillAriaListbox(row, labels, value);
}

function matchOption<T>(value: string, options: T[], getText: (o: T) => string): T | undefined {
  const norm = value.toLowerCase().trim();
  let target = options.find((o) => getText(o).toLowerCase().trim() === norm);
  if (!target) target = options.find((o) => getText(o).toLowerCase().includes(norm));
  if (!target) {
    for (const p of DEGREE_PATTERNS) {
      if (!p.match.test(value)) continue;
      const m = options.find((o) => p.option.test(getText(o)));
      if (m) {
        target = m;
        break;
      }
    }
  }
  return target;
}

async function fillAriaListbox(row: Element, labels: RegExp[], value: string): Promise<number> {
  const trigger = findListboxTrigger(row, labels);
  if (!trigger) return 0;
  if (trigger.getAttribute('aria-expanded') !== 'true') {
    clickElement(trigger);
    await sleep(150);
  }
  const listbox = await waitForListbox(trigger);
  if (!listbox) return 0;
  const options = Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]'));
  const target = matchOption(value, options, (o) => (o.textContent ?? '').trim());
  if (!target) {
    clickElement(trigger);
    return 0;
  }
  clickElement(target);
  await sleep(80);
  return 1;
}

function findListboxTrigger(row: Element, patterns: RegExp[]): HTMLElement | null {
  const labels = Array.from(row.querySelectorAll<HTMLLabelElement>('label'));
  for (const lab of labels) {
    const text = (lab.textContent ?? '').replace(/\*/g, '').trim();
    if (!patterns.some((p) => p.test(text))) continue;
    const doc = row.ownerDocument;
    if (lab.htmlFor && doc) {
      const el = doc.getElementById(lab.htmlFor);
      if (el instanceof HTMLElement) {
        if (el.getAttribute('role') === 'button' || el.getAttribute('aria-haspopup')) return el;
        const inner = el.querySelector<HTMLElement>('[aria-haspopup], [role="button"], button');
        if (inner) return inner;
        return el;
      }
    }
    const container = lab.parentElement;
    if (container) {
      const btn = container.querySelector<HTMLElement>(
        '[aria-haspopup="listbox"], [role="combobox"], [role="button"][aria-haspopup], button[aria-haspopup]',
      );
      if (btn) return btn;
    }
  }
  return null;
}

async function waitForListbox(trigger: HTMLElement): Promise<HTMLElement | null> {
  const doc = trigger.ownerDocument ?? document;
  const controlsId = trigger.getAttribute('aria-controls');
  for (let i = 0; i < 30; i++) {
    if (controlsId) {
      const byId = doc.getElementById(controlsId);
      if (byId && byId.querySelector('[role="option"]')) return byId;
    }
    const lists = Array.from(doc.querySelectorAll<HTMLElement>('[role="listbox"]'));
    const visible = lists.find((l) => l.offsetParent !== null && l.querySelector('[role="option"]'));
    if (visible) return visible;
    await sleep(80);
  }
  return null;
}

async function fillTypeaheadField(row: Element, labels: RegExp[], value: string): Promise<number> {
  const input = findInputByLabel(row, labels);
  if (!(input instanceof HTMLInputElement)) return 0;
  await clearSkillsInput(input);
  await typeIntoInput(input, value);
  await sleep(400);
  const option = await waitForTypeaheadOption(input, value);
  if (!option) {
    input.blur();
    return 1;
  }
  clickElement(option);
  await sleep(120);
  return 1;
}

async function waitForTypeaheadOption(
  input: HTMLInputElement,
  value: string,
): Promise<HTMLElement | null> {
  const doc = input.ownerDocument ?? document;
  for (let i = 0; i < 25; i++) {
    const options = Array.from(
      doc.querySelectorAll<HTMLElement>(
        '[data-automation-id="promptOption"], [data-automation-id="menuItem"], [role="option"]',
      ),
    ).filter((o) => o.offsetParent !== null);
    if (options.length) {
      const target = matchOption(value, options, (o) => (o.textContent ?? '').trim());
      if (target) return target;
    }
    await sleep(120);
  }
  return null;
}

function clickElement(el: HTMLElement): void {
  const opts = { bubbles: true, cancelable: true, view: window } as MouseEventInit;
  try {
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
  } catch {
    // PointerEvent not supported
  }
  el.dispatchEvent(new MouseEvent('mousedown', opts));
  try {
    el.dispatchEvent(new PointerEvent('pointerup', opts));
  } catch {
    // ignore
  }
  el.dispatchEvent(new MouseEvent('mouseup', opts));
  el.dispatchEvent(new MouseEvent('click', opts));
  if (typeof (el as HTMLElement).click === 'function') {
    try {
      (el as HTMLElement).click();
    } catch {
      // already dispatched
    }
  }
}

function findSelectByLabel(row: Element, patterns: RegExp[]): HTMLSelectElement | null {
  const labels = Array.from(row.querySelectorAll<HTMLLabelElement>('label'));
  for (const lab of labels) {
    const text = (lab.textContent ?? '').replace(/\*/g, '').trim();
    if (!patterns.some((p) => p.test(text))) continue;
    if (lab.htmlFor) {
      const el = row.ownerDocument?.getElementById(lab.htmlFor);
      if (el instanceof HTMLSelectElement) return el;
    }
    const inside = lab.querySelector<HTMLSelectElement>('select');
    if (inside) return inside;
    const sibling = lab.parentElement?.querySelector<HTMLSelectElement>('select');
    if (sibling) return sibling;
  }
  return null;
}

function findLabelContainer(row: Element, patterns: RegExp[]): Element | null {
  const labels = Array.from(row.querySelectorAll<HTMLLabelElement>('label'));
  for (const lab of labels) {
    const text = (lab.textContent ?? '').replace(/\*/g, '').trim();
    if (!patterns.some((p) => p.test(text))) continue;
    let cur: Element | null = lab.parentElement;
    for (let i = 0; i < 4 && cur; i++) {
      if (cur.querySelector('input')) return cur;
      cur = cur.parentElement;
    }
  }
  return null;
}

function findInputByLabel(
  row: Element,
  patterns: RegExp[],
): HTMLInputElement | HTMLTextAreaElement | null {
  const labels = Array.from(row.querySelectorAll<HTMLLabelElement>('label'));
  for (const lab of labels) {
    const text = (lab.textContent ?? '').replace(/\*/g, '').trim();
    if (!patterns.some((p) => p.test(text))) continue;
    if (lab.htmlFor) {
      const el = row.ownerDocument?.getElementById(lab.htmlFor);
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
        return el as HTMLInputElement | HTMLTextAreaElement;
      }
    }
    const inside = lab.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      'input, textarea',
    );
    if (inside) return inside;
    const sibling = lab.parentElement?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      'input, textarea',
    );
    if (sibling) return sibling;
  }
  return null;
}

async function fillSkills(doc: Document, skills: string[]): Promise<number> {
  if (!skills.length) return 0;
  const input = findSkillsInput(doc);
  if (!input) return 0;

  let added = 0;
  for (const skill of skills) {
    await awaitUnpause();
    await clearSkillsInput(input);
    await typeIntoInput(input, skill);
    await sleep(200);
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true }),
    );
    input.dispatchEvent(
      new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true }),
    );
    input.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }),
    );
    added++;
    await sleep(200);
  }
  return added;
}

async function clearSkillsInput(input: HTMLInputElement): Promise<void> {
  input.focus();
  if (!input.value) return;
  input.select();
  await sleep(20);
  try {
    document.execCommand('delete');
  } catch {
    // ignore
  }
  if (input.value) {
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Backspace', code: 'Backspace', keyCode: 8, bubbles: true, cancelable: true }),
    );
    input.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Backspace', code: 'Backspace', keyCode: 8, bubbles: true }),
    );
  }
  await sleep(40);
}

async function typeIntoInput(input: HTMLInputElement, text: string): Promise<void> {
  input.focus();
  let inserted = false;
  try {
    inserted = document.execCommand('insertText', false, text);
  } catch {
    inserted = false;
  }
  if (!inserted || input.value !== text) {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set;
    setter?.call(input, text);
    try {
      input.dispatchEvent(
        new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }),
      );
    } catch {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  const lastChar = text.slice(-1);
  input.dispatchEvent(
    new KeyboardEvent('keydown', { key: lastChar, bubbles: true, cancelable: true }),
  );
  input.dispatchEvent(
    new KeyboardEvent('keyup', { key: lastChar, bubbles: true, cancelable: true }),
  );
}

function findSkillsInput(doc: Document): HTMLInputElement | null {
  const labels = Array.from(doc.querySelectorAll<HTMLLabelElement>('label'));
  for (const lab of labels) {
    const text = (lab.textContent ?? '').trim();
    if (!/type to add skills|^skills?\*?$/i.test(text)) continue;
    if (lab.htmlFor) {
      const el = doc.getElementById(lab.htmlFor);
      if (el instanceof HTMLInputElement) return el;
    }
    const inside = lab.querySelector<HTMLInputElement>('input');
    if (inside) return inside;
    const sibling = lab.parentElement?.querySelector<HTMLInputElement>('input');
    if (sibling) return sibling;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function waitFor(cond: () => boolean, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (cond() || Date.now() - start > timeoutMs) return resolve();
      setTimeout(tick, 50);
    };
    tick();
  });
}
