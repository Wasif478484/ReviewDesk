# ReviewDesk

> Know when not to reply.

[![CI](https://github.com/Wasif478484/ReviewDesk/actions/workflows/ci.yml/badge.svg)](https://github.com/Wasif478484/ReviewDesk/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/built%20with-Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)

ReviewDesk is an owner-in-the-loop review triage assistant for local businesses.
It analyzes a customer review and recommends one of four actions:

- **Reply** — a low-risk public response can be drafted.
- **Check facts** — an owner should verify details before replying.
- **Hold** — the review needs careful handling before any public response.
- **Report** — the content may be spam, abuse, or an inappropriate review.

ReviewDesk drafts text for the owner to edit and copy by hand. It does **not**
log in to Google, post replies, report reviews, scrape websites, or send
anything automatically.

## Features

- Single-review and batch analysis, plus bulk record/dismiss/copy.
- English, Urdu script, Roman Urdu, French, Arabic, and other language support.
- Per-review tone switching (warm, formal, apologetic) with re-analysis.
- Draft safety checks for unapproved offers, phone numbers, stock phrases, and
  oversized responses.
- Safety policy that keeps holds, reports, negative sentiment, risk flags, and
  untrusted languages out of the automatic lane.
- Owner-in-the-loop workflow with veto windows, approval queue, audit log,
  CSV export (reviews + triage results).
- Google Business Profile API integration (optional, with honest status).
- Encrypted credential storage (AES-256-GCM).
- Email verification and password reset.
- Mock provider mode for offline demos without an API key.
- Draft version history with revert.
- Keyboard shortcuts (A = analyze, R = record, C = copy, D = dismiss,
  V = revert draft).
- Dark slate theme with paper-white cards and action-colored badges.

## Tech stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, DaisyUI
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL (Neon)
- **Auth:** bcrypt + JWT httpOnly sessions, email verification, password reset
- **LLM:** OpenAI / Anthropic (optional), mock provider for demos
- **UI:** OriginKit components (SkewInText, LabelSlideButton, SpotlightText)
  + motion effects (Reveal, CountUp, GlowCard, Marquee)

## Quick start

### Prerequisites

- Node.js 20+ and npm (or Bun)
- PostgreSQL database (Neon recommended)

### Setup

```bash
git clone https://github.com/Wasif478484/ReviewDesk.git
cd ReviewDesk
npm install --legacy-peer-deps
cp .env.example .env
# Edit .env: set DATABASE_URL and APP_SECRET (openssl rand -hex 32)
npx prisma db push
npm run dev
```

Open http://localhost:3000.

**Live demo:** https://reviewdesk-nu.vercel.app

### Mock mode (no API key)

Set `REVIEWDESK_PROVIDER=mock` in `.env` to run with canned responses.
No API key needed.

## Deploy to Vercel (recommended)

The repository is ready to deploy as a Vercel app:

1. Sign in at https://vercel.com/ with GitHub.
2. Import `Wasif478484/ReviewDesk`, branch `master`.
3. Vercel auto-detects Next.js. Build command: `npm run build`.
4. In **Environment Variables**, add:
   - `DATABASE_URL` — your PostgreSQL connection string (e.g., Neon)
   - `APP_SECRET` — a 64-hex-character secret (`openssl rand -hex 32`)
   - `REVIEWDESK_PROVIDER` — `mock` or `openai`
   - `OPENAI_API_KEY` — your OpenAI API key (if using openai)
   - `OPENAI_MODEL` — `gpt-4o-mini`
5. Deploy the app and open the generated public URL.

For production database, use Neon PostgreSQL:
- Create a Neon project at https://neon.tech
- Copy the connection string
- Set `DATABASE_URL` in Vercel environment variables
- Run `npx prisma migrate deploy` on first deploy

Secrets are read from Vercel encrypted environment variables. Never put
the API key in Git, `.env` files committed to the repository, screenshots,
or logs. Live calls use OpenAI and may incur costs; the app remains
owner-in-the-loop and never posts replies automatically.

## Using a live model provider

Copy `.env.example` to `.env`, then configure one provider.
The `.env` file is ignored by Git and must never be committed.

```powershell
Copy-Item .env.example .env
```

Supported providers:

| Provider | Environment variable | Default model |
| --- | --- | --- |
| `mock` | None | Canned offline responses |
| `anthropic` | `ANTHROPIC_API_KEY` | `claude-3-haiku-20240307` |
| `openai` | `OPENAI_API_KEY` | `gpt-4o-mini` |

Set the provider with `REVIEWDESK_PROVIDER`. Live model calls cost money and
review text is sent to the selected provider. Use mock mode for demos and tests.

## How the workflow works

1. The owner signs up and completes onboarding (business details, tone,
   language preferences).
2. The desk loads with a demo inbox of 15 sample reviews.
3. The owner analyzes reviews (single or batch). The app builds a constrained
   model request and calls the configured provider, with one retry.
4. The response is parsed and validated. Invalid output falls back to owner
   review.
5. The safety policy applies the frozen safety rules.
6. The owner edits the draft, optionally adds a sign-off, then approves,
   dismisses, or copies the draft to paste into Google Business manually.
7. Every decision is recorded in the audit ledger.

The Autopilot tab is a simulated, opt-in workflow for demonstrating veto windows
and approval handling. It records local demo outcomes only; it never sends a
reply to Google.

## Repository structure

```
.
├── src/app/                  # Next.js App Router pages and API routes
│   ├── api/                  # API endpoints (auth, workspace, analyze, etc.)
│   ├── page.tsx              # Single-route shell (landing/auth/onboarding/dashboard)
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Design system (daisyUI theme + rd-* utilities)
├── src/components/           # React components
│   ├── auth/                 # Authentication views
│   ├── dashboard/            # Dashboard shell + Ledger, Autopilot, Settings tabs
│   ├── landing/              # Public marketing page
│   ├── legal/                # Privacy and Terms
│   ├── onboarding/           # First-run business and Google setup
│   ├── originkit/            # Motion/type effects (SkewInText, SpotlightText, LabelSlideButton)
│   ├── shared/               # Primitives used across screens (logo, stamps, banners, draft card, sortable table)
│   └── ui/                   # shadcn/ui primitives
├── src/hooks/                # React hooks (toast, mobile breakpoint)
├── src/lib/                  # Core libraries
│   ├── engine/               # Pure logic: prompts, policy rules, sample inbox
│   ├── server/               # Server-only: auth, crypto, db, google, llm, mail, workspace
│   └── utils.ts              # Client-side utilities
├── src/types/                # Types shared by API and UI
├── prisma/                   # Database schema
├── public/                   # Static assets
├── website/                  # Static landing page (marketing site)
├── docs/                     # Architecture documentation
├── .github/workflows/        # CI checks
├── .env.example              # Environment template
├── vercel.json               # Vercel deployment config
└── README.md
```

See CONTRIBUTING.md for development rules.

## Verification

Run the same checks used by CI:

```bash
npm run build
npm run lint
git diff --check
```

Expected results:

- Build: success (all routes compiled)
- Lint: no errors
- Whitespace: clean

GitHub Actions runs these checks on pushes and pull requests.

## Privacy and safety

- Reviews remain in the database unless sent to the selected model
  provider for analysis.
- Local model results are cached temporarily.
- No secrets, personal review data, cache files, or bytecode belong in Git.
- User and model-produced text is HTML-escaped before custom rendering.
- The app never posts replies automatically — the owner copies by hand.

## Project scope

### In scope

- Review triage.
- Safe draft generation.
- Owner review and manual copy workflow.
- Mock provider and simulated source.
- Audit and export for the local demo.
- Google Business Profile API integration (stub until approved access).

### Deferred

- Background workers and scheduled processing.
- Payments, scraping, and automatic posting.

## Contributing

Read CONTRIBUTING.md before changing the code.

## License

No license has been selected for this repository yet. Do not reuse or
redistribute the project until a license is added.