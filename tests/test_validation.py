import unittest

from reviewdesk.prompts import parse_triage_output, safe_parse


class ModelValidationTests(unittest.TestCase):
    def test_rejects_non_text_model_output(self):
        with self.assertRaises(ValueError):
            parse_triage_output(None)

    def test_rejects_non_string_flags(self):
        raw = '{"action":"reply","sentiment":"positive","flags":[1]}'
        with self.assertRaises(ValueError):
            parse_triage_output(raw)

    def test_rejects_oversized_draft(self):
        raw = '{"action":"reply","sentiment":"positive","draft_reply":"' + ("x" * 4001) + '"}'
        with self.assertRaises(ValueError):
            parse_triage_output(raw)

    def test_safe_parse_returns_owner_review(self):
        result = safe_parse('{"action":"reply","sentiment":"invalid"}')
        self.assertEqual(result["action"], "reply_needs_owner")
        self.assertIsNone(result["draft_reply"])

    def test_safe_parse_handles_non_text_output(self):
        result = safe_parse(None)
        self.assertEqual(result["action"], "reply_needs_owner")

    def test_draft_checker_rejects_non_text_drafts(self):
        from reviewdesk.prompts import check_draft
        self.assertEqual(check_draft(123), ["draft must be text"])


if __name__ == "__main__":
    unittest.main()
