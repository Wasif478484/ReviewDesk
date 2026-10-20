# 0004. Templates are read with raw SQL

Status: Accepted, revisit
Date: 2026-10-20

## Context

The reply template library needs its own table. Adding a model to
`prisma/schema.prisma` and running `prisma generate` is the normal path.

In this build, the generated Prisma client did not pick up the new model:
`db.template` was `undefined` at runtime even though the table existed in
the database and `prisma generate` reported success. The cause was traced to
the client being written to `node_modules/.prisma/client/`, which an
earlier cleanup of `node_modules/@prisma/client/` had left out of sync with
the schema.

The template routes were written against raw SQL to keep the feature
shippable, and the shape mismatch between the two (the API returned the
`keywords` column as a JSON string while the UI expected an array) caused a
crash that the demo video caught.

## Decision

The template routes use `db.$queryRawUnsafe` and `db.$executeRawUnsafe`
against the `Template` table, and the model stays out of the typed client
surface for now.

- Raw SQL is used **only** for `Template`. Everything else goes through the
  typed client.
- The `keywords` shape is fixed at the API boundary: the route parses the
  stored JSON and returns an array. The UI also guards with
  `Array.isArray`, so a malformed payload cannot crash a panel.
- The build removes `node_modules/.prisma` before running `prisma generate`,
  so a cached client can never ship with stale fields.

## Consequences

Good:

- The feature works, and the crash class it exposed is now covered by the
  end-to-end suite, which asserts the payload shape.

Bad:

- Template SQL is not type checked, so the compiler will not catch a typo in
  a column name. It fails at runtime instead.
- Two ways to reach the same table is a smell.

## Revisit

When the client generation is confirmed to emit the full datamodel on a
clean tree, these routes should move to the typed API and this record should
be superseded.
