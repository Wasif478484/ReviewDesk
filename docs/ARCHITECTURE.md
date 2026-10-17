# ReviewDesk architecture

ReviewDesk is a Streamlit application with a plain-Python workflow core. The
owner remains in control: the demo records simulated outcomes locally and never
posts to Google.

## Repository map

```text
.
├── app.py                 # Stable Streamlit entry point
├── src/reviewdesk/        # Packaged application code
│   ├── app.py             # Streamlit screen composition
│   ├── domain.py          # Typed workflow and audit records
│   ├── prompts.py         # Frozen triage prompts and draft checks
│   ├── policy.py          # Frozen safety decision rules
│   ├── llm.py             # Provider gateway and local result cache
│   ├── sources.py         # Mock source and provider boundary
│   ├── autopilot.py       # Plain-Python workflow orchestration
│   └── ui.py              # Escaped HTML helpers and shared styling
├── samples.csv            # Safe demo input data
├── sample_results.json    # Cached demo triage results
├── tests/                 # Unit and workflow regression tests
├── scripts/               # Maintainer utilities, such as cache generation
├── website/               # Static project landing page
├── devpost/               # Curriculum artifacts and project decisions
├── skills/                # Devpost Learn curriculum material
└── .github/workflows/     # Automated checks
```

## Runtime boundaries

`reviewdesk.app` owns Streamlit widgets and session state. The root `app.py`
keeps the familiar Streamlit command stable and imports the package entry point. It calls the plain-Python
workflow in `autopilot.py`, which applies `policy.py` before invoking the
source boundary in `sources.py`. `prompts.py` and `llm.py` are independent of
the workflow UI and can be tested without starting Streamlit.

The only source write call is made by `autopilot.send_reply()`. The mock source
records actions in memory; it does not contact Google. A future provider must
implement the `ReviewSource` contract and preserve the idempotency and audit
requirements before it can be enabled.

## Change rules

- Keep `prompts.py` and `policy.py` behavior frozen unless a product question is
  explicitly resolved.
- Keep model and user text escaped before it enters custom HTML.
- Add or update tests for workflow, parser, and source changes.
- Do not commit `.env`, cache files, bytecode, or generated local artifacts.
- Run the commands in the README before opening a pull request.
