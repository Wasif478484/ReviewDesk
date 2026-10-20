# 0002. Freeze the triage engine

Status: Accepted
Date: 2026-10-18

## Context

The triage engine is the part of ReviewDesk that decides what happens to a
review: the four actions, the prompt that asks the model for a decision, the
parser that reads the model's answer, and the safety rules that decide
whether a reply can go out automatically.

It is also the part that is hardest to test. The model is nondeterministic,
so the only way to know the rules still hold is to check them directly,
against a fixed set of inputs.

## Decision

`src/lib/engine/prompts.ts` and `src/lib/engine/policy.ts` are **frozen**.

- Their rules, schema, and action values do not change as part of ordinary
  feature work.
- A change to either is a product decision. It gets raised as a question
  first, in the open, with the reason and the expected effect stated.
- The engine stays pure: it never imports from `lib/server`, never touches
  the database, and never reads the environment. It can be reviewed and
  tested on its own.
- The four action values (`reply`, `reply_needs_owner`, `hold`, `report`)
  are the only ones. Labels and colours live in one dict keyed by them.

## Consequences

Good:

- The safety rules are reviewable by a human, without running the app.
- `tests/engine.test.ts` can assert the behaviour directly, and the tests
  are the specification.
- A prompt change cannot slip in unnoticed and quietly weaken a rule.

Bad:

- Some features need engine changes, and they are slower.
- The engine can drift from the interface, because the interface is allowed
  to change and the engine is not. We accept that, and the drift shows up in
  the tests.

## Related

- 0005 puts automation rules _on top of_ the frozen policy rather than
  inside it, so new owner-configurable behaviour does not require touching
  the engine.
