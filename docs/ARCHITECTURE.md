# ReviewDesk architecture

ReviewDesk is a Next.js full-stack web app with a pure-TypeScript workflow
core. The owner remains in control: approved replies are recorded in the
workspace and copied by hand, never posted automatically.

## Repository map

```text
.
├── prisma/schema.prisma     # Data model (PostgreSQL)
├── src/app/                 # Routes only
│   ├── page.tsx             # Single-route shell: landing → auth → onboarding → dashboard
│   ├── layout.tsx           # Root layout, fonts, theme
│   ├── globals.css          # Design system (daisyUI theme + rd-* utilities)
│   ├── privacy/, terms/      # Legal pages
│   └── api/                 # Every server endpoint
│       ├── analyze/         # POST, triage one or many reviews
│       ├── auth/            # signup, login, logout, verify, reset, google/*
│       ├── autopilot/       # POST, run one autopilot cycle
│       ├── business/        # PUT, business profile and desk preferences
│       ├── credentials/     # Google connection (GET/POST/DELETE) + test
│       ├── google/locations # Find locations on the connected Google account
│       ├── health/          # GET, liveness and readiness
│       ├── onboarding/      # POST, first-run setup
│       ├── organizations/    # Organizations, members, automation rules
│       ├── policy/          # GET/PUT, autopilot policy
│       ├── reviews/         # Import CSV, actions, fetch from Google
│       ├── templates/       # Reply template library
│       └── workspace/       # GET, the whole boot payload
├── src/components/          # UI by screen
│   ├── landing/             # Public marketing page
│   ├── auth/                # Sign in, sign up, reset password
│   ├── onboarding/          # First-run business and Google setup
│   ├── dashboard/           # Desk shell + Ledger, Autopilot, Settings tabs
│   │                        # + TemplateLibrary and TeamPanel
│   ├── legal/               # Shared shell for privacy and terms
│   ├── shared/              # Primitives used across screens
│   ├── originkit/           # Motion and type effects
│   └── effects/             # Site-wide motion: Reveal, CountUp, GlowCard, Marquee
├── src/hooks/               # React hooks
├── src/lib/
│   ├── engine/              # Pure, client-safe
│   │   ├── prompts.ts       # Frozen triage prompts, parser, draft checks
│   │   ├── policy.ts        # Frozen safety decision rules
│   │   ├── priority.ts      # Queue priority scoring
│   │   ├── rules.ts         # Owner-configured automation rules
│   │   └── samples.ts       # The demo review inbox
│   ├── server/              # Server-only
│   │   ├── db.ts            # Prisma client singleton
│   │   ├── env.ts           # The one place env vars are read and validated
│   │   ├── auth.ts          # bcrypt hashing, JWT httpOnly session cookie
│   │   ├── authtoken.ts     # Verification and reset tokens
│   │   ├── crypto.ts        # AES-256-GCM for stored credentials
│   │   ├── google.ts        # Google Business Profile API boundary
│   │   ├── llm.ts           # Model gateway and mock provider
│   │   ├── mail.ts          # Verification and reset email
│   │   └── workspace.ts     # Triage, lanes, recording, seeding
│   └── utils.ts             # Class-name helper
├── src/types/               # Shapes shared by the API and the UI
├── scripts/                 # Maintainer utilities (env:check)
├── tests/                   # Unit suite, plus the ESM resolver hook
└── docs/                    # Architecture, API, design, decisions
```

## Data flow

```text
review text
   → buildSystemPrompt / buildUserMessage   (lib/engine/prompts.ts, frozen)
   → callModel                               (lib/server/llm.ts)
   → safeParse                               (lib/engine/prompts.ts, frozen)
   → decide                                  (lib/engine/policy.ts, frozen)
   → applyRules                              (lib/engine/rules.ts, owner rules)
   → lane + priority                         (lib/server/workspace.ts)
   → triage row + audit event                (Prisma)
   → owner edits, approves, copies by hand
```

## Frozen files

`src/lib/engine/prompts.ts` and `src/lib/engine/policy.ts` define the triage
contract: the four actions, the prompt text, the parser, and the safety rules.
They are not changed as part of ordinary feature work. A change to either one
is a product decision, raised as a question first.

The automation rules in `src/lib/engine/rules.ts` sit **on top of** the frozen
policy. A rule can force the action or raise the priority for a review that
matches its conditions. A rule never posts anything, and a rule that forces an
action always sends the review to the approval queue instead of the auto lane.

## Request boundaries

1. Components never import from `@/lib/server/*`. ESLint enforces this. A
   screen that needs server data calls an API route under `app/api`.
2. `lib/engine` never imports from `lib/server`. It stays pure so the policy,
   prompt, and rule logic can be reviewed and tested on their own.
3. API routes stay thin: authenticate, validate, call `lib/server`, respond.
4. `lib/engine/rules.ts` is pure and unit-tested; `lib/server/workspace.ts` is
   the only place that reads rules from the database.
5. Environment variables are read in `lib/server/env.ts` and nowhere else.
   Values are validated once, at the boundary, so a missing variable fails
   with a clear message instead of surfacing as `undefined` three layers
   deeper. `process.env` appears in `env.ts` and nowhere else, apart from
   `NODE_ENV` checks that are a build-time concern.

## Design layer

- daisyUI 5 supplies components (btn, card, badge, tabs, input, alert, loading).
  The theme is defined once in `app/globals.css` as the `reviewdesk` theme, and
  `<html data-theme="reviewdesk">` in layout.tsx selects it.
- Use daisyUI classes for anything daisyUI already covers. The `rd-*` classes
  are for ReviewDesk-specific pieces: review stamps, ledger rows, mono kickers,
  the density-controlled table, and the product-window frame.
- Originkit effects are for entry moments only (page and step headings, primary
  actions). They respect reduced motion and keep the text available to screen
  readers.

## Motion rules

- Server HTML is always the final, readable page. Effects hide or animate
  content only after mount, and only for blocks below the fold.
- Every effect has a reduced-motion path (end of globals.css). Add new
  animations to that block.
- Decorative layers (aurora, halo, progress bar) are aria-hidden.

## Database

- The datasource is **PostgreSQL** (Neon in production).
- `npx prisma db push` syncs the schema. `prisma/migrations/` holds the
  checked-in migration history for fresh deployments.
- `Template` is read and written with the typed Prisma client.
- `organizationId` is optional on every tenant-scoped table so a single-owner
  workspace keeps working without an organization.

## Tenant isolation

Reviews, triages, policies, templates, and audit events carry an
`organizationId`. Every query that touches tenant data filters on the
caller's organization or their own `userId`. The organization API checks the
caller's membership and role before every read and write.
