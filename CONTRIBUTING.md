# Contributing to ReviewDesk

## Development setup

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -e .
$env:REVIEWDESK_PROVIDER = "mock"
```

Run the app with:

```powershell
python -m streamlit run app.py
```

## Verification

Before submitting a change, run:

```powershell
python -m reviewdesk.policy
python -m reviewdesk.autopilot
python -m unittest discover -s tests
python -m compileall -q app.py src/reviewdesk
git diff --check
```

GitHub Actions runs the same checks for pushes and pull requests.

## Scope and safety

ReviewDesk is an owner-in-the-loop demo. It does not log in to Google, scrape
reviews, post replies, or report reviews. Do not add secrets, provider tokens,
or personal review data to the repository. Keep changes focused and update
`docs/ARCHITECTURE.md` when a module boundary changes.
