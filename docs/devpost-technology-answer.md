# Devpost answer: main technology requirement and the Skill Pack

ReviewDesk was built with an AI coding agent through the Devpost Learn Skill
Pack, and the agent worked the project through the pack's six stages rather
than taking one big prompt. The pack's **flipped interaction** model shaped
the whole build: the agent asked focused, adaptive questions, I made the
decisions, and the planning documents were the residue of those
conversations rather than a substitute for them.

The chain of documents in `devpost/` is the evidence, and each one cites its
parent by reference:

- `learner-profile.md` — my background and collaboration preferences, read by
  every later stage
- `scope.md` (approved) — the kernel: *the judgment before the writing*. Its
  "Explicitly Cut" list is why the product never auto-posts and never
  scrapes; those two cuts still hold in the shipped code
- `prd.md` — the core journey, written as the owner walks it. It cites
  `scope.md > The Unique Kernel` and `scope.md > The Core Loop`
- `spec.md` — the technical blueprint, tracing each step back through
  `prd.md > The Core Journey`
- `checklist.md` — the acceptance criteria the build was verified against

The backend is PostgreSQL on Neon, with Prisma and checked-in migrations. The
pack's Neon skill pointed at that path, and the Neon agent skill shaped the
decision to use Postgres rather than a hosted document store for a schema
this relational.

The kernel survived every refactor. It began as a Streamlit prototype whose
`prompts.py` / `policy.py` / `llm.py` separation the spec described; when the
app was rebuilt on Next.js, those two files stayed frozen and pure, and
everything else was rebuilt around them. The scope named the target
("15 reviews across Google, Yelp, Facebook, and TripAdvisor land in a table
sorted holds-first, with drafts editable and a CSV export") and that is
what the demo video shows.

**The one thing I would do differently:** the scope's cut list also excluded
logins and multi-user teams, and I later built them. That was a deliberate
change of plan once the proof of concept was working, but the reasoning
should have gone back into `scope.md` as a revision rather than living only
in a commit message.
