# ReviewDesk

ReviewDesk is a web app where a local business owner pastes Google reviews and gets back a decision for each one: **reply**, **check facts first**, **hold**, or **report**. When a public reply makes sense, the app returns an editable draft the owner can copy into Google by hand.

It never posts or reports anything itself — the owner stays in control.

## What it does

- **Triage before writing:** decides whether a public reply is safe, whether facts need checking first, whether to hold, or whether to report.
- **Multilingual:** reviews can arrive in any language. Drafts are written in the reviewer's language (or `auto` to match), with translations into the owner's language so the owner can verify before posting.
- **Guardrails:** drafts mention one specific detail, make no promises beyond what the owner allowed, never name staff, and never use stock phrases. A draft checker flags unapproved offers, invented phone numbers, and stock phrases.
- **Single review & batch modes:** analyze one review at a time, or paste/upload many reviews and get an urgency-sorted table (holds first, then check-facts, then reports, then replies).
- **Sample data:** one-click load of 15 demo reviews in English, Urdu script, and Roman Urdu, including risky and spam cases.

## Files

| File | Purpose |
|------|---------|
| `app.py` | Stable Streamlit entry point |
| `src/reviewdesk/` | Packaged application code |
| `src/reviewdesk/prompts.py` | System prompt, parser, draft checker, test cases |
| `src/reviewdesk/llm.py` | Provider gateway and sample-result cache |
| `src/reviewdesk/domain.py` | Typed review, triage, audit, and workflow records |
| `tests/` | Regression tests for idempotency, dry-run, and failed-action handling |
| `samples.csv` | The 15 demo reviews (columns: stars, language, text, expected_action) |
| `requirements.txt` | Python dependencies |
| `README.md` | This file |
| `LEARNINGS.md` | Surprises found during the build; feeds "What we learned" below |
| `devpost/` | Planning documents: `scope.md`, `prd.md`, `spec.md`, `checklist.md` |
| `skills/` | Devpost Learn hackathon curriculum (not project code) |
| `website/` | Static marketing page (`index.html`, `styles.css`, `app.js`) |
| `docs/` | Architecture and contributor documentation |
| `.github/workflows/` | Continuous integration checks |

## Setup

```bash
# 1. Create a virtual environment (recommended)
python -m venv .venv
# Windows:
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt
pip install -e .

# 3. Set your model API key (one of)
# Copy .env.example to .env and fill it in, OR set the variable directly:
# Anthropic (default, matches prompts.py):
setx ANTHROPIC_API_KEY "sk-ant-..."      # Windows CMD
$env:ANTHROPIC_API_KEY="sk-ant-..."      # PowerShell
export ANTHROPIC_API_KEY="sk-ant-..."    # macOS/Linux

# OpenAI (alternative):
setx OPENAI_API_KEY "sk-..."

# (No platform setting needed; ReviewDesk handles Google reviews)

# 4. Run the app
python -m streamlit run app.py
```

### Demo without an API key

Set `REVIEWDESK_PROVIDER=mock` before running:

```bash
setx REVIEWDESK_PROVIDER mock   # Windows CMD
$env:REVIEWDESK_PROVIDER="mock" # PowerShell
export REVIEWDESK_PROVIDER=mock # macOS/Linux
streamlit run app.py
```

Mock mode returns canned results so you can explore the UI without an API key.

## How it works

For each review:

1. The app builds a user message from the business profile, the review, and language/tone settings.
2. It sends that plus the system prompt to the model via `llm.call_model()` (one retry on failure).
3. The JSON output is parsed and validated (`safe_parse` falls back to "owner must review" if unreadable).
4. The draft checker runs on the draft and flags rule breaks (unapproved offers, invented phone numbers, stock phrases).
5. The result card is shown. The owner edits the draft, copies it, and posts it manually in Google.

Reviews live only in the browser session. There are no accounts and no database. **Review text is sent to the model provider** — do not paste sensitive personal data.

## Provider selection

Set `REVIEWDESK_PROVIDER`:
- `anthropic` (default): uses `ANTHROPIC_API_KEY`, model from `ANTHROPIC_MODEL` (default `claude-3-haiku-20240307`).
- `openai`: uses `OPENAI_API_KEY`, model from `OPENAI_MODEL` (default `gpt-4o-mini`).
- `mock`: canned responses, no API key needed.

Batch size is capped at 30 reviews (`MAX_BATCH` in `llm.py`) to control API cost. Sample results are cached in `sample_results.json` so the demo can run without a live API call.

## Review source

The demo uses a simulated review source (`sources.py` → `MockSource`) that serves reviews from `samples.csv` in small batches. Nothing is sent to Google; the owner copies public replies by hand. The real Google Business Profile API connection requires approved API access, OAuth consent from the owner, and the legacy v4 reviews endpoints for list, reply, and delete reply. `GoogleSource` is a stub that raises a clear error when invoked. Do not scrape Google Maps.

The simulated source is persisted in Streamlit session state so a rerun does not lose its reply state. The workflow also performs an authoritative idempotency check immediately before recording a reply, and failed records are moved to the approval queue.

## Validation

```bash
python -m reviewdesk.policy
python -m reviewdesk.autopilot
python -m unittest discover -s tests
python -m compileall -q app.py src/reviewdesk
```

The local model-result cache is bounded by `REVIEWDESK_CACHE_MAX_ENTRIES` (default 200)
and expires after `REVIEWDESK_CACHE_TTL_SECONDS` (default 86400 seconds). Review text
may contain personal data; the sidebar includes a cache-clear control. Both settings
are documented in [.env.example](./.env.example).

The repository layout and module boundaries are documented in
[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md). The static landing page lives in
[`website/`](./website/); the runnable product remains the Streamlit entry point
[`app.py`](./app.py).

## Reliability and CI

Automatic workflow attempts use timezone-aware audit timestamps, stable review IDs,
explicit statuses, and date-aware daily caps. Failed attempts are not silently
retried: they move to the approval queue with an error and an owner-controlled retry.
Model responses are validated for action values, field types, and maximum lengths
before they reach the UI.

GitHub Actions runs the policy and workflow checks, unit tests, Python compilation,
and whitespace validation on pushes and pull requests.

## Privacy

No accounts, no database, no scraping, no auto-posting. Review text is sent to the model provider. State this plainly to users.

## Out of scope

Google API integration, auto-posting, scraping review sites, logins, payments, multi-user teams, and analytics dashboards.

## What we learned

See `LEARNINGS.md` — builder and QA add one line there whenever something
surprising happens during development or testing. Highlights:

- The docx says 9 test cases, but `prompts.py::run_tests` actually has 13
  cases; `prompts.py` wins (per AGENTS.md) and all 13 must pass on the real model.
- The UI label for `reply_needs_owner` is "Check facts"; labels and colors live
  in a single `ACTION_STYLE` dict keyed by `prompts.ACTIONS`.
- `samples.csv` has columns `stars, language, text, expected_action` (15 rows);
  row 2 is an empty-text 5-star review on purpose. The sample loader handles the
  extra columns while normal CSV upload needs only `stars` and `text`.
- The 30-review batch cap is enforced in `app.py`; the single retry-on-failure
  lives inside `call_model` in `llm.py`.
- All user- and model-produced text is HTML-escaped before entering any
  `unsafe_allow_html` string.

## Definition of done

- All 13 test cases in `prompts.py::run_tests` pass on the real model.
- The 15 samples run in one click without errors.
- The app works from a fresh browser on a deployed URL.
- Public repo with a README, LEARNINGS.md, and setup steps.
- Demo video recorded (under 3 minutes): triage table, one Roman Urdu complaint with a tone switch, CSV export, ending with the owner posting by hand.
