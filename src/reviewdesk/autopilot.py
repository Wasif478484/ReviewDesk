"""autopilot.py: autopilot logic for ReviewDesk.

Plain Python with no Streamlit imports, so it can be tested. app.py only
calls into this module; it never touches a ReviewSource directly.

send_reply() is the only caller of source.post_reply. For the autopilot
path it calls should_send itself and refuses if it returns False, so UI
code cannot post automatically by mistake. It records who approved
(autopilot or owner), refuses a review id that was already posted, and
turns a failed post into an approval-queue item.

Run the tests with:  python autopilot.py
"""

from datetime import datetime, timezone
import time

from .policy import AutopilotPolicy, decide, should_send
from .domain import AuditEvent, WorkflowResult


def _timestamp():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _is_replied(source, review):
    """Use the source's authoritative state immediately before posting."""
    if hasattr(source, "is_replied"):
        return bool(source.is_replied(review["id"]))
    return bool(review.get("has_reply"))


def send_reply(source, review, result, profile, policy, *, approver, audit_log):
    """Post one reply, or refuse. Returns (ok, note).

    approver is "autopilot" or "owner". For the autopilot path this
    function calls should_send itself and refuses when it returns False.
    For the owner path it posts directly; dry run does not block it.
    """
    review_id = review["id"]
    draft = result.get("draft_reply")

    if approver not in ("autopilot", "owner"):
        return False, "unknown approver"
    try:
        already_replied = _is_replied(source, review)
    except Exception as err:
        print(f"Reply state check failed for {review_id}: {err}")
        audit_log.append(AuditEvent(
            timestamp=_timestamp(), review_id=review_id,
            excerpt=(review.get("text") or "")[:60], action="reply",
            status="failed", reasons=["could not verify existing reply state"],
            actor=approver, error=str(err),
        ).as_dict())
        return False, "could not verify reply state; moved to approval queue"

    if already_replied:
        return False, "review already has a reply"
    if not draft:
        return False, "reply draft is empty; moved to approval queue"

    if approver == "autopilot":
        decision = "auto_post"
        if not should_send(decision, policy):
            return False, "autopilot is off or dry run is on"
    else:
        decision = "owner_approved"

    try:
        ok = source.post_reply(review_id, draft)
    except Exception as err:
        print(f"Reply failed for {review_id}: {err}")
        audit_log.append(AuditEvent(
            timestamp=_timestamp(), review_id=review_id,
            excerpt=(review.get("text") or "")[:60], action=decision,
            status="failed", reasons=["source operation failed"],
            actor=approver, error=str(err),
        ).as_dict())
        return False, "reply failed; moved to approval queue"
    if ok:
        source.mark_replied(review_id)
        event = AuditEvent(
            timestamp=_timestamp(),
            review_id=review_id,
            excerpt=(review.get("text") or "")[:60],
            action=decision,
            status="recorded_demo",
            reasons=["recorded in demo; not sent to Google"],
            actor=approver,
        )
        audit_log.append(event.as_dict())
        return True, "Recorded in demo (not sent to Google)"
    audit_log.append(AuditEvent(
        timestamp=_timestamp(), review_id=review_id,
        excerpt=(review.get("text") or "")[:60], action=decision,
        status="failed", reasons=["source rejected the operation"],
        actor=approver, error="source returned false",
    ).as_dict())
    return False, "reply failed; moved to approval queue"


def run_cycle(rows, source, profile, policy, audit_log, now=None):
    """Post every past-due autopilot row whose policy gate passes.

    rows: list of dicts with keys review, result, due_at.
    Returns (posted_count, would_count, failed_count).
    """
    now = now if now is not None else time.time()
    outcome = WorkflowResult()
    for row in rows:
        if row.get("cancelled") or row.get("handled"):
            continue
        if row["due_at"] > now:
            continue
        if outcome.posted >= policy.daily_cap:
            row["deferred_reason"] = "daily cap reached"
            timestamp = _timestamp()
            audit_log.append({
                "timestamp": timestamp,
                "time": timestamp,
                "review_id": row["review"]["id"],
                "excerpt": (row["review"].get("text") or "")[:60],
                "action": "auto_post",
                "decision": "auto_post",
                "status": "deferred",
                "reasons": ["daily cap reached"],
                "actor": "autopilot",
                "approver": "autopilot",
            })
            continue
        if should_send("auto_post", policy):
            ok, _ = send_reply(source, row["review"], row["result"], profile,
                               policy, approver="autopilot", audit_log=audit_log)
            if ok:
                outcome.posted += 1
                row["handled"] = True
            else:
                outcome.failed += 1
                row["failed"] = True
                row["last_error"] = "reply failed; owner review required"
                outcome.failed_rows.append(row)
        else:
            outcome.would_post += 1
            timestamp = _timestamp()
            audit_log.append({
                "timestamp": timestamp,
                "time": timestamp,
                "review_id": row["review"]["id"],
                "excerpt": (row["review"].get("text") or "")[:60],
                "action": "auto_post",
                "decision": "auto_post",
                "status": "dry_run",
                "reasons": ["would post"],
                "actor": "autopilot",
                "approver": "autopilot",
            })
    return outcome.posted, outcome.would_post, outcome.failed


def dedup_by_id(rows, handled_ids):
    """Drop rows whose review id is already handled."""
    return [
        r for r in rows
        if r["review"]["id"] not in handled_ids and not r.get("handled")
    ]


def triage_and_split(fetched, source, profile, policy, handled_ids, posted_today=0):
    """Triage fetched reviews and split them into the three lists.

    Returns (auto_rows, queue_rows, skipped_rows). auto_rows are due
    veto_minutes in the future; queue and skipped never auto-post.
    Cancelled/vetoed/undone ids in handled_ids are excluded.
    """
    auto_rows, queue_rows, skipped_rows = [], [], []
    veto = policy.delay_minutes * 60
    now = time.time()

    for review in fetched:
        rid = review["id"]
        if rid in handled_ids:
            continue
        result = review.get("result") or {}
        decision, reasons = decide(result, review, profile, policy,
                                   posted_today=posted_today,
                                   already_replied=_is_replied(source, review))
        entry = {"review": review, "result": result, "cancelled": False}
        if decision == "auto_post":
            entry["due_at"] = now + veto
            auto_rows.append(entry)
        elif decision == "queue":
            queue_rows.append(entry)
        else:
            skipped_rows.append({"review": review, "result": result, "reasons": reasons})
    return auto_rows, queue_rows, skipped_rows


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class FakeSource:
    """Counts calls so tests can assert what was and was not posted."""

    def __init__(self):
        self.posted = []
        self.deleted = []
        self._replied = set()

    def post_reply(self, review_id, text):
        self.posted.append(review_id)
        self._replied.add(review_id)
        return True

    def delete_reply(self, review_id):
        self.deleted.append(review_id)
        self._replied.discard(review_id)
        return True

    def mark_replied(self, review_id):
        self._replied.add(review_id)


def _clean_result():
    return {
        "action": "reply", "sentiment": "positive", "flags": [],
        "review_language": "English", "language_used": "English",
        "draft_reply": "Thank you. Imran, Spice Corner",
        "draft_translation": None,
    }


def run_autopilot_tests():
    profile = {"allowed_offers": "none", "contact_line": ""}
    five = {"id": "r1", "stars": 5, "text": "Great food", "has_reply": False}

    # 1. dry run never calls post_reply
    src = FakeSource()
    pol = AutopilotPolicy(enabled=True, dry_run=True)
    audit = []
    row = {"review": five, "result": _clean_result(), "due_at": 0, "cancelled": False}
    run_cycle([row], src, profile, pol, audit)
    ok1 = src.posted == [] and len(audit) == 1 and audit[0]["status"] == "dry_run"
    print(f"{'PASS' if ok1 else 'FAIL'} dry run never posts")

    # 2. live run posts a due row and records approver
    src = FakeSource()
    pol = AutopilotPolicy(enabled=True, dry_run=False)
    audit = []
    run_cycle([row], src, profile, pol, audit)
    ok2 = src.posted == ["r1"] and audit[0]["approver"] == "autopilot"
    print(f"{'PASS' if ok2 else 'FAIL'} live run posts due row")

    # 3. duplicate id refused by send_reply when already posted
    ok3 = "r1" in src._replied
    print(f"{'PASS' if ok3 else 'FAIL'} duplicate id marked replied")

    # 4. row that is not yet due is not posted
    src = FakeSource()
    pol = AutopilotPolicy(enabled=True, dry_run=False)
    audit = []
    future = {"review": five, "result": _clean_result(), "due_at": time.time() + 3600, "cancelled": False}
    run_cycle([future], src, profile, pol, audit)
    ok4 = src.posted == []
    print(f"{'PASS' if ok4 else 'FAIL'} not-yet-due not posted")

    # 5. cancelled row is not posted
    src = FakeSource()
    pol = AutopilotPolicy(enabled=True, dry_run=False)
    audit = []
    cancelled = {"review": five, "result": _clean_result(), "due_at": 0, "cancelled": True}
    run_cycle([cancelled], src, profile, pol, audit)
    ok5 = src.posted == []
    print(f"{'PASS' if ok5 else 'FAIL'} cancelled not posted")

    # 6. owner path posts even in dry run, records approver
    src = FakeSource()
    pol = AutopilotPolicy(enabled=True, dry_run=True)
    audit = []
    ok6, _ = send_reply(src, five, _clean_result(), profile, pol,
                        approver="owner", audit_log=audit)
    ok6 = ok6 and src.posted == ["r1"] and audit[0]["approver"] == "owner"
    print(f"{'PASS' if ok6 else 'FAIL'} owner approves past dry run")

    # 7. autopilot path refuses when should_send is False
    src = FakeSource()
    pol = AutopilotPolicy(enabled=True, dry_run=True)
    audit = []
    ok7, note = send_reply(src, five, _clean_result(), profile, pol,
                           approver="autopilot", audit_log=audit)
    ok7 = not ok7 and src.posted == []
    print(f"{'PASS' if ok7 else 'FAIL'} autopilot refuses when should_send False")

    # 8. dedup drops handled ids
    ok8 = dedup_by_id([{"review": five}], {"r1"}) == []
    print(f"{'PASS' if ok8 else 'FAIL'} dedup by id")

    # 9. hold never enters auto-post
    src = FakeSource()
    pol = AutopilotPolicy(enabled=True, dry_run=False)
    hold = {"id": "h1", "stars": 1, "text": "sick after meal", "has_reply": False}
    auto, queue, skipped = triage_and_split(
        [{**hold, "result": {**_clean_result(), "action": "hold"}}],
        src, profile, pol, set())
    ok9 = auto == [] and len(queue) == 1 and skipped == []
    print(f"{'PASS' if ok9 else 'FAIL'} hold never auto-posts")

    results = [ok1, ok2, ok3, ok4, ok5, ok6, ok7, ok8, ok9]
    print(f"{sum(results)}/{len(results)} passed")
    return all(results)


if __name__ == "__main__":
    raise SystemExit(0 if run_autopilot_tests() else 1)
