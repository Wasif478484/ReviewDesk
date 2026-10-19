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
                       and TemplateLibrary (saved reply snippets)
    legal/             Shared shell for privacy and terms pages
    shared/            Small primitives used across screens (logo, stamps, banners,
                       sortable table, reply composer, priority badge)
    originkit/         Motion and type effects: SkewInText, SpotlightText,
                       LabelSlideButton. Local copies; the CSS for them lives in
                       app/globals.css (the ok-* rules).
    effects/           Site-wide motion: Reveal (scroll reveal), CountUp (numbers),
                       GlowCard (pointer glow), Marquee. CSS is the "modern layer"
                       at the end of app/globals.css.
    ui/                shadcn/ui primitives. Generated; edit with care.
  lib/
    engine/            Pure logic: prompts, policy rules, sample inbox.
                       Safe to import from the browser.
    server/            Server-only: database, sessions, encryption, Google OAuth,
                       mail, LLM calls, workspace orchestration.
                       computePriority() lives in workspace.ts: it derives the
                       queue priority from the model's output and never sets a
                       lane on its own.
    utils.ts           Class-name helper
  types/
    reviewdesk.ts      Shapes shared by the API and the UI
  hooks/               React hooks (toast, mobile breakpoint)
prisma/schema.prisma   Data model
```

## Database notes

- The datasource is **PostgreSQL** (Neon in production). `npx prisma db push`
  syncs the schema.
- `Template` is read and written with `db.$queryRawUnsafe` /
  `db.$executeRawUnsafe` in `src/app/api/templates/*`. The Prisma client
  generated in this build does not expose that model, but the table exists and
  is in sync with `schema.prisma`. When the client is regenerated with the
  model, those routes can switch to the typed API.
- Raw SQL is only used for `Template`. Everything else goes through the typed
  Prisma client.

## Design layer

- daisyUI 5 supplies components (btn, card, badge, tabs, input, alert, loading).
  The theme is defined once in `app/globals.css` as the `reviewdesk` theme, and
  `<html data-theme="reviewdesk">` in layout.tsx selects it.
- Use daisyUI classes for anything daisyUI already covers. The `rd-*` classes
  in globals.css are for ReviewDesk-specific pieces: review stamps, ledger rows,
  mono kickers, and the product-window frame.
- Originkit effects are for entry moments only (page and step headings, primary
  actions). They respect reduced motion and keep the text available to screen
  readers.

## Motion rules

- Server HTML is always the final, readable page. Effects hide or animate
  content only after mount, and only for blocks below the fold.
- Every effect has a reduced-motion path (end of globals.css). Add new
  animations to that block.
- Decorative layers (aurora, halo, progress bar) are aria-hidden.
- Keep gradient text on colors that hold 4.5:1 contrast on white.

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
