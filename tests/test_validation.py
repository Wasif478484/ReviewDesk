import unittest

from reviewdesk.prompts import parse_triage_output, safe_parse


class ModelValidationTests(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
