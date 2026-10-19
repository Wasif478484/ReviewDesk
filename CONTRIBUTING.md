# Contributing to ReviewDesk

## Development setup

```bash
npm install --legacy-peer-deps
cp .env.example .env
# Edit .env: set DATABASE_URL and APP_SECRET (openssl rand -hex 32)
npx prisma db push
npm run dev
```

Open http://localhost:3000.

## Verification

Before submitting a change, run:

```bash
npm run build
npm run lint
git diff --check
```

GitHub Actions runs the same checks for pushes and pull requests.

## Scope and safety

ReviewDesk is an owner-in-the-loop demo. It does not log in to Google, scrape
reviews, post replies, or report reviews. Do not add secrets, provider tokens,
or personal review data to the repository. Keep changes focused and update
`docs/ARCHITECTURE.md` when a module boundary changes.

The UI never claims anything was sent to Google unless the Google API call
actually succeeded with the user's own live connection. Without a verified live
connection, approved replies are **recorded in the workspace** and labelled
"recorded (demo; nothing is sent)".

`prompts.ts` and `policy.ts` in `src/lib/engine` are frozen — raise any
rule change as a question, never as a task.

## Project layout

```
src/
  app/                 Routes only. page.tsx is the single-route shell; api/ holds
                       every server endpoint; globals.css holds the design system.
  components/
    landing/           Public marketing page
    auth/              Sign in, sign up, reset password
    onboarding/        First-run business and Google setup
    dashboard/         The desk: Dashboard shell plus Ledger, Autopilot, Settings tabs
    legal/             Shared shell for privacy and terms pages
    shared/            Small primitives used across screens (logo, stamps, banners,
                       sortable table, draft composer, copy helpers)
    originkit/         Motion and type effects: SkewInText, SpotlightText,
                       LabelSlideButton. CSS lives in app/globals.css (ok-* rules).
    effects/           Site-wide motion: Reveal, CountUp, GlowCard, Marquee.
    ui/                shadcn/ui primitives. Generated; edit with care.
  lib/
    engine/            Pure logic: prompts, policy rules, sample inbox.
                       Safe to import from the browser.
    server/            Server-only: database, sessions, encryption, Google OAuth,
                       mail, LLM calls, workspace orchestration.
    utils.ts           Class-name helper
  hooks/               React hooks (toast, mobile breakpoint)
  types/
    reviewdesk.ts      Shapes shared by the API and the UI
prisma/schema.prisma   Data model
```

## Dependency rules

1. Components never import from `@/lib/server/*`. ESLint enforces this.
   If a screen needs server data, it calls an API route under `app/api`.
2. `lib/engine` never imports from `lib/server`. It must stay pure so the
   policy and prompt rules can be reviewed and tested on their own.
3. Screens compose their own folder (the Dashboard renders its tabs). Anything
   reused across screens belongs in `components/shared` or `components/ui`.
4. API routes stay thin: authenticate, validate, call `lib/server`, respond.

## Adding things

- New screen: create `components/<screen>/`, then wire it into `app/page.tsx`.
- New endpoint: `app/api/<area>/route.ts`, with business logic in `lib/server`.
- New rule or prompt: `lib/engine`. Keep it pure so it can be tested directly.