# ReviewDesk — deployable multi-user web app

Google Business review triage + AI draft replies, with owner accounts,
encrypted credential storage and a demo-first safety model.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma (SQLite) ·
bcrypt + JWT httpOnly sessions · z-ai-web-dev-sdk (LLM calls, server-side only).

## Quick start

```bash
bun install                 # or npm install
cp .env.example .env        # then edit:
#   DATABASE_URL=file:../db/custom.db
#   APP_SECRET=$(openssl rand -base64 32)
bun run db:push             # create the SQLite schema
bun run dev                 # development on :3000
```

Production build:

```bash
bun run build
bun run start               # serves .next/standalone on :3000
```

## What accounts get

1. Sign up → 3-step onboarding: business details → Google connection
   (Connect with Google, API key or pasted OAuth token — skippable) → tone/language prefs.
2. Every workspace starts with a simulated inbox of 15 demo reviews.
3. Triage lanes: auto (veto countdown), approval queue, recorded — plus report notes.
4. Autopilot is off by default; dry-run first, daily cap, veto window, undo.
5. Audit ledger records every decision with reasons.

## Honest-behavior contract (do not break in edits)

- The UI never claims anything was sent to Google unless the Google API call
  actually succeeded with the user's own live connection.
- Without a verified live connection, approved replies are **recorded in the
  workspace** and labelled "recorded (demo; nothing is sent)".
- Analysis sends review text to the model provider; the app says so plainly.
- Credentials are encrypted (AES-256-GCM) and never returned to the browser.

## Troubleshooting

**"The model call failed (Configuration file not found or invalid. Please create
.z-ai-config …). Review by hand."**

The LLM triage calls go through `z-ai-web-dev-sdk`, which reads its credentials
from a `.z-ai-config` file looked up in the project directory, the home
directory, or `/etc`. If none is present/valid, analyze falls back to the
manual lane — nothing crashes, the review is flagged for a hand-written reply,
and you can simply click **Analyze** again once the config is in place.

- On the hosted preview this config is provisioned by the platform; a transient
  failure like this is temporary and retrying works.
- On your own server, create the config file at one of the lookup paths
  (project root, `~/.z-ai-config`, or `/etc/.z-ai-config`) with your Z.ai
  credentials, then restart the app and re-run the analysis.
- The fallback triage stored during the outage is replaced the next time you
  analyze the same review.

## Admin environment (production)

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — enables "Connect with Google".
  Register `{origin}/api/auth/google/callback` in Google Cloud Console with
  the `business.manage` scope.
- `SMTP_*` / `MAIL_FROM` — enables real verification + reset emails. Without
  them, one-time dev links are shown in the UI and logged server-side.

## Project layout

```
prisma/schema.prisma        # User, Business, Credential, Review, Triage, Policy, AuditEvent, AuthToken
src/app/page.tsx            # single-route shell: landing → auth → onboarding → dashboard
src/components/             # UI by screen: landing/, auth/, onboarding/, dashboard/, legal/, shared/, ui/ (shadcn)
src/lib/engine/             # pure, client-safe: prompts, policy, samples (no DB, no secrets)
src/lib/server/             # server-only: auth, authtoken, crypto, db, google, llm, mail, workspace
src/types/                  # types shared by UI and API
src/app/api/                # auth/*, workspace, onboarding, analyze, reviews/*, autopilot, policy, credentials/*, google/*
(see STRUCTURE.md for the dependency rules)
```
