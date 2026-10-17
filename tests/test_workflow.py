import unittest

from reviewdesk.autopilot import dedup_by_id, run_cycle, send_reply, triage_and_split
from reviewdesk.policy import AutopilotPolicy


class Source:
    def __init__(self, fail=False):
        self.replied = set()
        self.calls = 0
        self.fail = fail

    def is_replied(self, review_id):
        return review_id in self.replied

    def post_reply(self, review_id, text):
        self.calls += 1
        if self.fail:
            return False
        self.replied.add(review_id)
        return True

    def mark_replied(self, review_id):
        self.replied.add(review_id)


class BrokenStateSource(Source):
    def is_replied(self, review_id):
        raise RuntimeError("source unavailable")


def clean_result():
    return {
        "action": "reply",
        "sentiment": "positive",
        "flags": [],
        "review_language": "English",
        "language_used": "English",
        "draft_reply": "Thank you. Imran, Spice Corner",
    }


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.review = {"id": "r1", "stars": 5, "text": "Great"}
        self.profile = {"allowed_offers": "none", "contact_line": ""}

    def test_duplicate_is_refused_before_provider_call(self):
        source = Source()
        source.replied.add("r1")
        ok, message = send_reply(
            source, self.review, clean_result(), self.profile,
            AutopilotPolicy(enabled=True, dry_run=False),
            approver="owner", audit_log=[],
        )
        self.assertFalse(ok)
        self.assertIn("already", message)
        self.assertEqual(source.calls, 0)

    def test_failed_reply_is_explicitly_reported(self):
        source = Source(fail=True)
        ok, message = send_reply(
            source, self.review, clean_result(), self.profile,
            AutopilotPolicy(enabled=True, dry_run=False),
            approver="owner", audit_log=[],
        )
        self.assertFalse(ok)
        self.assertIn("approval queue", message)

    def test_autopilot_dry_run_never_calls_source(self):
        source = Source()
        ok, _ = send_reply(
            source, self.review, clean_result(), self.profile,
            AutopilotPolicy(enabled=True, dry_run=True),
            approver="autopilot", audit_log=[],
        )
        self.assertFalse(ok)
        self.assertEqual(source.calls, 0)

    def test_unknown_approver_is_refused(self):
        source = Source()
        ok, message = send_reply(
            source, self.review, clean_result(), self.profile,
            AutopilotPolicy(enabled=True, dry_run=False),
            approver="unknown", audit_log=[],
        )
        self.assertFalse(ok)
        self.assertIn("unknown", message)
        self.assertEqual(source.calls, 0)

    def test_reply_state_failure_is_safe(self):
        audit = []
        ok, message = send_reply(
            BrokenStateSource(), self.review, clean_result(), self.profile,
            AutopilotPolicy(enabled=True, dry_run=False),
            approver="owner", audit_log=audit,
        )
        self.assertFalse(ok)
        self.assertIn("verify", message)
        self.assertEqual(audit[0]["status"], "failed")

    def test_daily_cap_limits_actual_cycle_records(self):
        source = Source()
        rows = [
            {"review": {"id": "r1", "stars": 5, "text": "one"}, "result": clean_result(), "due_at": 0},
            {"review": {"id": "r2", "stars": 5, "text": "two"}, "result": clean_result(), "due_at": 0},
        ]
        posted, would_post, failed = run_cycle(
            rows, source, self.profile,
            AutopilotPolicy(enabled=True, dry_run=False, daily_cap=1), [],
            now=1,
        )
        self.assertEqual((posted, would_post, failed), (1, 0, 0))
        self.assertEqual(source.calls, 1)
        self.assertEqual(rows[1]["deferred_reason"], "daily cap reached")

    def test_daily_cap_is_shared_across_cycles(self):
        source = Source()
        policy = AutopilotPolicy(enabled=True, dry_run=False, daily_cap=1)
        audit = []
        rows = [
            {"review": {"id": "r1", "stars": 5, "text": "one"}, "result": clean_result(), "due_at": 0},
            {"review": {"id": "r2", "stars": 5, "text": "two"}, "result": clean_result(), "due_at": 0},
        ]
        self.assertEqual(run_cycle(rows[:1], source, self.profile, policy, audit, now=1)[0], 1)
        self.assertEqual(run_cycle(rows[1:], source, self.profile, policy, audit, now=1)[0], 0)
        self.assertEqual(source.calls, 1)

    def test_send_reply_rechecks_action_and_placeholder(self):
        source = Source()
        policy = AutopilotPolicy(enabled=True, dry_run=False)
        hold = {**clean_result(), "action": "hold", "draft_reply": "Please wait"}
        ok, _ = send_reply(source, self.review, hold, self.profile, policy,
                           approver="owner", audit_log=[])
        self.assertFalse(ok)
        placeholder = {**clean_result(), "draft_reply": "Thanks [owner: confirm]."}
        ok, _ = send_reply(source, self.review, placeholder, self.profile, policy,
                           approver="owner", audit_log=[])
        self.assertFalse(ok)

    def test_send_reply_rechecks_changed_star_policy(self):
        source = Source()
        policy = AutopilotPolicy(enabled=True, dry_run=False, min_stars=5)
        review = {"id": "r1", "stars": 4, "text": "Good"}
        ok, _ = send_reply(source, review, clean_result(), self.profile, policy,
                           approver="owner", audit_log=[])
        self.assertFalse(ok)

    def test_non_english_script_cannot_enter_auto_lane(self):
        source = Source()
        policy = AutopilotPolicy(enabled=True, dry_run=False)
        arabic = {"id": "r2", "stars": 5, "text": "الطعام كان لذيذا"}
        auto, queue, _ = triage_and_split(
            [{**arabic, "result": clean_result()}],
            source, self.profile, policy, set(),
        )
        self.assertEqual(auto, [])
        self.assertEqual(len(queue), 1)

    def test_duplicate_ids_are_removed_from_one_batch(self):
        row = {"review": {"id": "r1"}, "result": clean_result()}
        self.assertEqual(len(dedup_by_id([row, row], set())), 1)


if __name__ == "__main__":
    unittest.main()
