# ReviewDesk

> Know when not to reply.

[![CI](https://github.com/Wasif478484/ReviewDesk/actions/workflows/ci.yml/badge.svg)](https://github.com/Wasif478484/ReviewDesk/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Wasif478484/ReviewDesk?label=release)](https://github.com/Wasif478484/ReviewDesk/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-24%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

ReviewDesk is an owner-in-the-loop review triage assistant for local
businesses. It analyzes a customer review and recommends one of four actions:

| Action          | Meaning                                                       |
| --------------- | ------------------------------------------------------------- |
| **Reply**       | A low-risk public response can be drafted.                    |
| **Check facts** | An owner should verify details before replying.               |
| **Hold**        | The review needs careful handling before any public response. |
| **Report**      | The content may be spam, abuse, or an inappropriate review.   |

ReviewDesk drafts text for the owner to edit and copy by hand. It does **not**
log in to Google, post replies, report reviews, scrape websites, or send
anything automatically.

## Demo

[![ReviewDesk demo](demo-assets/reviewdesk-demo.mp4)](demo-assets/reviewdesk-demo.mp4)

A three-minute walkthrough: [demo-assets/reviewdesk-demo.mp4](demo-assets/reviewdesk-demo.mp4)
(1920x1080, 2m 56s, silent track so narration can be added later).

**Live app:** https://reviewdesk-nu.vercel.app

**Screenshots:** [demo-assets/gallery/](demo-assets/gallery/) holds 15 images at
1600x1067, the 3:2 ratio for a project gallery. The upload order and the
caption for each one are in
[gallery/README.md](demo-assets/gallery/README.md).

## Features

- Single-review and batch analysis, plus bulk record, dismiss, and copy.
- English, Urdu script, Roman Urdu, French, Arabic, and other language support.
- Per-review tone switching (warm, formal, apologetic) with re-analysis.
- Draft safety checks for unapproved offers, phone numbers, stock phrases, and
  oversized responses.
- Safety policy that keeps holds, reports, negative sentiment, risk flags, and
  untrusted languages out of the automatic lane.
- Owner-in-the-loop workflow with veto windows, approval queue, audit log, and
  CSV export for both the reviews and the triage results.
- Priority scoring (urgent, normal, low) so holds and risk flags surface
  first.
- Automation rules: owner-configured rules can force the triage action or
  raise the priority. A rule never posts to Google.
- Teams: organizations with owner, manager, responder, and viewer roles.
- Reply template library: save the phrases you reuse and insert them into any
  draft.
- Review source filtering across Google, Yelp, Facebook, TripAdvisor, and
  imported CSV.
- Analytics breakdown by action, priority, and source.
- Google Business Profile API integration (optional, with an honest status).
- Encrypted credential storage (AES-256-GCM).
- Email verification and password reset.
- Mock provider mode for offline demos without an API key.
- Draft version history with revert.
- Keyboard shortcuts: `A` analyze, `R` record, `C` copy, `D` dismiss,
  `V` revert draft.
- Health endpoint at `/api/health` for liveness and readiness.

## Tech stack

| Layer     | Choice                                                                           |
| --------- | -------------------------------------------------------------------------------- |
| Framework | Next.js 16 (App Router), React 19                                                |
| Language  | TypeScript 5, strict                                                             |
| Styling   | Tailwind CSS 4, DaisyUI 5, one custom theme                                      |
| Database  | PostgreSQL on Neon, Prisma ORM                                                   |
| Auth      | bcrypt plus a signed httpOnly session cookie, email verification, password reset |
| Model     | OpenAI or Anthropic, with a mock provider for demos                              |
| Motion    | OriginKit and local effects, reduced-motion aware                                |
| Tests     | `node:test` with native TypeScript stripping                                     |

## Quick start

### Prerequisites

- Node.js 24 or newer (see [.nvmrc](.nvmrc))
- A PostgreSQL database. [Neon](https://neon.tech) has a free tier.

### Setup

```bash
git clone https://github.com/Wasif478484/ReviewDesk.git
cd ReviewDesk
npm install --legacy-peer-deps
cp .env.example .env
```

Fill in `.env`:

```bash
# Required
DATABASE_URL="postgresql://user:password@host:5432/reviewdesk?sslmode=require"
APP_SECRET="$(openssl rand -hex 32)"

# Optional. Set to "mock" for offline demos with no API key.
REVIEWDESK_PROVIDER="mock"
```

Check the environment, then set the database up and run it:

```bash
npm run env:check
npx prisma migrate deploy
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command                     | What it does                                    |
| --------------------------- | ----------------------------------------------- |
| `npm run dev`               | Start the dev server on port 3000               |
| `npm run build`             | Clean the Prisma client, generate it, and build |
| `npm run start`             | Serve the production build                      |
| `npm run check`             | Type check, lint, and test in one go            |
| `npm run typecheck`         | `tsc --noEmit`                                  |
| `npm run lint`              | ESLint over the whole tree                      |
| `npm run format`            | Prettier over the whole tree                    |
| `npm test`                  | The unit suite in `tests/`                      |
| `npm run env:check`         | Report what is configured and what is missing   |
| `npm run db:migrate:deploy` | Apply the checked-in migrations                 |

## Project structure

```text
.
├── src/
│   ├── app/                    # Routes only
│   │   ├── api/                # Every server endpoint
│   │   ├── error.tsx           # Route-level error boundary
│   │   ├── global-error.tsx    # Last-resort error boundary
│   │   ├── globals.css         # The design system
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # The single-route shell
│   │   ├── privacy/            # Legal pages
│   │   └── terms/
│   ├── components/             # UI, by screen
│   │   ├── auth/               # Sign in, sign up, reset
│   │   ├── dashboard/          # Desk, Ledger, Autopilot, Settings tabs
│   │   ├── effects/            # Motion: Reveal, CountUp, GlowCard, Marquee
│   │   ├── landing/            # The marketing page
│   │   ├── legal/              # Shared legal shell
│   │   ├── onboarding/         # First-run setup
│   │   ├── originkit/          # Motion and type effects
│   │   ├── shared/             # Primitives used across screens
│   │   └── ui/                 # shadcn/ui primitives
│   ├── hooks/                  # React hooks
│   ├── lib/
│   │   ├── engine/             # Pure, client-safe
│   │   │   ├── policy.ts       # Frozen safety decision rules
│   │   │   ├── priority.ts     # Queue priority scoring
│   │   │   ├── prompts.ts      # Frozen prompts, parser, draft checks
│   │   │   ├── rules.ts        # Owner-configured automation rules
│   │   │   └── samples.ts      # The demo review inbox
│   │   ├── server/             # Server-only
│   │   │   ├── auth.ts         # Hashing, sessions, cookies
│   │   │   ├── crypto.ts       # AES-256-GCM for stored credentials
│   │   │   ├── db.ts           # The Prisma client
│   │   │   ├── env.ts          # The one place env vars are read
│   │   │   ├── google.ts       # Google Business Profile boundary
│   │   │   ├── llm.ts          # Model gateway and mock provider
│   │   │   ├── mail.ts         # Verification and reset email
│   │   │   └── workspace.ts    # Triage, lanes, recording, seeding
│   │   └── utils.ts            # Class-name helper
│   └── types/                  # Shapes shared by the API and the UI
├── tests/                      # Unit suite
├── prisma/
│   ├── schema.prisma           # The data model
│   └── migrations/             # Checked-in migration history
├── scripts/                    # Maintainer utilities
├── docs/                       # Architecture, API, design, decisions
├── public/                     # Static assets
├── demo-assets/                # The demo video
├── .github/                    # Workflows, issue and PR templates
```

Full details in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documentation

| Document                                     | What is in it                                       |
| -------------------------------------------- | --------------------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | The module map, the data flow, the dependency rules |
| [docs/API.md](docs/API.md)                   | Every endpoint, the error conventions, the limits   |
| [docs/DESIGN.md](docs/DESIGN.md)             | The design system, and what is deliberately absent  |
| [docs/decisions/](docs/decisions/)           | Architecture decision records                       |
| [CONTRIBUTING.md](CONTRIBUTING.md)           | How to contribute, and the rules                    |
| [SECURITY.md](SECURITY.md)                   | The threat model, and how to report a problem       |
| [CHANGELOG.md](CHANGELOG.md)                 | What changed, and when                              |
| [DEPLOY.md](DEPLOY.md)                       | Deploying to Vercel, and the admin settings         |
| [LEARNINGS.md](LEARNINGS.md)                 | Notes from the build                                |
| [AGENTS.md](AGENTS.md)                       | The build contract                                  |

## Deploying to Vercel

1. Sign in at https://vercel.com with GitHub.
2. Import `Wasif478484/ReviewDesk`, branch `master`.
3. The build command is `npm run build`. The install command is
   `npm install --legacy-peer-deps`.
4. Add the environment variables from [.env.example](.env.example). At
   minimum `DATABASE_URL` and `APP_SECRET`.
5. Deploy.

`npx prisma migrate deploy` sets the database up on a fresh environment.
Full details in [DEPLOY.md](DEPLOY.md).

## Privacy and safety

- Review text is sent to the configured model provider for analysis. That is
  the only outbound AI call, and the app says so in the interface.
- The Google credential is encrypted with AES-256-GCM before storage and is
  never returned to the browser. Only a masked hint is shown.
- Passwords are hashed with bcrypt. Sessions use signed httpOnly cookies.
  Verification and reset links are single-use and expire.
- Every query that touches tenant data filters on the caller's organization
  or their own user id.
- The interface never claims something was posted, sent, or reported unless
  the Google API call actually succeeded.
- The app never posts replies automatically. The owner copies by hand.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) first. The short version: run
`npm run check` before you open a pull request, and do not touch the frozen
engine without raising it first.

## License

MIT. See [LICENSE](LICENSE).
