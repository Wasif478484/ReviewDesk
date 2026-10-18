# Folder structure

Where code lives and which way imports may point.

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
    shared/            Small primitives used across screens (logo, stamps, banners)
    ui/                shadcn/ui primitives. Generated; edit with care.
  lib/
    engine/            Pure logic: prompts, policy rules, sample inbox.
                       Safe to import from the browser.
    server/            Server-only: database, sessions, encryption, Google OAuth,
                       mail, LLM calls, workspace orchestration.
    utils.ts           Class-name helper
  types/
    reviewdesk.ts      Shapes shared by the API and the UI
  hooks/               React hooks (toast, mobile breakpoint)
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
