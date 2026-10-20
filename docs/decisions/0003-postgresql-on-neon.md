# 0003. PostgreSQL on Neon

Status: Accepted
Date: 2026-10-19

## Context

The app needs a database for accounts, workspaces, reviews, triages, policies,
credentials, and an audit ledger. The first deployment targeted SQLite, which
is fine for a local demo and wrong for a hosted multi-user app: no
concurrent writes, no network access from a serverless function without a
connection pool, and no way to run a migration against a live database while
the app is up.

## Decision

PostgreSQL, hosted on Neon.

- The Prisma datasource is `postgresql`.
- `prisma/migrations/` holds the checked-in migration history, so a fresh
  environment is `npx prisma migrate deploy` and nothing else.
- The connection string comes from `DATABASE_URL` in the environment. It is
  never committed, and the pooled connection string is used in production so
  the serverless functions do not exhaust the connection limit.
- `organizationId` is an optional column on every tenant-scoped table, so a
  single-owner workspace works without creating an organization first.

## Consequences

Good:

- The serverless functions get a real pooled connection.
- Migrations are a checked-in artifact, reviewable in a pull request.
- Postgres is what the rest of the ecosystem assumes.

Bad:

- A local setup needs a database. Neon has a free tier, so this is a small
  tax, not a wall.
- `prisma db push` and `prisma migrate deploy` are different commands with
  different intents, and it is easy to reach for the wrong one.

## Related

- 0007, tenant scoping, is what the `organizationId` column is for.
