"""Optional Hugging Face sentiment signal for ReviewDesk.

The remote classifier is advisory only. ReviewDesk's triage model and frozen
safety policy remain authoritative.
"""

import os
from functools import lru_cache

import streamlit as st


DEFAULT_SPACE = "Hariharasudhan07/qwen3-0.6b-sentiment-classification"


def _setting(name, default=""):
    value = os.getenv(name)
    if value:
        return value
    try:
        return st.secrets.get(name, default)
    except (FileNotFoundError, KeyError, AttributeError):
        return default


def enabled():
    return _setting("REVIEWDESK_SENTIMENT_PROVIDER", "disabled").lower() == "qwen"


def _label(scores):
    if not isinstance(scores, dict) or not scores:
        raise ValueError("Sentiment service returned no class scores")
    normalized = {
        str(key).strip().lower(): float(value)
        for key, value in scores.items()
    }
    best = max(normalized, key=normalized.get)
    if best == "positive":
        return "positive"
    if best == "negative":
        return "negative"
    if best == "neutral":
        return "mixed"
    raise ValueError(f"Sentiment service returned unknown label: {best!r}")


@lru_cache(maxsize=1)
def _client():
    try:
        from gradio_client import Client
    except ImportError as err:
        raise RuntimeError(
            "gradio_client is required for Qwen sentiment integration. "
            "Install the project requirements first."
        ) from err
    token = _setting("HF_TOKEN") or None
    return Client(_setting("REVIEWDESK_SENTIMENT_SPACE", DEFAULT_SPACE), token=token)


def classify(review_text):
    """Return normalized sentiment, scores, and provider name."""
    if not isinstance(review_text, str) or not review_text.strip():
        raise ValueError("Sentiment classification requires review text")
    if not enabled():
        return None
    outputs = _client().predict(review_text.strip(), api_name="/classify_review")
    if not isinstance(outputs, (tuple, list)) or len(outputs) < 2:
        raise ValueError("Sentiment service returned an unexpected response")
    scores = outputs[1] if isinstance(outputs[1], dict) else outputs[0]
    return {"sentiment": _label(scores), "scores": scores, "provider": "qwen"}
