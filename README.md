# ReviewDesk

> Know when not to reply.

[![CI](https://github.com/Wasif478484/ReviewDesk/actions/workflows/ci.yml/badge.svg)](https://github.com/Wasif478484/ReviewDesk/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/built%20with-Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)

ReviewDesk is an owner-in-the-loop review triage assistant for local businesses.
It analyzes a customer review and recommends one of four actions:

- **Reply** — a low-risk public response can be drafted.
- **Check facts** — an owner should verify details before replying.
- **Hold** — the review needs careful handling before any public response.
- **Report** — the content may be spam, abuse, or an inappropriate review.

ReviewDesk drafts text for the owner to edit and copy by hand. It does **not**
log in to Google, post replies, report reviews, scrape websites, or send
anything automatically.

## Features

- Single-review and batch analysis.
- English, Urdu script, Roman Urdu, French, Arabic, and other language support.
- Tone switching and owner-language translation checks.
- Draft safety checks for unapproved offers, phone numbers, stock phrases, and
  oversized responses.
- Safety policy that keeps holds, reports, negative sentiment, risk flags, and
  untrusted languages out of the automatic lane.
- Simulated review source using the 15-row [`samples.csv`](./samples.csv) demo.
- Session-persistent demo workflow with veto windows, approval queue, audit CSV,
  idempotency checks, and owner-controlled retry.
- Mock provider mode for offline demos without an API key.

## Quick start

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL database (or SQLite for local dev)

### Setup

```bash
git clone https://github.com/Wasif478484/ReviewDesk.git
cd ReviewDesk
npm install --legacy-peer-deps
cp .env.example .env
# Edit .env: set DATABASE_URL and APP_SECRET (openssl rand -hex 32)
npx prisma db push
npm run dev
```

Open <http://localhost:3000>.

### Mock mode (no API key)

Set `REVIEWDESK_PROVIDER=mock` in `.env` to run with canned responses.
No API key needed.

## Deploy to Vercel (recommended)

The repository is ready to deploy as a Vercel app:

1. Sign in at <https://vercel.com/> with GitHub.
2. Import `Wasif478484/ReviewDesk`, branch `master`.
3. Vercel auto-detects Next.js. Set the build command to `npm run build`.
4. In **Environment Variables**, add:
   - `DATABASE_URL` — your PostgreSQL connection string (e.g., Neon)
   - `APP_SECRET` — a 64-hex-character secret (`openssl rand -hex 32`)
   - `REVIEWDESK_PROVIDER` — `openai` (or `anthropic`)
   - `OPENAI_API_KEY` — your OpenAI API key
   - `OPENAI_MODEL` — `gpt-4o-mini`
5. Deploy the app and open the generated public URL.

For production database, use Neon PostgreSQL:
- Create a Neon project at <https://neon.tech>
- Copy the connection string
- Set `DATABASE_URL` in Vercel environment variables
- Run `npx prisma migrate deploy` on first deploy

Secrets are read from Vercel's encrypted environment variables. Never put
the API key in Git, `.env` files committed to the repository, screenshots,
or logs. Live calls use OpenAI and may incur costs; the app remains
owner-in-the-loop and never posts replies automatically.

## Using a live model provider

Copy [`.env.example`](./.env.example) to `.env`, then configure one provider.
The `.env` file is ignored by Git and must never be committed.

```powershell
Copy-Item .env.example .env
```

Supported providers:

| Provider | Environment variable | Default model |
| --- | --- | --- |
| `mock` | None | Canned offline responses |
| `anthropic` | `ANTHROPIC_API_KEY` | `claude-3-haiku-20240307` |
| `openai` | `OPENAI_API_KEY` | `gpt-4o-mini` |

Set the provider with `REVIEWDESK_PROVIDER`. Live model calls cost money and
review text is sent to the selected provider. Use mock mode for demos and tests.

### Optional Qwen sentiment signal

The cloned Hugging Face Space can be used as an advisory sentiment signal; it
does not replace ReviewDesk triage or safety policy. Enable it only when the
Space is running and reachable:

```toml
REVIEWDESK_SENTIMENT_PROVIDER = "qwen"
REVIEWDESK_SENTIMENT_SPACE = "Hariharasudhan07/qwen3-0.6b-sentiment-classification"
HF_TOKEN = "only-if-the-model-repository-is-private"
```

The integration uses `gradio_client` and calls the Space's
`/classify_review` endpoint. If it is unavailable, the primary ReviewDesk
analysis remains visible and the app shows an explicit warning. The Qwen
signal is advisory; ReviewDesk's action decision and owner approval remain
authoritative.

## How the workflow works

1. The owner enters a review and business profile.
2. `reviewdesk.prompts` builds a constrained model request.
3. `reviewdesk.llm` calls the configured provider, with one retry and a bounded
   local cache.
4. The response is parsed and validated. Invalid output falls back to owner
   review.
5. `reviewdesk.policy` applies the frozen safety rules.
6. The owner edits, copies, and manually posts any public reply.

The Autopilot tab is a simulated, opt-in workflow for demonstrating veto windows
and approval handling. It records local demo outcomes only; it never sends a
reply to Google.

## Repository structure

```text
.
├── app.py                    # Stable Streamlit launcher
├── src/reviewdesk/           # Installable application package
│   ├── app.py                # Streamlit screens and session state
│   ├── autopilot.py          # Plain-Python workflow orchestration
│   ├── domain.py             # Typed workflow and audit records
│   ├── llm.py                # Provider gateway and cache
│   ├── policy.py              # Frozen safety rules
│   ├── prompts.py             # Frozen prompts, parser, and draft checks
│   ├── sources.py             # Mock source and provider boundary
│   └── ui.py                  # Escaped rendering helpers
├── tests/                    # Regression tests
├── scripts/                  # Maintainer utilities
├── docs/                     # Architecture documentation
├── website/                  # Static landing page
├── devpost/                  # Product and learning artifacts
├── .github/workflows/        # CI checks
├── pyproject.toml            # Package metadata
└── requirements.txt          # Runtime dependencies
```

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for module boundaries and
[`CONTRIBUTING.md`](./CONTRIBUTING.md) for development rules.

## Verification

Run the same checks used by CI:

```bash
npm run build
npm run lint
npm test
git diff --check
```

Expected results:

- Build: **success** (all routes compiled)
- Lint: **no errors**
- Tests: **11 passed**
- Whitespace: **clean**

GitHub Actions runs these checks on pushes and pull requests.

## Privacy and safety

- No accounts or database are required.
- Reviews remain in the Streamlit session unless sent to the selected model
  provider for analysis.
- Local model results are cached temporarily; configure
  `REVIEWDESK_CACHE_TTL_SECONDS` and `REVIEWDESK_CACHE_MAX_ENTRIES`.
- The sidebar provides a control to clear the local model cache.
- No secrets, personal review data, cache files, or bytecode belong in Git.
- User and model-produced text is HTML-escaped before custom rendering.

## Project scope

### In scope

- Review triage.
- Safe draft generation.
- Owner review and manual copy workflow.
- Mock provider and simulated source.
- Audit and export for the local demo.

### Deferred

- Google Business Profile API integration.
- Authentication and multi-user teams.
- Durable database storage.
- Background workers and scheduled processing.
- Payments, scraping, and automatic posting.

## Contributing

Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before changing the code. Keep
[`src/reviewdesk/prompts.py`](./src/reviewdesk/prompts.py) and
[`src/reviewdesk/policy.py`](./src/reviewdesk/policy.py) frozen unless an
explicit product decision changes their contract.

## License

No license has been selected for this repository yet. Do not reuse or
redistribute the project until a license is added.
