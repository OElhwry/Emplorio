# Emplorio UI/UX pass — resume plan

Context: running a prioritised UI/UX improvement pass across the extension popup and the marketing homepage. Popup work is done. Homepage work is partially done.

## Writing rules
No hyphens or em-dashes in prose. Use commas or periods instead.

## Status snapshot

### Completed (popup)
- Shared SVG icon module at [apps/extension/src/popup/icons.tsx](apps/extension/src/popup/icons.tsx) with IconSparkles, IconMail, IconLightbulb, IconCalendar, IconStar, IconExternal, IconDownload, IconPower, IconSun, IconMoon, IconMonitor, IconEye, IconEyeOff, IconCheck, IconX, IconLock, IconPlay, IconPause, IconPartyPopper, IconSettings, IconSpinner.
- All emoji removed from popup UI, replaced with icons.
- Settings moved out of the tab bar into a header gear button. Five tabs remain.
- Popup widened from 380 to 400 in `apps/extension/src/popup/App.tsx` (`styles.main`).
- StatusLine component with info/success/error variants, spinner component, touch-target bumps for chips/buttons/tabs.
- Settings feature comparison reframed as "Included free" vs "Unlock with key"/"Unlocked", with IconCheck or IconSparkles per row. See [apps/extension/src/popup/SettingsPanel.tsx](apps/extension/src/popup/SettingsPanel.tsx).
- Onboarding polished: numbered step pills, IconPartyPopper, IconSpinner on the extract button. See [apps/extension/src/popup/Onboarding.tsx](apps/extension/src/popup/Onboarding.tsx).
- Matching CSS in [apps/extension/src/popup/popup.css](apps/extension/src/popup/popup.css): `.icon-btn`, `.btn-with-icon`, `.spin` keyframes, `.banner-row`, `.status-line` variants, `.empty-state`, `.onb-list-icons`, `.onb-step-num`, `.onb-title-row`.

### In progress (homepage)
Mobile nav drawer scaffolded in [apps/web/app/page.tsx](apps/web/app/page.tsx) `Nav()`. The JSX is there: hamburger button, drawer dialog with backdrop, panel with links, ThemeToggle, and Install CTA. ESC key closes, body scroll lock on open.

Missing pieces:
1. `IconMenu` and `IconX` components are referenced but not yet defined at the bottom of [page.tsx](apps/web/app/page.tsx). Add them alongside the other Lucide style inline SVG helpers (IconChrome, IconArrowRight, etc.).
2. CSS for `.nav-hamburger`, `.nav-drawer`, `.nav-drawer-backdrop`, `.nav-drawer-panel`, `.nav-drawer-head`, `.nav-drawer-brand`, `.nav-drawer-close`, `.nav-drawer-links`, `.nav-drawer-foot` has not been written in [apps/web/app/globals.css](apps/web/app/globals.css).
3. The existing rule `@media (max-width: 720px) { .nav-links a:not(.nav-cta) { display: none; } }` at line 677 of [globals.css](apps/web/app/globals.css#L677) needs to be replaced with a rule that hides the whole `.nav-links` on mobile and shows `.nav-hamburger`. Desktop should hide `.nav-hamburger`.

### Pending homepage edits

All in [apps/web/app/page.tsx](apps/web/app/page.tsx) or [apps/web/app/globals.css](apps/web/app/globals.css).

1. **Pricing tier rewording.** In `Pricing()` in [page.tsx](apps/web/app/page.tsx), the featured tier currently reads `tier-name: "Free + your key"` and `tier-price: "~£0.01 per application"`. Change to `tier-name: "With AI features"`, move the cost note into `tier-desc` as prose, and set the price line to something like `Your key` or reuse the Free price so both tiers align visually. Badge `With AI` can stay.
2. **Remove duplicate ATS mentions.** LogosMarquee already lists every ATS. Drop the inline mention in:
   - `Hero()` hero-meta: change `Works on Greenhouse, Lever, Workday, Ashby` to a shorter line like `Works on the ATS systems you actually use` or drop that chip.
   - `WhatItDoes()` bento featured card paragraph that re-lists `Greenhouse, Lever, Workday, Ashby, iCIMS, Workable, SmartRecruiters, Indeed, and LinkedIn`. Shorten to `Detects fields on every major ATS and fills them from your saved profile in under a second.`
3. **Trim background noise** in [globals.css](apps/web/app/globals.css):
   - Delete the `body::after` film grain rule at lines 310 to 319.
   - Delete `.orb-4` rule at lines 165 to 170 and the dark theme variant at line 176. Remove the `orb-4` span from the JSX in `AmbientBackground()` in [page.tsx](apps/web/app/page.tsx) around line 142. Can leave `@keyframes orb-drift-d` or delete it.
   - The mobile override at line 284 that hides `.orb-4` becomes redundant, drop it too.
4. **Remove blur on scroll reveal** in [globals.css](apps/web/app/globals.css) lines 1749 to 1766: remove `filter: blur(2px)` from `.reveal`, drop `filter` from the transition list, remove `filter: blur(0)` from `.reveal.is-visible`, and remove `filter` from the reduced motion reset.
5. **Tighten mobile section padding** in [globals.css](apps/web/app/globals.css) line 385: change `padding: 64px 0` to `padding: 48px 0`.
6. **Hide kbd shortcut row on mobile** in the bento featured card. The inline styles at lines 526 to 530 of [page.tsx](apps/web/app/page.tsx) should be replaced with a CSS class like `.bento-shortcut-row`, then hidden with `@media (max-width: 640px) { .bento-shortcut-row { display: none; } }`.
7. **Reduce mockup tilt** in [globals.css](apps/web/app/globals.css) line 920: change `rotateY(-8deg) rotateX(3deg)` to `rotateY(-2deg) rotateX(1deg)`. Hover transform at line 924 can stay or flatten fully.
8. **Stagger float cards.** In [page.tsx](apps/web/app/page.tsx) `MockupPreview()`, add `style={{ animationDelay: '0ms' }}` and `style={{ animationDelay: '150ms' }}` to fc-1 and fc-2 (or adjust the existing values in [globals.css](apps/web/app/globals.css) lines 1108 and 1113 from `0s` and `1.5s` to something tighter like `0s` and `0.4s`).
9. **FAQ hover colour fade.** In [globals.css](apps/web/app/globals.css) around line 1610, add `transition: color 180ms var(--ease)` to `.faq-trigger` and a `.faq-item:hover .faq-trigger { color: var(--accent); }` rule, or similar subtle change.
10. **Stats counter debounce** in `Stats()` in [page.tsx](apps/web/app/page.tsx) lines 837 to 894: check `localStorage.getItem('emplorio-stats-seen')` inside the IO callback. If set, write the final value directly and skip the rAF animation. After first run, set the flag.

## File anchors for quick lookup

- Homepage page source: [apps/web/app/page.tsx](apps/web/app/page.tsx)
- Homepage styles: [apps/web/app/globals.css](apps/web/app/globals.css)
- Popup root: [apps/extension/src/popup/App.tsx](apps/extension/src/popup/App.tsx)
- Popup icons: [apps/extension/src/popup/icons.tsx](apps/extension/src/popup/icons.tsx)
- Popup styles: [apps/extension/src/popup/popup.css](apps/extension/src/popup/popup.css)

## Build and verification
No build has been run since these changes. Before declaring homepage work done, run the Next dev server (full kill plus clear plus start sequence, per standing preference) and eyeball the nav drawer, pricing card, mobile spacing, and scroll reveal in the browser.
