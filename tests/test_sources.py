import unittest

from reviewdesk.sources import MockSource


class SourceContractTests(unittest.TestCase):
    def test_batch_size_must_be_positive(self):
        with self.assertRaises(ValueError):
            MockSource(0)

    def test_fetch_respects_batch_size_and_excludes_replied(self):
        source = MockSource(batch_size=2)
        first = source.fetch_reviews()
        self.assertEqual(len(first), 2)
        source.post_reply(first[0]["id"], "Recorded demo reply")
        self.assertEqual(len(source.fetch_reviews()), 2)
        self.assertNotIn(first[0]["id"], {review["id"] for review in source.fetch_reviews()})

    def test_duplicate_and_unknown_replies_are_not_recorded(self):
        source = MockSource()
        review_id = source.fetch_reviews()[0]["id"]
        source.post_reply(review_id, "Recorded demo reply")
        self.assertFalse(source.post_reply(review_id, "Second reply"))
        with self.assertRaises(ValueError):
            source.post_reply("missing", "Reply")
        self.assertFalse(source.delete_reply("missing"))

    def test_delete_reply_restores_review(self):
        source = MockSource()
        review_id = source.fetch_reviews()[0]["id"]
        source.post_reply(review_id, "Recorded demo reply")
        self.assertTrue(source.delete_reply(review_id))
        self.assertFalse(source.is_replied(review_id))
        self.assertIn(review_id, {review["id"] for review in source.fetch_all()})
