/**
 * On-page UI injected into ATS job pages: a branded, dismissable panel that
 * appears when a fillable form is detected, plus a toast and a field flash.
 * Everything lives in a Shadow DOM so the host page's CSS can't touch it and
 * ours can't leak out.
 */

export interface PanelState {
  role: string;
  company: string;
  fillable: number;
  completeness: { filled: number; total: number } | null;
  hasNext: boolean;
}

export interface PanelHandlers {
  onFill: () => void;
  onCover: () => void;
  onQuestions: () => void;
  onNext: () => void;
  onResultClose: () => void;
}

type ActionBusy = 'cover' | 'questions' | null;

/** Where "Finish profile" sends people to complete their details. */
const PROFILE_URL = 'https://emplorio.co.uk/profile';

/** The real Emplorio (hummingbird) icon, served from the extension. */
const ICON_URL = chrome.runtime.getURL('icon128.png');

const PANEL_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.wrap {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --bg: #ffffff;
  --bg-soft: #f8f9fb;
  --border: #e8ebef;
  --text: #1a1d23;
  --text-muted: #6b7280;
  --accent: #4f46e5;
  --accent-2: #818cf8;
  --accent-soft: #eef2ff;
  --on-accent: #ffffff;
}
@media (prefers-color-scheme: dark) {
  .wrap {
    --bg: #161922;
    --bg-soft: #1a1e28;
    --border: #262b38;
    --text: #e7eaf0;
    --text-muted: #9aa3b2;
    --accent: #818cf8;
    --accent-2: #a5b0fb;
    --accent-soft: rgba(129, 140, 248, 0.16);
    --on-accent: #0f1115;
  }
}
.card {
  width: 300px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18), 0 2px 8px rgba(15, 23, 42, 0.12);
  overflow: hidden;
  animation: emp-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
@keyframes emp-in {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 12px;
  background: var(--bg-soft);
  border-bottom: 1px solid var(--border);
}
.brand { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; color: var(--text); }
.mark {
  width: 18px; height: 18px; border-radius: 4px;
  object-fit: contain; flex-shrink: 0; display: block;
}
.head-actions { margin-left: auto; display: inline-flex; gap: 2px; }
.icon {
  width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border: none; border-radius: 6px; cursor: pointer;
  color: var(--text-muted); font-size: 15px; line-height: 1; padding: 0;
}
.icon:hover { background: var(--accent-soft); color: var(--text); }
.body { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.role { font-size: 13px; font-weight: 600; color: var(--text); line-height: 1.3; }
.company { font-size: 12px; color: var(--text-muted); }
.fill {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  width: 100%; padding: 10px 14px; border: none; border-radius: 9px; cursor: pointer;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: var(--on-accent); font-size: 13px; font-weight: 600;
  transition: filter 140ms ease, transform 80ms ease;
}
.fill:hover:not(:disabled) { filter: brightness(1.06); }
.fill:active:not(:disabled) { transform: translateY(1px); }
.fill:disabled { cursor: default; }
.fill.muted {
  background: var(--bg-soft); color: var(--text-muted);
  border: 1px solid var(--border); opacity: 1;
}
.fill.done {
  background: linear-gradient(135deg, #10b981, #34d399);
}
.fill .check { font-size: 14px; line-height: 1; }
.nudge {
  font-size: 11px; color: var(--text-muted); line-height: 1.45;
  display: flex; flex-direction: column; gap: 5px;
}
.nudge-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.bar { height: 4px; border-radius: 3px; background: var(--accent-soft); overflow: hidden; }
.bar > span { display: block; height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-2)); border-radius: 3px; transition: width 300ms ease; }
.foot { font-size: 10.5px; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.foot-hint { opacity: 0.85; }
.link { background: none; border: none; color: var(--accent); font-size: 10.5px; cursor: pointer; padding: 0; }
.link:hover { text-decoration: underline; }
.spinner {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.4); border-top-color: var(--on-accent);
  animation: emp-spin 700ms linear infinite;
}
.spinner.dark { border-color: var(--accent-soft); border-top-color: var(--accent); margin-right: 6px; }
@keyframes emp-spin { to { transform: rotate(360deg); } }
.ai-row { display: flex; gap: 8px; }
.ai {
  flex: 1; display: inline-flex; align-items: center; justify-content: center;
  padding: 8px 10px; border-radius: 8px; cursor: pointer;
  background: var(--bg-soft); border: 1px solid var(--border); color: var(--text);
  font-size: 12px; font-weight: 500; transition: background 140ms ease, border-color 140ms ease;
}
.ai:hover:not(:disabled) { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }
.ai:disabled { cursor: default; opacity: 0.7; }
.result {
  border: 1px solid var(--border); border-radius: 9px; overflow: hidden; background: var(--bg-soft);
}
.result-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 10px; font-size: 11px; font-weight: 600; color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}
.result-body {
  max-height: 200px; overflow-y: auto; padding: 10px; font-size: 12px; line-height: 1.5;
  color: var(--text); white-space: pre-wrap;
}
.btn-copy {
  width: 100%; padding: 8px; border: none; border-top: 1px solid var(--border);
  background: var(--bg); color: var(--accent); font-size: 12px; font-weight: 600; cursor: pointer;
}
.btn-copy:hover { background: var(--accent-soft); }
.icon.sm { width: 20px; height: 20px; font-size: 12px; }
.pill {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 12px; border-radius: 999px; cursor: pointer; border: 1px solid var(--border);
  background: var(--bg); color: var(--text); font-size: 12px; font-weight: 600;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.16);
  animation: emp-in 200ms ease;
}
.pill:hover { filter: brightness(1.02); }
.pill .count {
  background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: var(--on-accent);
  border-radius: 999px; padding: 1px 7px; font-size: 11px; font-variant-numeric: tabular-nums;
}
@media (prefers-reduced-motion: reduce) {
  .card, .pill { animation: none; }
  .spinner { animation: none; }
}
`;

let hostEl: HTMLDivElement | null = null;
let root: ShadowRoot | null = null;
let mountEl: HTMLElement | null = null;
let collapsed = false;
let busy = false;
let justFilled: number | null = null;
let justFilledTimer: number | undefined;
let actionBusy: ActionBusy = null;
let resultTitle = '';
let resultText = '';
let state: PanelState | null = null;
let handlers: PanelHandlers | null = null;

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function ensureHost(): void {
  if (root) return;
  hostEl = document.createElement('div');
  hostEl.id = 'emplorio-overlay-host';
  hostEl.style.cssText =
    'position:fixed;bottom:20px;right:20px;z-index:2147483647;margin:0;padding:0;';
  root = hostEl.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = PANEL_CSS;
  root.appendChild(style);
  mountEl = document.createElement('div');
  mountEl.className = 'wrap';
  root.appendChild(mountEl);
  (document.documentElement || document.body).appendChild(hostEl);
}

export function mountOrUpdatePanel(next: PanelState, next_handlers: PanelHandlers): void {
  ensureHost();
  state = next;
  handlers = next_handlers;
  render();
}

export function hidePanel(): void {
  if (mountEl) mountEl.replaceChildren();
  state = null;
  collapsed = false;
  busy = false;
  justFilled = null;
  actionBusy = null;
  // Note: resultText is intentionally kept so a generated cover letter survives
  // SPA navigation between form steps. It is cleared explicitly via onResultClose.
  window.clearTimeout(justFilledTimer);
}

export function clearPanelResult(): void {
  resultText = '';
  resultTitle = '';
  render();
}

export function setPanelBusy(value: boolean): void {
  busy = value;
  render();
}

/** Show a transient "Filled N" confirmation on the button; reverts after a beat. */
export function setPanelFilled(count: number): void {
  busy = false;
  justFilled = count;
  render();
  window.clearTimeout(justFilledTimer);
  justFilledTimer = window.setTimeout(() => {
    justFilled = null;
    render();
  }, 2600);
}

/** Spinner state for the AI action buttons (cover letter / questions). */
export function setPanelActionBusy(which: ActionBusy): void {
  actionBusy = which;
  render();
}

/** Show generated text (e.g. a cover letter) in an expandable box with Copy. */
export function setPanelResult(title: string, text: string): void {
  actionBusy = null;
  resultTitle = title;
  resultText = text;
  render();
}

function render(): void {
  if (!mountEl || !state) return;
  const s = state;
  const plural = s.fillable === 1 ? '' : 's';

  if (collapsed) {
    mountEl.innerHTML = `
      <button class="pill" id="emp-expand" title="Open Emplorio">
        <img class="mark" src="${ICON_URL}" alt="" />
        <span>Emplorio</span>
        <span class="count">${s.fillable}</span>
      </button>`;
    mountEl.querySelector('#emp-expand')?.addEventListener('click', () => {
      collapsed = false;
      render();
    });
    return;
  }

  const pct = s.completeness && s.completeness.total > 0
    ? Math.round((s.completeness.filled / s.completeness.total) * 100)
    : null;
  const nudge =
    pct != null && pct < 100
      ? `<div class="nudge">
           <span class="nudge-row">
             <span>Profile ${pct}% complete.</span>
             <a class="link" href="${PROFILE_URL}" target="_blank" rel="noopener noreferrer">Finish profile &#8594;</a>
           </span>
           <span class="bar"><span style="width:${pct}%"></span></span>
         </div>`
      : '';

  const nothingToFill = s.fillable === 0;
  let fillInner: string;
  let fillClass = 'fill';
  if (busy) {
    fillInner = '<span class="spinner"></span>Filling…';
  } else if (justFilled != null) {
    fillInner = `<span class="check">&#10003;</span>Filled ${justFilled} field${justFilled === 1 ? '' : 's'}`;
    fillClass = 'fill done';
  } else if (nothingToFill) {
    fillInner = 'Add profile details to autofill';
    fillClass = 'fill muted';
  } else {
    fillInner = `Fill ${s.fillable} field${plural}`;
  }

  const coverBusy = actionBusy === 'cover';
  const questionsBusy = actionBusy === 'questions';
  const aiRow = `
    <div class="ai-row">
      <button class="ai" id="emp-cover" ${actionBusy ? 'disabled' : ''}>
        ${coverBusy ? '<span class="spinner dark"></span>' : ''}Cover letter
      </button>
      <button class="ai" id="emp-questions" ${actionBusy ? 'disabled' : ''}>
        ${questionsBusy ? '<span class="spinner dark"></span>' : ''}Answer questions
      </button>
    </div>`;

  const resultBox = resultText
    ? `<div class="result">
         <div class="result-head">
           <span>${esc(resultTitle)}</span>
           <button class="icon sm" id="emp-result-close" title="Close" aria-label="Close">&#10005;</button>
         </div>
         <div class="result-body">${esc(resultText)}</div>
         <button class="btn-copy" id="emp-copy">Copy</button>
       </div>`
    : '';

  const foot = s.hasNext
    ? `<div class="foot">
         <span class="foot-hint">Fills only when you click</span>
         <button class="link" id="emp-next">Next step &#8594;</button>
       </div>`
    : `<div class="foot"><span class="foot-hint">Fills only when you click</span></div>`;

  mountEl.innerHTML = `
    <div class="card">
      <div class="head">
        <span class="brand"><img class="mark" src="${ICON_URL}" alt="" />Emplorio</span>
        <div class="head-actions">
          <button class="icon" id="emp-collapse" title="Minimise" aria-label="Minimise">&#8211;</button>
        </div>
      </div>
      <div class="body">
        <div>
          <div class="role">${esc(s.role || 'Application detected')}</div>
          ${s.company ? `<div class="company">${esc(s.company)}</div>` : ''}
        </div>
        <button class="${fillClass}" id="emp-fill" ${busy || nothingToFill ? 'disabled' : ''}>
          ${fillInner}
        </button>
        ${aiRow}
        ${resultBox}
        ${nudge}
        ${foot}
      </div>
    </div>`;

  mountEl.querySelector('#emp-collapse')?.addEventListener('click', () => {
    collapsed = true;
    render();
  });
  mountEl.querySelector('#emp-fill')?.addEventListener('click', () => {
    if (!busy && !nothingToFill) handlers?.onFill();
  });
  mountEl.querySelector('#emp-cover')?.addEventListener('click', () => {
    if (!actionBusy) handlers?.onCover();
  });
  mountEl.querySelector('#emp-questions')?.addEventListener('click', () => {
    if (!actionBusy) handlers?.onQuestions();
  });
  mountEl.querySelector('#emp-next')?.addEventListener('click', () => handlers?.onNext());
  mountEl.querySelector('#emp-result-close')?.addEventListener('click', () => handlers?.onResultClose());
  mountEl.querySelector('#emp-copy')?.addEventListener('click', () => {
    void navigator.clipboard.writeText(resultText);
    showToast('Copied to clipboard', 'success');
  });
}

/* ---------- Toast ---------- */

const TOAST_CSS = `
:host { all: initial; }
.t {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: 10px; font-size: 13px; font-weight: 500; color: #fff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.22);
  animation: emp-toast-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.t.success { background: linear-gradient(135deg, #4f46e5, #818cf8); }
.t.error { background: linear-gradient(135deg, #dc2626, #f87171); }
.dot { width: 7px; height: 7px; border-radius: 50%; background: #fff; opacity: 0.9; flex-shrink: 0; }
.t-action {
  margin-left: 4px; background: rgba(255,255,255,0.18); border: none; color: #fff;
  font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 6px; cursor: pointer;
}
.t-action:hover { background: rgba(255,255,255,0.3); }
@keyframes emp-toast-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.t.out { opacity: 0; transform: translateY(10px); transition: opacity 240ms ease, transform 240ms ease; }
@media (prefers-reduced-motion: reduce) { .t { animation: none; } }
`;

let toastHost: HTMLDivElement | null = null;
let toastRoot: ShadowRoot | null = null;
let toastTimer: number | undefined;

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export function showToast(
  message: string,
  kind: 'success' | 'error' = 'success',
  action?: ToastAction,
): void {
  if (!toastRoot) {
    toastHost = document.createElement('div');
    toastHost.id = 'emplorio-toast-host';
    toastHost.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:2147483647;';
    toastRoot = toastHost.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = TOAST_CSS;
    toastRoot.appendChild(style);
    (document.documentElement || document.body).appendChild(toastHost);
  }
  const prev = toastRoot.querySelector('.t');
  if (prev) prev.remove();
  clearTimeout(toastTimer);

  const el = document.createElement('div');
  el.className = `t ${kind}`;
  const dot = document.createElement('span');
  dot.className = 'dot';
  el.appendChild(dot);
  el.appendChild(document.createTextNode(message));

  const dismiss = () => {
    el.classList.add('out');
    window.setTimeout(() => el.remove(), 260);
  };

  if (action) {
    const btn = document.createElement('button');
    btn.className = 't-action';
    btn.textContent = action.label;
    btn.addEventListener('click', () => {
      action.onClick();
      dismiss();
    });
    el.appendChild(btn);
  }

  toastRoot.appendChild(el);
  toastTimer = window.setTimeout(dismiss, action ? 6000 : 3200);
}

/* ---------- On-page field flash ---------- */

const FLASH_STYLE_ID = 'emplorio-flash-style';

function ensureFlashStyle(): void {
  if (document.getElementById(FLASH_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = FLASH_STYLE_ID;
  style.textContent = `
@keyframes emplorio-field-flash {
  0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
  25% { box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.5); }
  100% { box-shadow: 0 0 0 3px rgba(99, 102, 241, 0); }
}
.emplorio-field-flash { animation: emplorio-field-flash 1s ease-out; border-radius: 4px; }
@media (prefers-reduced-motion: reduce) { .emplorio-field-flash { animation: none; } }`;
  (document.head || document.documentElement).appendChild(style);
}

export function flashFields(els: HTMLElement[]): void {
  if (!els.length) return;
  ensureFlashStyle();
  for (const el of els) {
    el.classList.remove('emplorio-field-flash');
    // Force reflow so re-adding the class restarts the animation.
    void el.offsetWidth;
    el.classList.add('emplorio-field-flash');
    window.setTimeout(() => el.classList.remove('emplorio-field-flash'), 1100);
  }
}

const OUTLINE_STYLE_ID = 'emplorio-outline-style';

function ensureOutlineStyle(): void {
  if (document.getElementById(OUTLINE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = OUTLINE_STYLE_ID;
  style.textContent = `
.emplorio-skip-outline {
  outline: 2px dashed #d97706 !important;
  outline-offset: 1px !important;
  border-radius: 4px;
}`;
  (document.head || document.documentElement).appendChild(style);
}

/** Mark recognised fields we had no data for, so the user sees what to finish by hand. */
export function outlineUnmapped(selectors: string[]): void {
  if (!selectors.length) return;
  ensureOutlineStyle();
  for (const sel of selectors) {
    let el: Element | null = null;
    try {
      el = document.querySelector(sel);
    } catch {
      continue;
    }
    if (!(el instanceof HTMLElement)) continue;
    el.classList.add('emplorio-skip-outline');
    const target = el;
    window.setTimeout(() => target.classList.remove('emplorio-skip-outline'), 6000);
  }
}
