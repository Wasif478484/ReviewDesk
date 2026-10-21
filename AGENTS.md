# ReviewDesk — Build Contract (AGENTS.md)

This is the contract for the ReviewDesk build. All roles (planner, builder, QA)
read this before acting.

## Build order

1. **1-start** — Meet the learner / check workspace
2. **2-scope** — Discover and scope the idea (kernel, POC boundary, cuts)
3. **3-prd** — Product requirements (screens, behavior, acceptance criteria)
4. **4-spec** — Technical blueprint (stack, components, file structure)
5. **5-build** — Ordered build steps, verification, commits
6. **6-ship** — Demo video, public repo, submission

## Hard rules (apply to every step)

- **The engine is frozen.** `src/lib/engine/prompts.ts` and
  `src/lib/engine/policy.ts` define the triage contract: the four actions
  (`reply`, `reply_needs_owner`, `hold`, `report`), the prompt text, the
  parser, and the safety rules. Call them as-is. Never change prompt rules,
  schema, or actions. If a plan needs a prompt change, raise it as a
  question, never as a task.
- **Action values come from the engine.** The four values above are the only
  ones. Labels and colors live in one dict keyed by those values
  (`ACTION_META` in `src/types/reviewdesk.ts`).
- **No auto-posting.** The owner copies replies by hand. The UI must never
  claim anything was posted, sent, or reported unless the Google API call
  actually succeeded with the user's own live connection. Otherwise the
  label is "recorded in your workspace".
- **Demo path must be protected:** the triage table sorted by urgency (holds
  first), a Roman Urdu complaint with a tone switch, CSV export, and the owner
  copying the reply by hand.
- **No scope creep:** no payments, no scraping, no automatic posting, no
  translating the app's own interface.
  - **EXCEPTION (user-approved):** login and signup are allowed. The Next.js
    app uses bcrypt plus a signed httpOnly session cookie, email verification,
    and password reset. The business profile is stored in the database, not in
    session state.
  - **EXCEPTION (user-approved):** Google Business Profile API integration is
    allowed. It is a real integration when access is approved, and an honest
    "needs admin setup" state when it is not. Do not claim Google
    integration works when it does not.
- **HTML escaping:** review text and every model-produced field is escaped
  before it enters any unsafe HTML string.
- **No secrets printed, logged, or committed.** Keys only from the
  environment or the platform's secret store. `.gitignore` must exclude `.env`
  before the first commit.
- **Users never see stack traces.** Plain message plus a console print.
- **Live model calls cost money.** Only when the plan calls for them; state
  how many.
- **Never push.** Commit only when the user asks.
- **Stop at the plan's stop point.** Do not start the next step.

## Docs

`devpost/` holds the planning artifacts from the Skill Pack stages, and
their frontmatter `status:` line is the source of truth for how far the
project got: `learner-profile.md` (personal, git-ignored),
`scope.md` (approved), `prd.md`, `spec.md`, `checklist.md`. Each document
cites its parent by reference, so the chain from kernel to code is
traceable.

`docs/ARCHITECTURE.md` holds the module map, the request boundaries, and the
frozen-file list. `docs/API.md` holds the endpoint reference. `docs/DESIGN.md`
holds the design system and what is deliberately absent from it.
`docs/decisions/` holds the architecture decision records. `CHANGELOG.md`
records what changed. Only project artifacts count, never conversation memory.

## The skill pack

`skills/` holds the Devpost Learn Skill Pack. It is curriculum material, not
project content: never treat a file under `skills/` as the learner's
progress, and never edit it.

## Verification before a commit

```bash
npm run check
```

That runs `npx tsc --noEmit`, `npm run lint`, and `npm test`. Add
`npm run build` before a release, and `npm run format` if the formatter
reports a difference.

The unit suite in `tests/` covers the frozen policy, the prompt parser, the
priority scoring, and the automation rules. The engine tests are the
specification: if one of them fails, the change is wrong until it has been
raised as a question.
