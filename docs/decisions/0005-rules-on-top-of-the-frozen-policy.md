# 0005. Automation rules sit above the frozen policy

Status: Accepted
Date: 2026-10-20

## Context

Owners want the desk to behave consistently. "Anything mentioning a doctor
goes straight to a human" is a rule an owner can write for their own
business, and it is different for a clinic than it is for a restaurant.

The obvious place to put that is inside the triage engine. But the engine is
frozen (0002), and it should stay frozen: it is the part that is shared
across every workspace and the part that is tested against a fixed
specification. Per-tenant configuration does not belong in shared, frozen
code.

## Decision

Rules live in a separate, pure module, `src/lib/engine/rules.ts`, and are
evaluated in `lib/server/workspace.ts` after the frozen policy has run.

- A rule matches on star range, keywords, and language.
- A rule can **force the action** and **set the priority**.
- A rule that forces an action always moves the review to the approval
  queue. It can never open the auto lane.
- A rule never posts anything. It changes where a review lands and how loudly
  it is flagged.
- Every match is written into the reason and into the audit trail, so the
  owner can see which rule touched which review.
- `rules.ts` is pure and unit tested, like the rest of the engine.

## Consequences

Good:

- The frozen engine stays frozen, and the tests that cover it stay valid.
- Owners can change their rules without anyone reviewing a shared file.
- Rules are explainable. The reason string says which rule matched and on
  what.

Bad:

- Two layers decide the action, and the order matters. The rule wins, and
  the reason text says so.
- A rule can contradict a judgement the model made. We consider that the
  point: the owner has the last word over their own rules.
