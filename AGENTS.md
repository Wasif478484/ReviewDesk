# ReviewDesk — Build Contract (AGENTS.md)

This is the contract for the ReviewDesk build. All three roles (planner, builder, QA) read this before acting.

## Build order

1. **1-start** — Meet the learner / check workspace
2. **2-scope** — Discover and scope the idea (kernel, POC boundary, cuts)
3. **3-prd** — Product requirements (screens, behavior, acceptance criteria)
4. **4-spec** — Technical blueprint (stack, components, file structure)
5. **5-build** — Ordered build steps, verification, commits
6. **6-ship** — Demo video, public repo, submission

## Hard rules (apply to every step)

- **prompts.py is frozen.** Call its functions as-is. Never change prompt rules, schema, or actions. If a plan needs a prompt change, raise it as a question, never as a task.
- **Action values come from prompts.ACTIONS:** reply, reply_needs_owner, hold, report. Labels and colors live in one dict keyed by those values.
- **Demo path must be protected:** triage table sorted by urgency (holds first), a Roman Urdu complaint with a tone switch, CSV export, owner copies reply by hand.
- **No scope creep:** no logins, database, payments, scraping, Google API, auto-posting, translating the app's own interface.
- **HTML escaping:** review text and every model-produced field escaped with html.escape before entering any unsafe_allow_html string.
- **No secrets printed, logged, or committed.** Keys only from environment. `.gitignore` must exclude `.env` before first commit.
- **Users never see stack traces.** Plain message + console print.
- **UI never claims anything was posted/sent/reported.** Owner copies by hand.
- **Live model calls cost money.** Only when the plan calls for them; state how many.
- **Never push.** Commit only when the user asks.
- **Stop at the plan's stop point.** Do not start the next step.

## Docs (devpost/)

`learner-profile.md`, `scope.md`, `prd.md`, `spec.md`, `checklist.md` each carry `status: draft | approved` in frontmatter. Only project artifacts count — never conversation memory.
