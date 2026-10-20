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

`docs/ARCHITECTURE.md` holds the module map, the request boundaries, and the
frozen-file list. `devpost/` holds the product and learning artifacts when
they exist. Only project artifacts count — never conversation memory.

## Verification before a commit

```bash
npx tsc --noEmit
npm run lint
npm run build
npm test
git diff --check
```

`npm test` runs the unit suite in `tests/`. The engine tests in
`tests/engine.test.ts` cover the frozen policy, the prompt parser, the
priority scoring, and the automation rules.
