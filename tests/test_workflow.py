import unittest

from reviewdesk.autopilot import send_reply
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
        from reviewdesk.autopilot import run_cycle
        source = Source()
        rows = [
            {"review": {"id": "r1", "text": "one"}, "result": clean_result(), "due_at": 0},
            {"review": {"id": "r2", "text": "two"}, "result": clean_result(), "due_at": 0},
        ]
        posted, would_post, failed = run_cycle(
            rows, source, self.profile,
            AutopilotPolicy(enabled=True, dry_run=False, daily_cap=1), [],
            now=1,
        )
        self.assertEqual((posted, would_post, failed), (1, 0, 0))
        self.assertEqual(source.calls, 1)
        self.assertEqual(rows[1]["deferred_reason"], "daily cap reached")


if __name__ == "__main__":
    unittest.main()
