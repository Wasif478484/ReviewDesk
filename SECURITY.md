# Security Policy

## Supported versions

| Version       | Supported |
| ------------- | --------- |
| `master`      | yes       |
| older commits | no        |

## Reporting a vulnerability

Please do **not** open a public issue for a security problem.

Use GitHub's private vulnerability reporting on this repository
(**Security** → **Report a vulnerability**), or email the maintainer. Include:

- what the issue is and which part of the app it affects
- steps to reproduce it
- the impact you believe it has
- any suggested fix

You should get an acknowledgement within 72 hours and a status update within
seven days.

## Threat model

ReviewDesk holds two kinds of sensitive data:

1. **Owner credentials** — Google Business Profile tokens and API keys. These
   are encrypted with AES-256-GCM before storage, keyed by `APP_SECRET`, and
   are never returned to the browser. A masked hint is shown instead.
2. **Owner accounts** — passwords are hashed with bcrypt, sessions are signed
   httpOnly cookies, and verification and reset tokens are single-use and
   expire.

Review text and model output are sent to the configured model provider for
analysis. That is the only outbound AI call, and the app states it in the
interface.

## Design rules that must not be broken

- **No auto-posting.** Approved replies are recorded in the workspace and
  copied by hand. The interface must never claim something was posted, sent,
  or reported unless the Google API call actually succeeded.
- **No scraping.** Review data comes from the owner's own Google connection
  or from a manual import.
- **Secrets never reach the client.** `.env` is git-ignored, and secrets are
  read from the environment or the platform's secret store only.
- **Untrusted text is escaped.** Review text and every model-produced field
  are escaped before they are rendered.
- **The engine is frozen.** `src/lib/engine/prompts.ts` and `policy.ts`
  define the triage contract. Changes to them are a product decision, raised
  as a question first, not a quiet edit.
- **Tenant isolation.** Every query that touches tenant data filters on the
  caller's organization or their own user id.

## Reporting a non-security bug

Open a bug report using the issue template. Please include the commit you saw
it on and how to reproduce it.
