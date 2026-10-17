"""
policy.py: decides whether a triaged review may be posted automatically.

This is the safety-critical part of autopilot, so it is plain Python with
tests. The model never makes this decision. It only produces the triage
result that this module checks.

decide(...) returns (decision, reasons):
    "skip"       the review already has an owner reply
    "queue"      a human must approve it (reasons say why)
    "auto_post"  every check passed

should_send(...) is the only place that turns "auto_post" into a real send,
and it returns False while autopilot is off or dry_run is on.

Run the tests with:  python policy.py
"""

import re
from dataclasses import dataclass

from .prompts import check_draft


def norm_lang(name):
    return re.sub(r"[\s\-]+", "_", str(name or "").strip().lower())


@dataclass
class AutopilotPolicy:
    enabled: bool = False                    # off by default
    dry_run: bool = True                     # log what would be posted, send nothing
    min_stars: int = 4                       # lower ratings always wait for the owner
    trusted_languages: tuple = ("english",)  # only languages a native reader has checked
    delay_minutes: int = 30                  # veto window before a post goes out
    daily_cap: int = 10


def decide(result, review, profile, policy, posted_today=0, already_replied=False):
    """result: parsed triage dict. review: {"stars", "text"}. profile: business dict."""
    if already_replied:
        return "skip", ["review already has an owner reply"]

    reasons = []
    if not policy.enabled:
        reasons.append("autopilot is off")

    # hold, report and reply_needs_owner can never be posted automatically
    action = result.get("action")
    if action != "reply":
        reasons.append(f"action is {action}, which needs a human")
    if result.get("flags"):
        reasons.append("risk flags: " + ", ".join(result["flags"]))
    if result.get("sentiment") == "negative":
        reasons.append("sentiment is negative")

    try:
        stars_ok = int(review.get("stars")) >= policy.min_stars
    except (TypeError, ValueError):
        stars_ok = False
    if not stars_ok:
        reasons.append(f"rating is below {policy.min_stars} stars or unknown")

    trusted = {norm_lang(lang) for lang in policy.trusted_languages}
    if str(review.get("text", "")).strip():
        if norm_lang(result.get("review_language")) not in trusted:
            reasons.append(f"review language {result.get('review_language')!r} is not on the trusted list")

    draft = result.get("draft_reply")
    if not draft:
        reasons.append("no draft to post")
    else:
        if "[OWNER:" in draft:
            reasons.append("draft has an unfilled owner placeholder")
        reasons.extend(
            f"draft check: {p}"
            for p in check_draft(draft, profile, result.get("draft_translation"))
        )
        if norm_lang(result.get("language_used")) not in trusted:
            reasons.append(f"reply language {result.get('language_used')!r} is not on the trusted list")

    if posted_today >= policy.daily_cap:
        reasons.append("daily cap reached")

    return ("queue", reasons) if reasons else ("auto_post", ["passes all checks"])


def should_send(decision, policy):
    return decision == "auto_post" and policy.enabled and not policy.dry_run


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def _result(**over):
    base = {
        "action": "reply", "sentiment": "positive", "flags": [],
        "review_language": "English", "language_used": "English",
        "draft_reply": ("Thank you for the kind words. We are glad you enjoyed the "
                        "karahi and hope to see you again soon. Imran, Spice Corner"),
        "draft_translation": None,
    }
    base.update(over)
    return base


def run_policy_tests():
    on = AutopilotPolicy(enabled=True, dry_run=False)
    profile = {"allowed_offers": "none", "contact_line": ""}
    five = {"stars": 5, "text": "Great food"}
    cases = [
        ("clean 5-star English", _result(), five, on, {}, "auto_post"),
        ("star-only review", _result(review_language="none"), {"stars": 5, "text": ""}, on, {}, "auto_post"),
        ("autopilot off", _result(), five, AutopilotPolicy(), {}, "queue"),
        ("3 stars", _result(), {"stars": 3, "text": "ok"}, on, {}, "queue"),
        ("unknown stars", _result(), {"stars": None, "text": "ok"}, on, {}, "queue"),
        ("hold is never auto", _result(action="hold", draft_reply=None), five, on, {}, "queue"),
        ("report is never auto", _result(action="report", draft_reply=None), five, on, {}, "queue"),
        ("check-facts is never auto", _result(action="reply_needs_owner"), five, on, {}, "queue"),
        ("risk flag", _result(flags=["staff_named"]), five, on, {}, "queue"),
        ("negative sentiment", _result(sentiment="negative"), five, on, {}, "queue"),
        ("untrusted language", _result(review_language="Spanish", language_used="Spanish"), five, on, {}, "queue"),
        ("promised offer", _result(draft_reply="We will refund you. Imran"), five, on, {}, "queue"),
        ("placeholder left", _result(draft_reply="Thanks, [OWNER: add date]. Imran"), five, on, {}, "queue"),
        ("daily cap reached", _result(), five, on, {"posted_today": 10}, "queue"),
        ("already replied", _result(), five, on, {"already_replied": True}, "skip"),
    ]
    passed = 0
    for name, result, review, policy, extra, expect in cases:
        got, reasons = decide(result, review, profile, policy, **extra)
        ok = got == expect
        passed += ok
        print(f"{'PASS' if ok else 'FAIL'} {name}: {got} {reasons if not ok else ''}")

    dry = AutopilotPolicy(enabled=True, dry_run=True)
    checks = [
        ("dry run never sends", should_send("auto_post", dry) is False),
        ("live run sends auto_post", should_send("auto_post", on) is True),
        ("queue never sends", should_send("queue", on) is False),
        ("off never sends", should_send("auto_post", AutopilotPolicy()) is False),
    ]
    for name, ok in checks:
        passed += ok
        print(f"{'PASS' if ok else 'FAIL'} {name}")
    total = len(cases) + len(checks)
    print(f"{passed}/{total} passed")
    return passed == total


if __name__ == "__main__":
    raise SystemExit(0 if run_policy_tests() else 1)
