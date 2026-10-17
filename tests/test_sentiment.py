import unittest
from unittest.mock import patch

from reviewdesk import sentiment


class SentimentTests(unittest.TestCase):
    def test_qwen_labels_are_normalized(self):
        with patch.object(sentiment, "enabled", return_value=True), patch.object(
            sentiment, "_client"
        ) as client:
            client.return_value.predict.return_value = (
                {"POSITIVE": 0.8, "NEGATIVE": 0.1, "NEUTRAL": 0.1},
                {"POSITIVE": 0.8, "NEGATIVE": 0.1, "NEUTRAL": 0.1},
            )
            result = sentiment.classify("Great service")
        self.assertEqual(result["sentiment"], "positive")
        self.assertEqual(result["provider"], "qwen")

    def test_disabled_provider_does_not_call_remote_service(self):
        with patch.object(sentiment, "enabled", return_value=False), patch.object(
            sentiment, "_client"
        ) as client:
            self.assertIsNone(sentiment.classify("Review"))
            client.assert_not_called()

    def test_unknown_label_is_rejected(self):
        with self.assertRaises(ValueError):
            sentiment._label({"sarcastic": 1.0})


if __name__ == "__main__":
    unittest.main()
