# 0006. Derive the priority instead of storing it

Status: Superseded by 0007
Date: 2026-10-20

## Context

The triage queue needs a priority so that holds and risk flags surface
first. The priority is a pure function of what the model already returned:
the action, the sentiment, the flags, and the star rating.

The first implementation did not add a column. It computed the priority on
the fly in the workspace route, so no schema change was needed.

## Decision

Do not add a `priority` column. Compute the priority when the workspace
payload is built, and keep the scoring in a pure module
(`src/lib/engine/priority.ts`) so it can be unit tested.

## Consequences

Good:

- No schema change, no migration, nothing to keep in sync.
- The priority is always correct for the current code, with no backfill.

Bad:

- The value cannot be queried or sorted in the database. Sorting happens in
  the interface.
- The value is not recorded, so the ledger cannot show what the priority was
  at the time a decision was made.

## Superseded

See 0007.
