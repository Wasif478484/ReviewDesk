---
doc: spec
status: draft
---

# ReviewDesk — Technical Spec

## How This Works, In Plain Language

Three Python files do the work.

`prompts.py` is the thinking part. It holds the system prompt that tells the model how to triage a review, the templates that wrap a review together with the business details, the parser that reads the model's JSON reply, and the checker that inspects a draft for rule breaks. Nothing in it calls the network.

`llm.py` is the talking part. One function, `call_model`, sends a system prompt and a user message to an AI provider and returns raw text. It retries once on failure, and it caches results on disk so the demo does not depend on the network.

`app.py` is the showing part. It is a Streamlit app: a sidebar for business setup, one tab for a single review, one tab for batch.

So: `app.py` builds the message with `prompts.py`, hands it to `llm.py`, parses what comes back, runs the checker, and draws the card. The owner copies the text into Google, Yelp, Facebook, or TripAdvisor by hand.

## The Core Journey Through the System

The PRD's Core Journey, traced through those pieces. PRD ref: `prd.md > The Core Journey`.

Owner pastes a review → `app.py` reads the sidebar profile → `prompts.build_user_message()` wraps profile + review + settings + platform into one prompt → `prompts.build_system_prompt(platform)` supplies the triage rules and examples → `llm.call_model()` sends both to the provider and returns raw text → `prompts.safe_parse()` validates the JSON, falling back to "review by hand" if unreadable → `prompts.check_draft()` inspects the draft → `app.py` renders the action badge, draft, checklist, and warnings.

## Stack

| Choice | Detail | Doc |
|---|---|---|
| Python 3.15 | Installed and verified locally | — |
| Streamlit 1.66 | The whole UI; chosen for speed of iteration on a proof of concept | https://docs.streamlit.io |
| anthropic 1.15 | Default provider | https://docs.anthropic.com |
| openai (optional) | Alternative provider, selected by env var | https://platform.openai.com/docs |

**Why Streamlit:** the product is a form, a table, and a card. That is Streamlit's home ground, and it removes an entire frontend build from a 2–4 hour budget.

**Why both providers:** switching providers must mean changing one function, per the design in `prompts.py`. Both paths live behind `llm.call_model`, so the app works whichever key is present.

## Where It Runs and How Someone Tries It

```bash
cd "C:\Build with AI"
pip install -r requirements.txt
streamlit run app.py
```

Then open **http://localhost:8501**.

Environment: either `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`, or `REVIEWDESK_PROVIDER=mock` for a no-API-key demo. Python 3.10+.

Submission requires a short demo video and a public GitHub repository. Deployment is optional and does not replace either.

Public repository: **https://github.com/Wasif478484/ReviewDesk**

Demo video: not yet recorded.

## Look and Feel

Carried forward from `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`.

Four actions, one colour each, held in a single `ACTION_STYLE` dict in `app.py`: reply green `#10b981`, check-facts amber `#f59e0b`, hold red `#ef4444`, report grey `#6b7280`. Badge labels live in the same dict so a label and its colour can never drift apart.

Calm white cards on a light background, one border radius throughout, generous spacing, small muted text for metadata. Typography is the Streamlit default — acceptable for a proof of concept. Warnings are amber boxes; clean drafts say so explicitly rather than showing nothing.

Honest constraint: Streamlit's own widgets (buttons, dropdowns, tabs) cannot be restyled from injected CSS, so those keep default chrome. Everything we draw ourselves (badges, cards, flags, warnings) is fully custom. That is the tradeoff accepted for a proof of concept.

## Components

### Business setup sidebar
Seven text fields plus language, tone, and platform dropdowns, persisted to `st.session_state`. Feeds every analysis.
PRD ref: `prd.md > The Core Journey` (step 1).

### `prompts.py` — triage engine
`build_system_prompt(platform)`, `build_user_message(profile, review, ...)`, `parse_triage_output`, `safe_parse`, `check_draft`, `build_rewrite_message`, `build_translate_message`, `TEST_CASES`, `run_tests`. The platform is threaded through both builders as `{platform}`.
PRD ref: `prd.md > Triage decision`, `prd.md > Draft checker`.

### `llm.py` — provider gateway
`call_model(system, user)` with a single retry, disk cache in `.sample_cache/`, and `provider_available()`. Three providers: anthropic, openai, mock.
PRD ref: `prd.md > Batch mode` (never depends on a live call).

### `app.py` — single review tab
Input row (stars, review text, language, tone), Analyze button, result card.
PRD ref: `prd.md > Single review`.

### `app.py` — batch tab
Sample loader, CSV upload, textarea, progress bar, urgency-sorted table, per-row override, CSV download.
PRD ref: `prd.md > Batch mode`, `prd.md > Sample data`.

## Data Model

There is no database. Everything is session-scoped or a file.

| Data | Where it lives | Updated | On return |
|---|---|---|---|
| Business profile | `st.session_state.profile` | On every sidebar render | Gone (session ends) |
| Single result + edited draft | `st.session_state.single_result` / `.single_draft` | On Analyze, on every draft edit | Gone |
| Batch reviews + results + drafts + overrides | `st.session_state.batch_*` | On Analyze, on every edit | Gone |
| Cached sample model output | `.sample_cache/<sha>.json` | On a successful model call | Reused, so demos need no network |

A review dict is `{stars, text, language, platform, expected_action}`. Only `stars` and `text` are required; the rest default so an ordinary two-column CSV still loads.

## File Structure

```
project/
├── app.py                  # Streamlit interface, session state, styling
├── prompts.py              # system prompt, builders, parser, checker, tests
├── llm.py                  # call_model, retry, cache, providers
├── samples.csv             # 15 demo reviews
├── requirements.txt
├── README.md
├── LEARNINGS.md            # feeds README "What we learned"
├── .env.example            # template only; real .env is gitignored
├── devpost/                # Devpost learning workspace
│   ├── scope.md
│   ├── prd.md
│   ├── spec.md
│   ├── checklist.md
│   └── app-map.html
└── skills/                 # curriculum, not project code
```

## External Services and Dependencies

| Service | Call | Key | Cost / limits |
|---|---|---|---|
| Anthropic Messages API | `client.messages.create`, `max_tokens=900` | `ANTHROPIC_API_KEY` | Per-token; batch capped at 30 |
| OpenAI Chat Completions | `client.chat.completions.create`, `max_tokens=900`, temp 0 | `OPENAI_API_KEY` | Same |

Full journey: system prompt + user message → one JSON object → parsed to eleven fields → rendered. No other network calls, no scraping.

## Important Failure Modes

- **No API key** → banner with instructions, app still loads in mock mode.
- **Model returns unreadable output** → `safe_parse` returns `reply_needs_owner` with "review by hand". No crash, no empty card.
- **API fails twice** → that row reads "could not analyze"; the batch keeps going.
- **Review text containing prompt injection** → treated as data, never instructions; `_clean()` strips section tags and the model is told to treat `<review>` contents as data.

## What Was Simplified and Why

- **`st.markdown` + `unsafe_allow_html` instead of CSS files** — custom styling without a build step. Streamlit widgets still keep default chrome. A themed config plus real CSS would need more structure than a proof of concept deserves.
- **In-memory session state instead of a database** — matches the "no accounts, no database" promise. Persistence would undercut it.
- **Mock provider returning canned JSON** — lets judges and testers click the sample button with no key. A real model would make the demo fragile.
- **Disk cache instead of a database** — enough to make demos repeatable, small enough to ignore in git.

## Decisions and Open Issues

- **Provider abstraction chosen over one locked provider** — so switching means changing one function. Accepted tradeoff: two SDKs to maintain.
- **Learner uncertainty: how well the model handles Roman Urdu.** Unverifiable without a real key; the risk is that drafts in Roman Urdu read unnaturally. Mitigation: translations into the owner's language stay visible in the UI so a reader can check them, and the README says explicitly that only English, Urdu, Roman Urdu, and English-language output should be verified by a native speaker before claiming support.
- **Action misclassification remains possible.** Mitigated by showing the reason for every decision and letting the owner override any action.
- **Resolved:** the docx said 9 tests; `prompts.py::run_tests` has 13. `prompts.py` wins; the definition of done is 13.