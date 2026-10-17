"""Cache triage results for samples.csv into sample_results.json.

Run with:  python scripts/cache_samples.py
Prints expected versus actual action for each row.
"""

import csv
import json
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from reviewdesk.prompts import safe_parse
from reviewdesk.llm import call_model

SAMPLES = PROJECT_ROOT / "samples.csv"
OUT = PROJECT_ROOT / "sample_results.json"


def main():
    api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key and os.getenv("REVIEWDESK_PROVIDER", "anthropic").lower() != "mock":
        print("ERROR: No API key set. Set ANTHROPIC_API_KEY or OPENAI_API_KEY, or use REVIEWDESK_PROVIDER=mock")
        sys.exit(1)

    with open(SAMPLES, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    results = []
    for row in rows:
        stars = int(row.get("stars") or 0)
        review = {"stars": stars, "text": row.get("text", "")}
        result = safe_parse(call_model(
            _system(), _user(review)
        ))
        result["expected_action"] = row.get("expected_action", "")
        results.append({
            "id": f"sample_{len(results)}",
            "stars": stars,
            "text": row.get("text", ""),
            "language": row.get("language", ""),
            "result": result,
        })
        expected = row.get("expected_action", "")
        actual = result.get("action", "")
        mark = "OK " if expected == actual else "DIFF"
        print(f"{mark} expected={expected} actual={actual} text={review['text'][:50]}")

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nWrote {len(results)} results to {OUT}")


def _system():
    from reviewdesk.prompts import build_system_prompt
    return build_system_prompt()


def _user(review):
    from reviewdesk.prompts import build_user_message
    from reviewdesk.prompts import DEFAULT_PROFILE
    return build_user_message(DEFAULT_PROFILE, review)


if __name__ == "__main__":
    main()
