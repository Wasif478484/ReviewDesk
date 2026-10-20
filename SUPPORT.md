# Support

## Before opening an issue

1. Check the [changelog](CHANGELOG.md) — the problem may already be fixed.
2. Check `/api/health` on your deployment. It reports the database, the
   active model provider, and whether the optional integrations are set up.
3. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) to see how the parts
   fit together.

## Common questions

**"The model call failed (Configuration file not found or invalid)"**
The live provider needs a `.z-ai-config` file with your API credentials, or
set `REVIEWDESK_PROVIDER=mock` for offline demo mode with no API key.

**"Could not create the account"**
The email may already be registered. Use "Sign in" instead, or reset the
password.

**"Connect with Google" is greyed out**
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are not set on that
deployment. The admin has to set them and register
`{origin}/api/auth/google/callback` in the Google Cloud console.

**Email verification links do not arrive**
`SMTP_HOST` is not configured. The app still works, and the one-time
verification link is shown in the interface and logged on the server.

## Where to ask

- **Bugs and features:** the GitHub issue templates.
- **Security problems:** see [SECURITY.md](SECURITY.md). Do not open a public
  issue.
- **How to contribute:** [CONTRIBUTING.md](CONTRIBUTING.md).

## Live app

https://reviewdesk-nu.vercel.app

Sign up and the workspace starts with a demo inbox of 15 sample reviews, so
you can work the desk without connecting anything.
