# ReviewDesk — PLAN.md

Goal: Add a simulated review source and an opt-in demo workflow that records only reviews passing the frozen safety rules in `policy.py`; the owner copies any public reply by hand.

Step being planned: 4 of 5 (sources.py + autopilot.py + Autopilot tab).

Files
- `src/reviewdesk/sources.py` — `ReviewSource` ABC, `MockSource`, and the Google stub.
- `src/reviewdesk/autopilot.py` — Plain Python workflow orchestration and tests.
- `src/reviewdesk/app.py` — Streamlit UI implementation; root `app.py` is the stable launcher.
- `src/reviewdesk/policy.py` — frozen. `decide()` and `should_send()` only.
- `src/reviewdesk/prompts.py` — frozen.
- `scripts/cache_samples.py` — maintainer utility. Writes `sample_results.json`.

Tasks

1. `src/reviewdesk/sources.py`: `ReviewSource` ABC (`fetch_reviews` / `post_reply` / `delete_reply`), `MockSource`, and `GoogleSource` stub.
2. `src/reviewdesk/autopilot.py`: `send_reply()` — for the autopilot path it calls `should_send` itself and refuses if False; checks authoritative reply state immediately before the source call; records approver (autopilot/owner); failed source operations become approval-queue items. Plus cycle logic, dedup, cap counting, and tests with a fake source.
3. `scripts/cache_samples.py`: triages `samples.csv` rows (mock or live), writes `sample_results.json`, prints expected vs actual action per row.
4. Autopilot tab in `app.py`: settings (autopilot off, dry_run on, min_stars 4, trusted languages English-only, veto 0–60 min default 30, daily cap 10) + source selector (Google disabled). Empty state until Fetch.
5. Fetch (5-at-a-time + Fetch all) → triage via cached results → `policy.decide()` → Automatic draft lane / Approval queue / Skipped. Dedup by id. Cancelled/vetoed/undone remembered as handled. Run cycle records only past-due demo rows via `send_reply()`. Veto countdown recalculated on rerun. Cancel / Pause / owner Approve-and-record (not blocked by dry run). Audit log + CSV.
6. Verify: `python -m reviewdesk.policy` (19/19), `python -m reviewdesk.autopilot` (all pass), compile, app starts, flows work in mock mode.

Acceptance criteria
1. [auto] `python -m reviewdesk.policy` prints 19/19 passed.
2. [auto] `python -m reviewdesk.autopilot` prints all tests passed (dry run never posts, duplicate id refused, not-yet-due not posted, cancelled not posted, failed post → approval queue).
3. [auto] `python -m compileall -q app.py src/reviewdesk` passes.
4. [auto] `send_reply()` refuses a review id that was already posted; a failed post lands in the approval queue.
5. [auto] Hold / report / check-facts never enter Auto-post.
6. [auto] Daily cap counts actual autopilot posts only; after a post the source marks the review replied.
7. [auto] Cancelled / vetoed / undone ids are remembered as handled and never re-queued.
8. [auto] Demo-mode audit log reads "recorded in demo; not sent to Google", never "Posted".
9. [human] Three lists render distinctly; veto countdown visible on Auto-post rows.
10. [human] Audit log shows timezone-aware timestamp, review ID, action, status, reasons, actor, and error.

Reliability additions:
- Daily autopilot counts reset at the local calendar date boundary.
- Failed automatic records include their error, move to the approval queue, and offer an explicit retry.
- Model output is type-checked and length-bounded before rendering.
- The owner can clear the local model cache from the sidebar.
- CI runs policy, workflow, unit, compilation, and whitespace checks.

Traps
- `send_reply()` in `autopilot.py` is the only caller of `source.post_reply` — never call it elsewhere.
- Autopilot path goes through `send_reply()` which calls `should_send` itself; owner Approve-and-record is the only other path and is not blocked by dry run.
- Autopilot off by default, dry_run on by default; hold/report/check-facts never enter the automatic lane.
- No background worker; "automatic" means Run cycle button + optional auto-refresh while page is open.
- All autopilot state in `st.session_state`; a refresh resets it.
- Never claim something was posted in dry run or demo mode.
- `prompts.py` and `policy.py` rules are frozen — raise as Question, never as a task.

Questions (with defaults)
1. Auto-refresh while page open, or manual Run cycle only? Default: manual only.
2. Veto window default: brief says 30 (set to 1 by hand for demo). Default: 30.
3. Commit at end of step? Default: yes.

Stop point: Autopilot tab works end to end in demo mode — Fetch populates the three lists, Run cycle records only past-due rows via `send_reply()`, dry run logs "would record", owner can Approve-and-record regardless of dry run, cancelled/vetoed/undone are remembered, audit log exports as CSV. Nothing is committed until you ask.
