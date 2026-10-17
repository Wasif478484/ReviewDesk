---
doc: checklist
status: draft
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. You can paste a review and get a triage card back**
  Becomes usable: A running Streamlit app where a pasted review produces an action badge, sentiment, flags, a reason, and an editable draft.
  Why now: Proves the whole path end to end on the first slice — prompt building, the model call, parsing, the checker, and rendering.
  PRD ref: `prd.md > Single review`, `prd.md > Triage decision`
  Spec ref: `spec.md > Components`, `spec.md > File Structure`
  Build: Scaffold per the spec's file structure, install dependencies, wire `prompts.build_user_message` → `llm.call_model` → `prompts.safe_parse` → `check_draft` → render the card.
  Verify (mechanical): All three modules compile and import; the Streamlit server starts and serves the app on localhost:8501.
  Learner check: Open http://localhost:8501, paste a review, click Analyze, and confirm a card appears with a badge and a reason.
  Commit: `Add single-review triage flow`

- [x] **2. Drafts are editable, copyable, and rule-checked**
  Becomes usable: The owner can edit the draft, see a word count, copy it, and sees amber warnings when it breaks a rule.
  Why now: The guardrails are the product's value; shipping them after the kernel would mean shipping a reply generator first.
  PRD ref: `prd.md > Draft checker`
  Spec ref: `spec.md > Components > prompts.py`
  Build: Inline draft textarea bound to session state, word count against the 30–80 target, base64 copy button, `check_draft` warnings on the edited text and its translation.
  Verify (mechanical): `check_draft` returns a non-empty list for a draft containing "valued customer" and for one promising a refund with `allowed_offers=none`.
  Learner check: Edit the draft to add "we can offer you a refund" and confirm a warning appears.
  Commit: `Add editable draft, copy, and rule warnings`

- [x] **3. Batch mode with urgency sorting and CSV export**
  Becomes usable: Many reviews become an urgency-sorted table with per-row draft editing, an action override, and a CSV download.
  Why now: The first target user is an agency managing several clients, so batch is where the product earns its keep.
  PRD ref: `prd.md > Batch mode`
  Spec ref: `spec.md > Components > app.py`
  Build: Textarea plus CSV upload, progress bar, 30-review cap, `URGENCY_ORDER` sort, expandable rows, override dropdown, `st.download_button` export.
  Verify (mechanical): App imports and the server starts; sorting and cap constants resolve.
  Learner check: Load the samples, analyze, and confirm holds appear above replies and the CSV downloads.
  Commit: `Add batch triage table and CSV export`

- [x] **4. One-click sample data with mock mode**
  Becomes usable: A single button loads 15 reviews and the whole app runs with no API key, so a demo never depends on the network.
  Why now: Judges and testers must be able to click one button and see something real.
  PRD ref: `prd.md > Sample data`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > What Was Simplified and Why`
  Build: `samples.csv` loader, mock provider returning canned triage JSON keyed off the review text, disk cache in `.sample_cache/`, provider banner.
  Verify (mechanical): `samples.csv` parses to 15 rows with columns stars, language, text, platform, expected_action; row 2 is the empty-text 5-star reply case.
  Learner check: Click "Load sample data" with no API key set and confirm 15 reviews appear and the batch runs in mock mode.
  Commit: `Add sample dataset and mock provider`

- [x] **5. Cross-platform support**
  Becomes usable: The same triage and drafting works for Google, Yelp, Facebook, TripAdvisor, or Other, per business and per review.
  Why now: The owner does not live in one platform, and a reply written for Google's rules can be wrong for Yelp's.
  PRD ref: `prd.md > Sample data`, `prd.md > What We're Building`
  Spec ref: `spec.md > Stack`, `spec.md > Components`
  Build: Thread `platform` through `build_system_prompt` and `build_user_message`, add a sidebar platform selector, add the column to `samples.csv`, show it per row and in the CSV export.
  Verify (mechanical): `python -m py_compile` passes on all three modules; a formatted system prompt contains the chosen platform name.
  Learner check: Switch the sidebar platform to Yelp, analyze a review, and confirm the reason and report note reference Yelp rather than Google.
  Commit: `Support multiple review platforms`

- [ ] **6. Verify all 13 tests pass on the real model**
  Becomes usable: `prompts.py::run_tests` reports 13/13 against a live provider, which is the definition of done.
  Why now: Everything so far was verified without an API key; the prompts have never actually run against a real model.
  PRD ref: `prd.md > States and Boundaries`
  Spec ref: `spec.md > Decisions and Open Issues`
  Build: Run `run_tests(call_model)` with `ANTHROPIC_API_KEY` set and a real provider; fix prompt regressions surfaced by failures.
  Verify (mechanical): The runner prints `13/13 passed`.
  Learner check: Read three of the returned drafts and confirm the language and tone match the settings you chose.
  Commit: `Verify prompt suite against the real model`

- [ ] **7. Public repository and demo video**
  Becomes usable: A public GitHub repository and a short demo video, both required for submission.
  Why now: Both are submission requirements and neither is produced by the build itself.
  PRD ref: `prd.md > What We're Building`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`
  Build: `git init`, commit the working tree with `.gitignore` excluding `learner-profile.md` and `.env`, create the public repo, record a video showing the triage table, a Roman Urdu tone switch, and the CSV export.
  Verify (mechanical): `git status` is clean and the repository URL opens without authentication.
  Learner check: Open the repo link in a private window and confirm the run steps work from a fresh clone.
  Commit: `Prepare public repository`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — pending the learner's first hands-on pass
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: not started
Route and stops: not started
Edit outcome: not applicable yet
Reflection: not started
Activity mode: not started

## Revisions

- Prompt templates and system prompt parameterised for platform support — the original scope was Google-only, and the learner asked for replies across platforms mid-build. `scope.md`, `prd.md`, and `spec.md` updated in the same pass so the documents do not contradict the code.
- Test count corrected from 9 to 13 — the docx said 9 cases, but `prompts.py::run_tests` has 13. `prompts.py` wins per AGENTS.md.
- Action label changed from "Check facts first" to "Check facts" and labels merged into a single style dict — the learner clarified the label; separating label and colour dicts had let them drift.
- `samples.csv` gained `language` and `platform` columns — the learner specified the required column set.