# ReviewDesk — Deployable Multi-User Web App

Google Business review triage + AI draft replies, with owner accounts,
encrypted credential storage and a demo-first safety model.

## Stack

- Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · DaisyUI
- Prisma ORM · PostgreSQL (Neon)
- bcrypt + JWT httpOnly sessions
- z-ai-web-dev-sdk (LLM calls, server-side only)

## Quick start

```bash
npm install --legacy-peer-deps
cp .env.example .env        # then edit DATABASE_URL and APP_SECRET
npx prisma db push          # create the PostgreSQL schema
npm run dev                 # development on :3000
```

Production build:

```bash
npm run build               # runs prisma generate && next build
npm run start               # serves .next/standalone on :3000
```

## What accounts get

1. Sign up → 3-step onboarding: business details → Google connection
   (Connect with Google, API key or pasted OAuth token — skippable)
   → tone/language preferences.
2. Every workspace starts with a simulated inbox of 15 demo reviews.
3. Triage lanes: auto (veto countdown), approval queue, recorded — plus
   report notes.
4. Autopilot is off by default; dry-run first, daily cap, veto window, undo.
5. Audit ledger records every decision with reasons.
6. Draft version history with revert.
7. Bulk actions: record/dismiss/copy multiple reviews at once.
8. Per-review tone switching (warm/formal/apologetic).
9. CSV export: reviews CSV and triage results CSV.
10. Keyboard shortcuts: A=analyze, R=record, C=copy, D=dismiss, V=revert.

## Honest-behavior contract (do not break in edits)

- The UI never claims anything was sent to Google unless the Google API call
  actually succeeded with the user's own live connection.
- Without a verified live connection, approved replies are **recorded in the
  workspace** and labelled "recorded (demo; nothing is sent)".
- Analysis sends review text to the model provider; the app says so plainly.
- Credentials are encrypted (AES-256-GCM) and never returned to the browser.

## Admin environment (production)

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — enables "Connect with Google".
  Register `{origin}/api/auth/google/callback` in Google Cloud Console.
- `SMTP_*` / `MAIL_FROM` — enables real verification + reset emails. Without
  them, one-time dev links are shown in the UI.
- `REVIEWDESK_PROVIDER` — `mock` (default, offline), `openai`, or `anthropic`.
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` — required for live model calls.

## Project layout

```
prisma/schema.prisma        # User, Business, Credential, Review, Triage,
                            # Policy, AuditEvent, AuthToken
src/app/page.tsx            # single-route shell: landing → auth → onboarding → dashboard
src/components/             # UI by screen: landing/, auth/, onboarding/,
                            # dashboard/, legal/, shared/, ui/ (shadcn)
src/lib/engine/             # pure, client-safe: prompts, policy, samples
src/lib/server/             # server-only: auth, authtoken, crypto, db, google,
                            # llm, mail, workspace
src/types/                  # types shared by UI and API
src/app/api/                # auth/*, workspace, onboarding, analyze, reviews/*,
                            # autopilot, policy, credentials/*, google/*
(see STRUCTURE.md for the dependency rules)
```

## Vercel deployment

1. Import `Wasif478484/ReviewDesk` on Vercel.
2. Set environment variables (see above).
3. Build command: `npm run build`.
4. Deploy.
