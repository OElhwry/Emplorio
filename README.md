# Emplorio

**Apply once. Send everywhere.**

A browser extension and AI backend that kills the 30-minute job application. Fill your profile in once, and Emplorio handles every form after — autofilling fields across every major ATS, tailoring your CV to each role, and drafting cover letters grounded in your real work history.

---

## The Problem

Serious job hunters fill the same 20 fields (name, email, phone, work authorisation, previous roles, EEO questions) across 10+ applications a day. Each application takes 20–40 minutes of copy-paste tedium, and that's before writing a custom cover letter or re-shaping the CV to match the job description. The pain compounds: applying to 100 roles costs 40+ hours of pure form-filling.

## The Solution

A Chrome extension that knows your profile and fills forms on detection, plus a web dashboard that tracks every application and generates tailored documents on demand. The LLM is grounded in your real CV — it rewrites, reorders, and emphasises; it never invents.

---

## Core Features

### 1. Smart Autofill (browser extension)

One click fills every field on a job application form. Three-layer detection strategy:

- **ATS adapters** — hardcoded selectors for Greenhouse, Lever, Workday, and Ashby (covers ~70% of mid-size and enterprise applications)
- **Generic heuristics** — matches `autocomplete` attributes, then `name`/`id`, then adjacent `<label>` text against a known profile schema
- **LLM fallback** — for unknown forms, serialises field labels and sends them to Claude, which returns a mapping. Cached per-domain so the model runs once per new site, not every visit

### 2. Co-Pilot Mode (default)

Every application is reviewed before submission. Emplorio fills every field, generates the CV and cover letter, and stops — you eyeball it, adjust anything, and hit submit yourself. Full control, zero form-filling. This is the default mode because auto-submit-without-review looks like spam to recruiters.

### 3. Auto-Apply Mode (opt-in, power users)

For vetted job boards where you've reviewed the role already, Emplorio can submit end-to-end automatically. Rate-limited and always logs every submission to the dashboard, with the full payload stored so you know exactly what went out.

### 4. Tailored CVs

Upload your base CV once (or build it in the profile editor). For each role, Claude receives the job description plus your structured CV and returns a tailored version — bullets reordered, relevant experience emphasised, vocabulary matched to the JD. Exported as PDF via `react-pdf`. Every tailored version is saved and diffable against your base.

### 5. Cover Letter Generator

Streaming cover letters generated from `{ jobDescription + company + role + your profile + tone preference }`. Uses Claude's prompt caching on the profile half — base CV cached once, every generation reuses it → 10× cheaper, 3× faster. Editable textarea before sending.

### 6. Application Dashboard

Every application tracked with: company, role, job URL, frozen JD snapshot, status (applied → interview → offer/rejected), notes, and attached generated docs. You always know where you stand, and the JD snapshot means you can regenerate a tailored CV six weeks later even if the posting is taken down.

### 7. Smart Job Matching (stretch)

Filters incoming jobs by role, seniority band, salary floor, and remote/hybrid. Sources from public job APIs (Adzuna, JSearch) rather than scraping LinkedIn — legally cleaner and more reliable. Probably phase 2: the autofill product stands alone without it.

---

## How It Works — User Flow

1. **Sign up** → build profile (personal info, work history, education, skills, preferences). ~10 minutes, one time only.
2. **Install extension** → find a job → click "Fill". Every field populates in under a second.
3. **Click "Tailor CV"** or "Generate cover letter" in the dashboard. Claude streams the result; you tweak and save.
4. **Review → submit.** Application logs automatically to the dashboard.
5. **Track** → update status as you hear back.

---

## Tech Stack

| Layer     | Choice                                                          | Why                                                          |
| --------- | --------------------------------------------------------------- | ------------------------------------------------------------ |
| Extension | TypeScript + React + Vite + `@crxjs/vite-plugin` (Manifest V3)  | Modern MV3 DX, shared types with backend                     |
| Backend   | Fastify on Node 22                                              | Real server (not serverless) — middleware, SSE, long-running |
| ORM       | Drizzle                                                         | SQL-first, strong TS inference, looks serious on a CV        |
| DB        | Neon (serverless Postgres)                                      | New tool vs Supabase past, has branching                     |
| Auth      | Roll-your-own magic link → HTTP-only JWT cookie                 | Backend-depth signal                                         |
| Host      | Fly.io (Docker)                                                 | Persistent container, global regions, real `fly.toml`        |
| Jobs      | BullMQ + Upstash Redis                                          | Async PDF generation, LLM batch                              |
| Storage   | Cloudflare R2                                                   | S3-compatible, cheap, for stored PDFs                        |
| Email     | Resend                                                          | Magic-link delivery                                          |
| LLM       | Claude API (`@anthropic-ai/sdk`) with prompt caching + streaming | Best long-context model, cache-friendly for profile reuse    |
| PDF       | `@react-pdf/renderer`                                           | Pure JS, no headless browser ops                             |
| Logs      | Pino → Axiom                                                    | Structured logging, free tier                                |
| Tests     | Vitest + Testcontainers                                         | Integration tests against real Postgres                      |

### Repo layout — pnpm monorepo

```
emplorio/
├── apps/
│   ├── extension/     # MV3 + React + Vite
│   ├── api/           # Fastify server
│   └── web/           # Next.js dashboard
└── packages/
    ├── shared/        # Types, Zod schemas, ProfileKey enum
    └── db/            # Drizzle schema + migrations
```

### Architecture at a Glance

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Extension   │   │ Web Dashboard│   │   Claude API │
│ (MV3 content │   │  (Next.js)   │   │              │
│  + popup)    │   │              │   │              │
└──────┬───────┘   └──────┬───────┘   └──────▲───────┘
       │                  │                  │
       │  HTTPS + cookie  │                  │
       └────────┬─────────┘                  │
                ▼                            │
         ┌─────────────┐                     │
         │   Fastify   │─────────────────────┘
         │   API       │   (streaming, cached prompts)
         └──────┬──────┘
                │
      ┌─────────┼──────────┬──────────┐
      ▼         ▼          ▼          ▼
   Neon PG   Redis      R2 blobs   Resend
              (jobs)    (PDFs)     (email)
```

---

## Data Model — Highlights

- **`profiles`** (+ nested `work_history`, `education`, `skills`) — the single source of truth for every generated document
- **`applications`** — with `jdSnapshot` frozen at apply-time so regeneration works forever
- **`generated_docs`** — every cover letter and tailored CV, with `tokensIn`/`tokensOut`/`cacheHit` for cost telemetry
- **`field_mappings`** — global, not per-user — Stripe's Greenhouse form is the same for every applicant, so one user's LLM call benefits everyone. Big cost win.

---

## Roadmap

### MVP (weeks 1–3)

- Extension with Greenhouse + Lever adapters only
- Profile editor, local storage
- Cover letter generation (no CV tailoring yet)
- Co-Pilot mode only

### v1 (weeks 4–6)

- Backend + auth + cloud sync
- LLM field-mapping fallback (works on any site)
- CV tailoring with PDF export
- Application dashboard with full CRUD
- Workday + Ashby adapters

### v2 (stretch)

- Auto-Apply mode (opt-in, rate-limited)
- Smart Job Matching via Adzuna/JSearch
- Response-rate analytics per CV variant
- Chrome Web Store listing
- Public landing page at `emplorio.app`

---

## Why It Stands Out (Portfolio Angle)

This is the only project in the portfolio that demonstrates all of:

- Browser extension engineering (Manifest V3, content scripts, cross-context messaging)
- Real backend (hand-written Fastify server on Docker, not BaaS)
- LLM product thinking (streaming, prompt caching, grounded generation, cost telemetry)
- PDF generation (interesting technical wrinkle)
- Privacy discipline (sensitive PII → encryption at rest, scoped permissions, no logging of profile data)
- Product sense (Co-Pilot as default, Auto-Apply as opt-in — restraint over flash)

Plus the narrative: *"I built it while job hunting, used it on the roles I'm interviewing for right now, and it saved me 40+ hours."*

---

## Getting Started

```bash
pnpm install
cp .env.example .env       # fill in DATABASE_URL, ANTHROPIC_API_KEY, etc.
pnpm db:migrate
pnpm dev                   # runs api + web + extension in parallel
```

Then load `apps/extension/dist` as an unpacked extension in Chrome.
