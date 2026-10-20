# 0007. Store the priority and scope by organization

Status: Accepted
Date: 2026-10-20

## Context

Two problems showed up while shipping multi-tenancy.

**The priority.** The derived priority (0006) could not be sorted in the
database, and the ledger could not show what the priority was when a
decision was made. More importantly, the derived value was the wrong shape
for a column: it is a function of the action, the sentiment, the flags, and
the stars, and storing it means the column can disagree with those.

**Tenant scope.** Organizations, members, and rules need to live somewhere,
and every tenant-scoped row needs to point at its organization. Without
that, "multi-tenant" is a label rather than a boundary.

## Decision

- `Triage.priority` is a real column: `urgent`, `normal`, or `low`.
- `computePriority()` in `src/lib/engine/priority.ts` is the single place
  the value is decided, and it is unit tested. The column stores what the
  function returned, so the two cannot drift.
- `organizationId` is an optional column on `User`, `Business`, `Review`,
  `Triage`, `Policy`, and `AuditEvent`.
- Every query that touches tenant data filters on the caller's organization
  or on their own `userId`.
- The organization API checks the caller's membership and role before every
  read and write.

## Consequences

Good:

- The priority can be sorted and filtered in the database.
- The ledger records the priority as it was at the time.
- The tenant boundary is a column, not a convention.

Bad:

- The priority column can be written directly by anything that touches the
  database. `computePriority()` is the only sanctioned writer, and the
  tests cover it.
- Optional `organizationId` means a query that forgets the filter can still
  return cross-tenant rows. The optional column is what keeps single-owner
  workspaces working, so the filter has to be applied by hand. This is the
  sharpest edge in the codebase and the tests around it are the ones that
  matter.

## Related

- 0003, the Postgres decision, is what made the extra column cheap.
- 0004 explains why one route uses raw SQL while the rest use the typed
  client.
