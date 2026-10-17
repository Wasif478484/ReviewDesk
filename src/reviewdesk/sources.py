"""sources.py: review sources for the ReviewDesk autopilot.

An abstract ReviewSource with two implementations:
    MockSource   serves the reviews from samples.csv in small batches and
                 records replies in memory. This is the demo source.
    GoogleSource a stub that raises a clear error. The real Google connection
                 needs approved Business Profile API access, which is not
                 assumed to exist before the deadline.

Every review dict has: id, stars, text, author, date, has_reply.
"""

import csv
import os
from abc import ABC, abstractmethod

SAMPLES_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "samples.csv"))
DEMO_BATCH_SIZE = 5

DEMO_BANNER = "Demo mode: nothing is sent to Google"


class ReviewSource(ABC):
    """Abstract base for review sources."""

    name = "abstract"

    @abstractmethod
    def fetch_reviews(self):
        """Return a list of unreplied review dicts."""

    @abstractmethod
    def post_reply(self, review_id, text):
        """Post a reply to a review. Return True on success."""

    @abstractmethod
    def delete_reply(self, review_id):
        """Delete a previously posted reply. Return True on success."""

    def mark_replied(self, review_id):
        """Mark a review as replied (used by send_reply after success)."""

    @abstractmethod
    def is_replied(self, review_id):
        """Return authoritative reply state for an id."""


class MockSource(ReviewSource):
    """Serves samples.csv in batches and records replies in memory."""

    name = "mock"

    def __init__(self, batch_size=DEMO_BATCH_SIZE):
        if not isinstance(batch_size, int) or batch_size < 1:
            raise ValueError("batch_size must be a positive integer")
        self.batch_size = batch_size
        self._reviews = []
        self._replied = set()
        self._load()

    def _load(self):
        with open(SAMPLES_PATH, encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                try:
                    stars = int(row.get("stars", "").strip() or 0)
                except ValueError:
                    stars = 0
                self._reviews.append({
                    "id": f"sample_{i}",
                    "stars": stars,
                    "text": row.get("text", "") or "",
                    "author": "Demo Reviewer",
                    "date": "2026-10-17",
                    "has_reply": False,
                })

    def fetch_reviews(self):
        """Return up to batch_size unreplied reviews."""
        pending = [r for r in self._reviews if r["id"] not in self._replied and not r["has_reply"]]
        return pending[: self.batch_size]

    def fetch_all(self):
        """Return every unreplied review."""
        return [r for r in self._reviews if r["id"] not in self._replied and not r["has_reply"]]

    def post_reply(self, review_id, text):
        """Record a reply in memory. Always succeeds in the demo."""
        if not any(r["id"] == review_id for r in self._reviews):
            raise ValueError(f"unknown review id: {review_id}")
        if self.is_replied(review_id):
            return False
        if not isinstance(text, str) or not text.strip():
            raise ValueError("reply text must be non-empty")
        self._replied.add(review_id)
        return True

    def delete_reply(self, review_id):
        """Forget a recorded reply."""
        if not any(r["id"] == review_id for r in self._reviews):
            return False
        self._replied.discard(review_id)
        for review in self._reviews:
            if review["id"] == review_id:
                review["has_reply"] = False
        return True

    def mark_replied(self, review_id):
        for r in self._reviews:
            if r["id"] == review_id:
                r["has_reply"] = True

    def is_replied(self, review_id):
        return review_id in self._replied or any(
            r["id"] == review_id and r["has_reply"] for r in self._reviews
        )


class GoogleSource(ReviewSource):
    """Stub for the real Google Business Profile API source.

    The real version needs approved API access, OAuth consent from the
    owner, and the legacy v4 reviews endpoints for list, reply, and
    delete reply. Do not scrape Google Maps.
    """

    name = "google"

    def fetch_reviews(self):
        raise RuntimeError(
            "Google Business Profile API access is not approved for this project. "
            "Use the simulated source for the demo."
        )

    def fetch_all(self):
        raise RuntimeError(
            "Google Business Profile API access is not approved for this project. "
            "Use the simulated source for the demo."
        )

    def post_reply(self, review_id, text):
        raise RuntimeError(
            "Google Business Profile API access is not approved for this project."
        )

    def delete_reply(self, review_id):
        raise RuntimeError(
            "Google Business Profile API access is not approved for this project."
        )

    def is_replied(self, review_id):
        raise RuntimeError(
            "Google Business Profile API access is not approved for this project."
        )