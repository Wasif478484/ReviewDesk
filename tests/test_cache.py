import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from reviewdesk import llm


class CacheBoundaryTests(unittest.TestCase):
    def test_cache_is_bounded_and_clearable(self):
        with tempfile.TemporaryDirectory() as directory:
            cache_dir = Path(directory)
            with patch.object(llm, "CACHE_DIR", cache_dir), patch.object(
                llm, "CACHE_MAX_ENTRIES", 1
            ):
                llm._cache_put("first", "one")
                llm._cache_put("second", "two")
                self.assertIsNone(llm._cache_get("first"))
                self.assertEqual(llm._cache_get("second"), "two")
                self.assertEqual(llm.clear_cache(), 1)
                self.assertIsNone(llm._cache_get("second"))

    def test_expired_entries_are_not_returned(self):
        with tempfile.TemporaryDirectory() as directory:
            cache_dir = Path(directory)
            with patch.object(llm, "CACHE_DIR", cache_dir), patch.object(
                llm, "CACHE_TTL_SECONDS", 0
            ):
                llm._cache_put("expired", "value")
                self.assertIsNone(llm._cache_get("expired"))


if __name__ == "__main__":
    unittest.main()
