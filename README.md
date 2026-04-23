# Emplorio

**Apply once. Send everywhere.**

A Chrome extension and AI backend that kills the 30-minute job application. Fill your profile in once, and Emplorio handles every form after — autofilling fields across every major ATS, drafting cover letters and answers grounded in your real work history, and tracking every application you send.

| | |
|---|---|
| **Web** | [emplorio.co.uk](https://emplorio.co.uk) |
| **API** | [emplorio-api.fly.dev](https://emplorio-api.fly.dev/health) |
| **Extension** | Chrome Web Store *(in review)* |
| **Status** | v1.0.0 — production |

---

## What it does

### Smart autofill across 9 ATS platforms

Click once and every field on a job application populates in under a second. Built-in adapters with hardcoded selectors for:

**Greenhouse · Lever · Workday · Ashby · LinkedIn · Indeed · Workable · SmartRecruiters · iCIMS**

Three-layer detection strategy:

1. **ATS adapters** — bespoke selectors per platform (covers most mid-size + enterprise applications)
2. **Generic heuristics** — matches `autocomplete` attributes → `name`/`id` → adjacent `<label>` text against a known profile schema
3. **LLM fallback** — for unknown forms, serialises field labels and asks Claude for a mapping. Cached per-domain so the model runs once per new site, not every visit

### AI cover letters, question answers & follow-ups *(BYO Anthropic key)*

- **Cover letters** streamed from `{ jobDescription + company + role + your profile + tone }`
- **Open-ended question drafts** ("Why this role?", "Tell us about a time…") drafted from your CV + the question
- **Follow-up emails** post-application
- **CV extraction** — drop a PDF in once, Claude pulls structured work history into your profile

The Anthropic key lives only in `chrome.storage` on your device. When you trigger an AI action it's sent on a single request, used to call Anthropic on your behalf, and discarded server-side. Never logged, never persisted.

### Application tracking

Every application logs automatically with company, role, URL, status, and timestamps. The job description is frozen at apply-time so you can regenerate a tailored draft six weeks later even if the posting is taken down.

### Cross-device sync

Sign in once with a magic-link OTP. Profile, application history, and generated drafts sync to a Postgres database in the EU and follow you across browsers.

### Privacy-first by design

- Bring your own AI key — Emplorio never bills you, never holds it
- All data stored in the EU (Neon / Frankfurt) and London (Fly.io / `lhr`)
- No analytics, no tracking pixels, no advertising
- Open source — read the code that runs on your machine

---

## Tech stack

| Layer | Choice |
|---|---|
| **Extension** | TypeScript · React 18 · Vite · `@crxjs/vite-plugin` · Manifest V3 |
| **Web** | Next.js 15 (App Router) · React 18 · vanilla CSS · Radix UI · deployed on **Vercel** |
| **API** | Fastify on Node 22 · Docker · deployed on **Fly.io** (London region) |
| **Database** | **Neon** Postgres (EU) · Drizzle ORM |
| **Auth** | Magic-link OTP via Resend → HTTP-only JWT cookie + bearer token |
| **AI** | Anthropic Claude (`@anthropic-ai/sdk`) with prompt caching + streaming |
| **PDF** | `pdfjs-dist` for CV extraction |
| **Email** | **Resend** for OTP delivery |
| **Tests** | Vitest |

### Repo layout — pnpm monorepo

```
emplorio/
├── apps/
│   ├── extension/         # MV3 Chrome extension (popup + content scripts + service worker)
│   │   ├── src/adapters/  # 9 ATS adapters
│   │   └── src/lib/       # autofill engine, AI client, scrape, sync, settings, theme
│   ├── api/               # Fastify server
│   │   └── src/routes/    # /auth /profile /applications /generate /field-mappings
│   └── web/               # Next.js marketing site (emplorio.co.uk)
└── packages/
    ├── shared/            # Zod schemas, types, ProfileKey enum
    └── db/                # Drizzle schema + migrations
```

### Architecture

```
┌────────────────┐    HTTPS + bearer/cookie    ┌──────────────────┐
│  Chrome Ext    │ ──────────────────────────▶ │   Fastify API    │
│  (popup +      │                              │   (Fly.io / lhr) │
│   content)     │ ◀──────────────────────────  │                  │
└───────┬────────┘                              └────┬─────────┬───┘
        │                                            │         │
        │ chrome.storage (profile cache)             │         │
        ▼                                            ▼         ▼
   user's device                              Neon Postgres   Anthropic
                                              (EU)            (BYO key)

┌────────────────┐
│  emplorio.co.uk│  Static marketing + privacy + terms (Vercel)
└────────────────┘
```

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Alt+Shift+E` | Open Emplorio popup |
| `Alt+Shift+F` | Fill the current form |
| `Alt+Shift+S` | Save the current job to history |

---

## Getting started (local dev)

```bash
# 1. Install
pnpm install

# 2. Environment
cp .env.example .env       # fill DATABASE_URL, JWT_SECRET, RESEND_API_KEY, etc.

# 3. Database
pnpm db:migrate

# 4. Run everything in parallel
pnpm dev                   # api on :3001, web on :3000, extension watcher

# 5. Load extension in Chrome
# chrome://extensions → Developer mode → Load unpacked → select apps/extension/dist
```

### Building for production

```bash
# Web (Vercel auto-deploys from main)
pnpm --filter @emplorio/web build

# API (Fly.io — see apps/api/fly.toml)
cd apps/api && fly deploy

# Extension (output → apps/extension/dist, ready to zip for CWS)
VITE_API_ORIGIN=https://emplorio-api.fly.dev pnpm --filter @emplorio/extension build
```

### Useful scripts

```bash
pnpm typecheck             # tsc --noEmit across the monorepo
pnpm test                  # vitest, all workspaces
pnpm db:studio             # Drizzle Studio against your DATABASE_URL
pnpm db:generate           # generate a new migration from schema changes
```

---

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | api | Neon Postgres connection string |
| `JWT_SECRET` | api | ≥32 chars; signs session tokens |
| `RESEND_API_KEY` | api | OTP email delivery |
| `EMAIL_FROM` | api | Sender for OTP emails |
| `WEB_ORIGIN` | api | CORS allow origin (e.g. `https://emplorio.co.uk`) |
| `COOKIE_DOMAIN` | api | e.g. `emplorio.co.uk` in prod |
| `ANTHROPIC_API_KEY` | api *(optional)* | Server-owned fallback key — users normally bring their own |
| `ANTHROPIC_MODEL` | api | Defaults to `claude-opus-4-7` |
| `EMPLORIO_API_KEY` | api + extension | Optional shared secret to gate the API |
| `VITE_API_ORIGIN` | extension build | Production API URL baked into the bundle |

---

## Privacy & data

See [emplorio.co.uk/privacy](https://emplorio.co.uk/privacy) and [emplorio.co.uk/terms](https://emplorio.co.uk/terms) for the full policy.

Short version:

- **Stored on our database (Neon, EU):** your sign-in email, profile fields, application history, generated drafts, settings
- **Stored only on your device (`chrome.storage`):** your Anthropic API key, theme preference, in-progress sign-in state
- **Never collected:** payment info, location, browsing history, telemetry
- **Third parties:** Neon (database), Fly.io (API hosting), Resend (OTP email), Anthropic (AI generation, only when you've added a key)

---

## Roadmap

- [x] MV1 — Greenhouse + Lever adapters, profile editor, local storage
- [x] v1.0 — 9 ATS adapters · API + auth + cloud sync · AI cover letters / answers / follow-ups · CV extraction · application tracking · marketing site · privacy/terms · Chrome Web Store submission
- [ ] v1.1 — Auto-Apply mode (opt-in, rate-limited) · response-rate analytics per CV variant · more ATS adapters
- [ ] v2 — Smart job matching (Adzuna / JSearch APIs) · tailored CV PDF export · team/agency mode

---

## Why it stands out

- **Browser extension engineering** — Manifest V3, content scripts, cross-context messaging, MV3-compliant CSP (no inline scripts)
- **Real backend** — hand-written Fastify on Docker, not BaaS
- **LLM product thinking** — streaming, prompt caching, BYO-key model that aligns incentives, grounded generation that never invents
- **Privacy discipline** — sensitive PII handling, scoped permissions (no `https://*/*`), no logging of profile data, EU-only storage
- **Product sense** — Co-Pilot as default, Auto-Apply as opt-in; restraint over flash

---

## License & contact

Personal project, all rights reserved.
Questions / bugs: [emplorioEXT@gmail.com](mailto:emplorioEXT@gmail.com)
