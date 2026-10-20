# Architecture decision records

Short notes on the decisions that shaped this project. Each one records the
context, the choice, and what it costs us. New decisions get a new numbered
file; older ones are never rewritten, they are superseded.

| #                                                     | Decision                                     | Status             |
| ----------------------------------------------------- | -------------------------------------------- | ------------------ |
| [0001](0001-owner-in-the-loop.md)                     | The owner copies replies by hand             | Accepted           |
| [0002](0002-freeze-the-triage-engine.md)              | The triage engine is frozen                  | Accepted           |
| [0003](0003-postgresql-on-neon.md)                    | PostgreSQL on Neon                           | Accepted           |
| [0004](0004-raw-sql-for-templates.md)                 | Templates are read with raw SQL              | Accepted, revisit  |
| [0005](0005-rules-on-top-of-the-frozen-policy.md)     | Automation rules sit above the frozen policy | Accepted           |
| [0006](0006-derive-priority-instead-of-storing-it.md) | Priority is derived, not stored              | Superseded by 0007 |
| [0007](0007-store-priority-and-org-scope.md)          | Store the priority, scope by organization    | Accepted           |
