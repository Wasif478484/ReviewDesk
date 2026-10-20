# Changelog

All notable changes to ReviewDesk are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [0.3.0] - 2026-10-20

### Added

- Multi-tenancy: organizations with owner, manager, responder, and viewer
  roles, a members panel, and role-scoped permissions on every read and write.
- Automation rules: owner-configured rules that can force the triage action
  or raise the queue priority. A rule never posts to Google, and a rule that
  forces an action always routes the review to the approval queue.
- Queue priority scoring: urgent for holds and risk flags, normal for
  owner-check and negative sentiment, low for a clean positive.
- Reply template library: save reusable phrases, insert them into a draft,
  copy, and delete.
- Review source filtering across Google, Yelp, Facebook, TripAdvisor, and
  imported CSV, with the source chosen at import time.
- Analytics breakdown by action, priority, and source.
- `GET /api/health` reporting database reachability, the active model
  provider, and which optional integrations are configured.
- Per-review tone switching with re-analysis, bulk record/dismiss/copy, draft
  version history with revert, and keyboard shortcuts.
- A unit test suite covering the frozen policy, the prompt parser, the
  priority scoring, and the automation rules.
- Checked-in Prisma migrations so a fresh database is one command away.
- A route-level error boundary and a global error boundary, so one failing
  panel cannot blank the desk.
- A three-minute demo video in `demo-assets/`.

### Fixed

- The datasource provider now matches the deployed database: PostgreSQL, not
  SQLite.
- The build removes the cached generated Prisma client before regenerating
  it, so a stale client cannot ship with new schema fields.
- The rules endpoint returns `keywords` as an array, matching what the UI
  expects.

### Changed

- Rewrote `docs/ARCHITECTURE.md` and `AGENTS.md` for the Next.js stack.
- Deleted 46 unused shadcn/ui components and the legacy `db/`, `website/`,
  and `devpost/` folders.
- Moved priority scoring into the pure engine so it is unit-testable.

## [0.2.0] - 2026-10-19

### Added

- The Next.js full-stack rebuild: Prisma, PostgreSQL, sessions, email
  verification, password reset, encrypted credential storage, and the Google
  Business Profile connection.

### Changed

- The app moved from a Streamlit prototype to a deployable web app.

## [0.1.0] - 2026-10-18

### Added

- The original Streamlit prototype: triage lanes, autopilot with a veto
  window, and the audit ledger.

[Unreleased]: https://github.com/Wasif478484/ReviewDesk/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/Wasif478484/ReviewDesk/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Wasif478484/ReviewDesk/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Wasif478484/ReviewDesk/releases/tag/v0.1.0
