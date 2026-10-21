# Contributing to ReviewDesk

Thanks for taking the time. This document is short on purpose.

## Before you start

1. Read [AGENTS.md](AGENTS.md). It is the build contract, and it holds the
   rules that do not bend: no auto-posting, the owner copies replies by
   hand, and the triage engine is frozen.
2. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the module map and
   the dependency rules.
3. Browse [docs/decisions/](docs/decisions/) for the reasoning behind the
   choices you are about to build on. If your change contradicts one of
   them, that is a conversation, not a quiet edit.

## Setup

```bash
git clone https://github.com/Wasif478484/ReviewDesk.git
cd ReviewDesk
npm install --legacy-peer-deps
cp .env.example .env
```

Fill in `DATABASE_URL` and `APP_SECRET` in `.env`, then:

```bash
npm run env:check        # reports what is set and what is missing
npx prisma migrate deploy
npm run dev
```

Open http://localhost:3000. The workspace starts with a demo inbox of 15
sample reviews, and `REVIEWDESK_PROVIDER=mock` means no model calls and no
API key.

## The rules

These are the ones that get a pull request declined.

- **The engine is frozen.** `src/lib/engine/prompts.ts` and `policy.ts`
  define the triage contract: the four actions, the prompt text, the parser,
  and the safety rules. Call them as they are. If a change needs to touch
  them, raise it as an issue first and explain why. It is a product
  decision, not a quiet edit.
- **No auto-posting.** Approved replies are recorded in the workspace and
  copied by hand. The interface must never claim something was posted, sent,
  or reported unless the Google API call actually succeeded.
- **Escape untrusted text.** Review text and every model-produced field are
  escaped before they are rendered.
- **No secrets in the repository.** Keys come from the environment or the
  platform's secret store. `.env` is git-ignored and must stay that way.
- **No stack traces on screen.** A plain message for the user, the detail in
  the server console.
- **Live model calls cost money.** Only make them when the plan calls for
  them, and say how many.
- **Never push to `main`.** Open a pull request.

## Making a change

1. Branch from `main`.
2. Keep it focused. One concern per pull request.
3. Add or update the unit test in `tests/` if you touched `src/lib/engine`.
4. Update `docs/ARCHITECTURE.md` if a module boundary moved.
5. Add a line to `CHANGELOG.md` under **Unreleased**.
6. Run the checks.

```bash
npm run check        # typecheck, lint, and test
npm run build        # the production build
```

Or the individual commands:

```bash
npm run typecheck
npm run lint
npm run format
npm test
```

The pull request template has the full checklist. The one that matters most
is the frozen engine.

## Tests

The unit suite runs on Node's built-in test runner with native TypeScript
stripping, so there is no test framework dependency. `tests/loader.mjs` is a
small ESM resolver hook that teaches Node about the extensionless imports and
the `@/` alias.

```bash
npm test             # run once
npm run test:watch   # run on change
```

What the suite covers:

| File                   | Covers                                                                           |
| ---------------------- | -------------------------------------------------------------------------------- |
| `tests/engine.test.ts` | The frozen policy, the prompt parser, the priority scoring, the automation rules |
| `tests/llm.test.ts`    | The mock provider behaviour                                                      |

The engine tests are the specification. If a change makes one of them fail,
the change is wrong until you have raised it.

## Style

- Prettier handles formatting. Run `npm run format` before you commit.
- ESLint handles the rest. `npm run lint` must be clean.
- TypeScript is strict. No `any` without a reason, no `@ts-ignore`.
- Comments explain **why**, not **what**. If a line needs a comment to say
  what it does, the line should be rewritten.
- The design system lives in [docs/DESIGN.md](docs/DESIGN.md). Read the
  "what is deliberately absent" section before adding any visual element.

## Commit messages

```
<type>: <summary>

<why, in a sentence or two>

<what changed, if it is not obvious>
```

Types in use: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`.

## Reporting a bug

Use the bug report template. A good report says what you expected, what
happened instead, and how to reproduce it. If it is a security issue, do not
open an issue. See [SECURITY.md](SECURITY.md).

## Code of conduct

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
