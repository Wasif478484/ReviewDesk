"""
llm.py: model calls for the ReviewDesk review triage app.

Provides:
    call_model(system, user) -> raw text      # one call with a single retry
    MAX_BATCH                                 # cap of 30 reviews per batch
    sample_cache                              # in-memory + on-disk cache for demo results

Providers (set REVIEWDESK_PROVIDER env var):
    anthropic  (default, matches prompts.py example)
    openai
    mock        # returns canned triage JSON so the app can be demoed without an API key

Set ANTHROPIC_API_KEY or OPENAI_API_KEY in the environment (or a .env file) for real calls.
Review text is sent to the model provider - state this plainly to users (see README.md).
"""

import hashlib
import json
import os
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PROVIDER = os.getenv("REVIEWDESK_PROVIDER", "anthropic").lower()
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-3-haiku-20240307")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

MAX_BATCH = 30  # cap on reviews per batch to control API cost

CACHE_DIR = Path(__file__).with_name(".sample_cache")
CACHE_DIR.mkdir(exist_ok=True)


def _cache_key(system, user):
    return hashlib.sha256((system + "\n---\n" + user).encode("utf-8")).hexdigest()[:16]


def _cache_path(key):
    return CACHE_DIR / f"{key}.json"


def _cache_get(key):
    try:
        p = _cache_path(key)
        if p.exists():
            return json.loads(p.read_text(encoding="utf-8"))["text"]
    except Exception:
        pass
    return None


def _cache_put(key, text):
    try:
        _cache_path(key).write_text(
            json.dumps({"text": text}, ensure_ascii=False), encoding="utf-8"
        )
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Provider availability
# ---------------------------------------------------------------------------

def provider_available():
    """Return (available, provider_name) for the configured provider.

    A provider is "available" when its API key is set in the environment,
    or when the provider is 'mock' (no key needed).
    """
    if PROVIDER == "mock":
        return True, "mock"
    if PROVIDER == "anthropic":
        return bool(os.getenv("ANTHROPIC_API_KEY")), "anthropic"
    if PROVIDER == "openai":
        return bool(os.getenv("OPENAI_API_KEY")), "openai"
    return False, PROVIDER


# ---------------------------------------------------------------------------
# Model call
# ---------------------------------------------------------------------------

def call_model(system, user):
    """Call the model once, retrying once on failure. Returns raw text.

    Results are cached so demo runs never depend on a live API call.
    """
    key = _cache_key(system, user)
    cached = _cache_get(key)
    if cached is not None:
        return cached

    last_err = None
    for attempt in range(2):
        try:
            text = _call_once(system, user)
            _cache_put(key, text)
            return text
        except Exception as err:  # noqa: BLE001 - surface any provider error
            last_err = err
            if attempt == 0:
                time.sleep(1.0)
                continue
            raise
    raise last_err


def _call_once(system, user):
    if PROVIDER == "mock":
        return _mock_response(system, user)

    if PROVIDER == "anthropic":
        try:
            import anthropic  # type: ignore
        except ImportError as err:
            raise RuntimeError(
                "anthropic package is not installed. Run: pip install anthropic"
            ) from err
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set. Add it to your environment or .env file, "
                "or set REVIEWDESK_PROVIDER=mock to run without an API key."
            )
        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=900,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return msg.content[0].text

    if PROVIDER == "openai":
        try:
            import openai  # type: ignore
        except ImportError as err:
            raise RuntimeError(
                "openai package is not installed. Run: pip install openai"
            ) from err
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not set. Add it to your environment or .env file, "
                "or set REVIEWDESK_PROVIDER=mock to run without an API key."
            )
        client = openai.OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=900,
            temperature=0,
        )
        return resp.choices[0].message.content

    raise ValueError(f"Unknown REVIEWDESK_PROVIDER: {PROVIDER!r}")


# ---------------------------------------------------------------------------
# Mock responses (demo / offline mode)
# ---------------------------------------------------------------------------

# Minimal canned outputs so the UI can be exercised without a live model.
# Keyed by a hash of the review text so the same review always gives the same result.
_MOCK_OUTPUTS = [
    {
        "review_text": "Great biryani and quick service. Will come again!",
        "output": {
            "action": "reply",
            "sentiment": "positive",
            "flags": [],
            "reason": "Simple praise, safe to answer publicly.",
            "review_language": "English",
            "language_used": "English",
            "draft_reply": (
                "Thank you for the kind words. We're glad the biryani and the quick "
                "service worked for you, and we look forward to seeing you again. "
                "The Owner, Your Business"
            ),
            "review_translation": None,
            "draft_translation": None,
            "report_note": None,
            "owner_checklist": [],
        },
    },
    {
        "review_text": "Khana thanda tha aur 40 minute baad order mila. Bohat bura experience.",
        "output": {
            "action": "reply",
            "sentiment": "negative",
            "flags": [],
            "reason": "Genuine complaint about cold food and a long wait, no risky claims.",
            "review_language": "Roman Urdu",
            "language_used": "Roman Urdu",
            "draft_reply": (
                "Assalam o Alaikum, khana thanda milne aur 40 minute intezar karne par "
                "jo pareshani hui, uska hamein afsos hai. Yeh hamare mayar ke mutabiq "
                "nahi. Hum apni team ke saath is par baat kar rahe hain. Agar aap "
                "rabta karein to hum masle ko behtar samajh sakein ge. Shukriya. "
                "The Owner, Your Business"
            ),
            "review_translation": "The food was cold and the order arrived after 40 minutes. Very bad experience.",
            "draft_translation": (
                "Assalam o Alaikum. We are sorry for the trouble caused by the cold "
                "food and the 40-minute wait. This is not up to our standard. We are "
                "discussing it with our team. If you contact us, we will understand "
                "the matter better. Thank you. The Owner, Your Business"
            ),
            "report_note": None,
            "owner_checklist": [],
        },
    },
    {
        "review_text": "La comida estuvo buena pero tardaron mucho en atendernos.",
        "output": {
            "action": "reply",
            "sentiment": "mixed",
            "flags": [],
            "reason": "Mixed feedback: good food, slow service. Reply written in Spanish.",
            "review_language": "Spanish",
            "language_used": "Spanish",
            "draft_reply": (
                "Gracias por su comentario. Nos alegra que la comida haya sido de su "
                "agrado y lamentamos la demora en la atencion. Lo hablaremos con "
                "nuestro equipo para mejorar. Esperamos verle de nuevo pronto. "
                "The Owner, Your Business"
            ),
            "review_translation": "The food was good but they took a long time to serve us.",
            "draft_translation": (
                "Thank you for your comment. We're glad you liked the food and we're "
                "sorry about the delay in service. We'll discuss it with our team to "
                "improve. We hope to see you again soon. The Owner, Your Business"
            ),
            "report_note": None,
            "owner_checklist": [],
        },
    },
    {
        "review_text": "Yahan khana khane ke baad meri tabiyat kharab hui, doctor ko dikhana para. Legal action loon ga.",
        "output": {
            "action": "hold",
            "sentiment": "negative",
            "flags": ["health", "legal"],
            "reason": "The review claims illness after eating and threatens legal action, so a public reply could make things worse.",
            "review_language": "Roman Urdu",
            "language_used": "none",
            "draft_reply": None,
            "review_translation": "I fell ill after eating here and had to see a doctor. I will take legal action.",
            "draft_translation": None,
            "report_note": None,
            "owner_checklist": [
                "Do not reply publicly yet",
                "Find the order and check the kitchen records for that day",
                "Contact the customer privately",
                "Get advice before making any public statement",
            ],
        },
    },
    {
        "review_text": "Best SEO services in Pakistan, visit www.example.com for rank guarantee",
        "output": {
            "action": "report",
            "sentiment": "negative",
            "flags": ["spam", "off_topic"],
            "reason": "An advertisement, not a customer experience.",
            "review_language": "English",
            "language_used": "none",
            "draft_reply": None,
            "review_translation": None,
            "draft_translation": None,
            "report_note": (
                "This review is an advertisement for an unrelated service and does "
                "not describe any experience with this business."
            ),
            "owner_checklist": ["Submit the report through Google's own report option"],
        },
    },
]


def _mock_response(system, user):
    """Return a canned triage output based on the review text inside <review>."""
    import re

    m = re.search(r"<review>\s*stars:\s*([^\n]+)\s*text:\s*(.*?)\s*</review>", user, re.S)
    if not m:
        # Fallback: generic reply
        return json.dumps({
            "action": "reply_needs_owner",
            "sentiment": "mixed",
            "flags": ["other"],
            "reason": "Mock mode: could not parse review, review by hand.",
            "review_language": "unknown",
            "language_used": "none",
            "draft_reply": None,
            "review_translation": None,
            "draft_translation": None,
            "report_note": None,
            "owner_checklist": ["Read the review and write the reply yourself"],
        }, ensure_ascii=False, indent=2)

    text = m.group(2).strip()
    stars = m.group(1).strip()

    # Try to match a known review exactly
    for entry in _MOCK_OUTPUTS:
        if entry["review_text"].lower() == text.lower():
            return json.dumps(entry["output"], ensure_ascii=False, indent=2)

    # Heuristic fallback for unknown reviews
    low = text.lower()
    if any(w in low for w in ["seo", "visit www", "rank guarantee", "advertisement"]):
        action, sentiment = "report", "negative"
        flags = ["spam", "off_topic"]
        reason = "An advertisement, not a customer experience."
        report_note = ("This review appears to be an advertisement and does not "
                       "describe any experience with this business.")
        checklist = ["Submit the report through Google's own report option"]
        draft = None
        review_tr = None
        draft_tr = None
    elif any(w in low for w in ["legal", "lawyer", "court", "sue", "ill", "sick", "hospital",
                                 "food poisoning", "doctor", "injury", "health"]):
        action, sentiment = "hold", "negative"
        flags = ["health", "legal"]
        reason = "The review raises a health or legal concern, so a public reply could make things worse."
        report_note = None
        checklist = [
            "Do not reply publicly yet",
            "Find the order and check records for that day",
            "Contact the customer privately",
            "Get advice before making any public statement",
        ]
        draft = None
        review_tr = f"Review summary (mock): {text[:200]}"
        draft_tr = None
    elif any(w in low for w in ["manager", "staff", "kamran", "named", "rude", "waiter",
                                 "booking", "cancel", "order", "bill", "charged"]):
        action, sentiment = "reply_needs_owner", "negative"
        flags = ["staff_named", "specific_incident"]
        reason = "The review names a staff member or describes a specific incident the owner should verify."
        report_note = None
        checklist = ["Verify the facts before replying publicly", "Contact the customer privately if needed"]
        draft = (
            "Thank you for sharing your experience. We take this seriously and want "
            "to look into it. [OWNER: please confirm the details and let us know how "
            "we can put things right.] You are welcome to contact the business directly. "
            "The Owner, Your Business"
        )
        review_tr = f"Review summary (mock): {text[:200]}"
        draft_tr = draft
    else:
        action = "reply"
        if any(w in low for w in ["bad", "worst", "terrible", "awful", "poor", "slow", "cold"]):
            sentiment = "negative"
        elif "but" in low:
            sentiment = "mixed"
        else:
            sentiment = "positive"
        flags = []
        reason = "Straightforward feedback, safe to answer publicly."
        report_note = None
        checklist = []
        detail = text[:60]
        draft = (
            f"Thank you for your feedback about {detail}. We appreciate you letting us "
            "know and we will share this with our team. You are welcome to contact the "
            "business directly. The Owner, Your Business"
        )
        review_tr = None
        draft_tr = None

    return json.dumps({
        "action": action,
        "sentiment": sentiment,
        "flags": flags,
        "reason": reason,
        "review_language": "English",
        "language_used": "English" if draft else "none",
        "draft_reply": draft,
        "review_translation": review_tr,
        "draft_translation": draft_tr,
        "report_note": report_note,
        "owner_checklist": checklist,
    }, ensure_ascii=False, indent=2)
