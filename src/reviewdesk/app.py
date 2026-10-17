"""
app.py: Streamlit interface for the ReviewDesk review triage app.

Screens
-------
1. Business setup (sidebar): business name, type, owner name, sign-off line,
   optional contact line, allowed offers, default language, default tone.
2. Single review tab: star rating, paste review, Analyze, result card with
   color-coded action badge, sentiment, flags, reason, editable draft, word
   count, copy button, owner checklist, report note, language/tone dropdowns
   with Rewrite button, yellow rule warnings.
3. Batch tab: paste reviews (one per line) or upload CSV, progress bar,
   summary line, urgency-sorted table, expandable rows for editing drafts,
   action override dropdown, CSV download.
4. Sample data button: loads 15 demo reviews (English, Urdu script, Roman Urdu).

Flow for each review: build user message -> call model -> parse JSON -> run
draft checker -> show card. Unreadable output falls back to "owner must review".
API failure twice -> "could not analyze" for that row, batch continues.

Storage and privacy: no accounts, no database. Reviews live only in the
browser session. Review text is sent to the model provider.
"""

import csv
import io
import json
import os
import time
from datetime import datetime
from pathlib import Path

import streamlit as st

from .prompts import (
    ACTIONS,
    COMMON_LANGUAGES,
    DEFAULT_PROFILE,
    TONES,
    REWRITE_SYSTEM,
    TRANSLATE_SYSTEM,
    build_system_prompt,
    build_user_message,
    build_rewrite_message,
    build_translate_message,
    check_draft,
    parse_triage_output,
    safe_parse,
)
from .llm import PROVIDER, call_model, provider_available, clear_cache
from .sources import MockSource, GoogleSource, DEMO_BANNER
from .policy import AutopilotPolicy
from .autopilot import send_reply, run_cycle, triage_and_split, dedup_by_id
from .sentiment import classify as classify_sentiment
from . import ui
from .ui import esc, inject_css, header, sidebar_intro, demo_banner, title, label, text_block, result_header, summary, row_head, notice, checklist, empty_state, status_bar, lane_header, countdown, footer

# ---------------------------------------------------------------------------
# Page config & CSS
# ---------------------------------------------------------------------------

st.set_page_config(page_title="ReviewDesk", page_icon="\U0001F4CB", layout="wide")

PROJECT_ROOT = Path(__file__).resolve().parents[2]

# One dict holding label + color for each action (values come from prompts.ACTIONS).
ACTION_STYLE = {
    "reply": {"label": "Reply", "color": "#1B8A5A", "headline": "Safe to reply"},
    "reply_needs_owner": {"label": "Check facts", "color": "#B7791F", "headline": "Check the facts, then reply"},
    "hold": {"label": "Hold", "color": "#C0392B", "headline": "Don't reply publicly yet"},
    "report": {"label": "Report", "color": "#5F6B7A", "headline": "Report this review"},
}

URGENCY_ORDER = {"hold": 0, "reply_needs_owner": 1, "report": 2, "reply": 3}

# 30-review batch cap is enforced here in app.py (the constant is shared with llm.py).
MAX_BATCH = 30

inject_css()
header()


def _init_state():
    if "profile" not in st.session_state:
        st.session_state.profile = dict(DEFAULT_PROFILE)
    if "single_result" not in st.session_state:
        st.session_state.single_result = None
    if "single_draft" not in st.session_state:
        st.session_state.single_draft = ""
    if "single_raw" not in st.session_state:
        st.session_state.single_raw = None
    if "batch_reviews" not in st.session_state:
        st.session_state.batch_reviews = None  # list of dicts (set by samples or parse)
    if "batch_results" not in st.session_state:
        st.session_state.batch_results = []
    if "batch_drafts" not in st.session_state:
        st.session_state.batch_drafts = {}
    if "batch_overrides" not in st.session_state:
        st.session_state.batch_overrides = {}
    if "batch_input" not in st.session_state:
        st.session_state.batch_input = ""

_init_state()


def profile_from_state():
    return st.session_state.profile


def save_profile(profile):
    st.session_state.profile = profile
    if not profile.get("sign_off"):
        profile["sign_off"] = (
            f'{profile.get("owner_name", "The Owner")}, {profile.get("business_name", "Your Business")}'
        )


def analyze_one(review, profile, language, tone, owner_language):
    """Run triage for one review. Returns (result_dict, raw_text_or_None, error_or_None).

    Per-review language overrides the default when present (used by samples).
    """
    review_language = review.get("language") or language
    system = build_system_prompt()
    user = build_user_message(
        profile, review, language=review_language, tone=tone, owner_language=owner_language,
    )
    try:
        raw = call_model(system, user)
    except Exception as err:  # noqa: BLE001
        return None, None, str(err)
    result = safe_parse(raw)
    if classify_sentiment is not None:
        try:
            sentiment_signal = classify_sentiment(review.get("text", ""))
            if sentiment_signal:
                result["_sentiment_signal"] = sentiment_signal
        except Exception as err:  # noqa: BLE001 - preserve primary triage result
            result["_sentiment_error"] = str(err)
    # Carry through source fields for display / comparison.
    result["_stars"] = review.get("stars", 0)
    result["_text"] = review.get("text", "")
    result["_language"] = review.get("language") or language
    result["_expected_action"] = review.get("expected_action")
    return result, raw, None


def _csv_safe(value):
    """Prevent spreadsheet formula execution for user/model-controlled cells."""
    if isinstance(value, str) and value.startswith(("=", "+", "-", "@")):
        return "'" + value
    return value


def draft_warnings(draft, profile, draft_translation=None):
    return check_draft(draft, profile, draft_translation)


def csv_download_button(rows, filename="reviewdesk_results.csv"):
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        ["stars", "text", "language", "action", "sentiment", "flags", "reason",
         "draft_reply", "review_translation", "report_note"]
    )
    for r in rows:
        writer.writerow(
            [
                _csv_safe(r.get("stars", "")),
                _csv_safe(r.get("text", "")),
                _csv_safe(r.get("language", "")),
                _csv_safe(r.get("action", "")),
                _csv_safe(r.get("sentiment", "")),
                _csv_safe(", ".join(r.get("flags", []))),
                _csv_safe(r.get("reason", "")),
                _csv_safe(r.get("draft_reply") or ""),
                _csv_safe(r.get("review_translation") or ""),
                _csv_safe(r.get("report_note") or ""),
            ]
        )
    st.download_button(
        label="Download CSV",
        data="\ufeff" + buf.getvalue(),
        file_name=filename,
        mime="text/csv",
    )


# ---------------------------------------------------------------------------
# Provider availability banner
# ---------------------------------------------------------------------------

available, prov_name = provider_available()
if not available:
    st.warning(
        f"No API key configured for provider '{prov_name}'. "
        "Set ANTHROPIC_API_KEY (or OPENAI_API_KEY) in your environment, or run "
        "with `REVIEWDESK_PROVIDER=mock` to demo without an API key. "
        "Review text is sent to the model provider."
    )
elif PROVIDER == "mock":
    ui.demo_banner("Demo mode: canned model results, nothing is sent to Google")

# ---------------------------------------------------------------------------
# Sidebar: Business setup
# ---------------------------------------------------------------------------

with st.sidebar:
    sidebar_intro()
    ui.label("Business setup")
    p = profile_from_state()

    p["business_name"] = st.text_input("Business name", value=p.get("business_name", ""), key="sb_business_name")
    p["business_type"] = st.text_input("Business type", value=p.get("business_type", ""), key="sb_business_type")
    p["owner_name"] = st.text_input("Owner name", value=p.get("owner_name", ""), key="sb_owner_name")
    p["sign_off"] = st.text_input("Sign-off line", value=p.get("sign_off", ""), key="sb_sign_off",
                                  help="Example: Imran, Spice Corner")
    p["contact_line"] = st.text_input("Contact line (e.g. WhatsApp number)", value=p.get("contact_line", ""),
                                      key="sb_contact_line")
    p["allowed_offers"] = st.text_input("Allowed offers (empty = none)", value=p.get("allowed_offers", ""),
                                        key="sb_allowed_offers", help="Drafts won't promise offers not listed here.")

    default_lang = p.get("default_language", "auto")
    if default_lang not in COMMON_LANGUAGES:
        default_lang = "auto"
    p["default_language"] = st.selectbox("Default language", COMMON_LANGUAGES,
                                         index=COMMON_LANGUAGES.index(default_lang), key="sb_language")
    p["default_tone"] = st.selectbox("Default tone", TONES,
                                     index=TONES.index(p.get("default_tone", "warm")) if p.get("default_tone") in TONES else 0,
                                     key="sb_tone")
    save_profile(p)

    st.markdown("---")
    st.caption("No accounts, no database. Reviews live only in this browser session.")
    with st.expander("Local cache and privacy", expanded=False):
        st.caption("Model results are cached locally for the configured TTL. Review text may contain personal data.")
        if st.button("Clear local model cache", key="clear_model_cache"):
            removed = clear_cache()
            st.success(f"Cleared {removed} cached model result(s).")

# ---------------------------------------------------------------------------
# Autopilot state
# ---------------------------------------------------------------------------

def _init_autopilot_state():
    if "ap_source" not in st.session_state:
        st.session_state.ap_source = "mock"
    if "ap_settings" not in st.session_state:
        st.session_state.ap_settings = {
            "enabled": False, "dry_run": True, "min_stars": 4,
            "trusted_languages": ["English"], "veto_minutes": 30, "daily_cap": 10,
        }
    if "ap_auto" not in st.session_state:
        st.session_state.ap_auto = []
    if "ap_queue" not in st.session_state:
        st.session_state.ap_queue = []
    if "ap_skipped" not in st.session_state:
        st.session_state.ap_skipped = []
    if "ap_audit" not in st.session_state:
        st.session_state.ap_audit = []
    if "ap_handled" not in st.session_state:
        st.session_state.ap_handled = set()
    if "ap_posted_today" not in st.session_state:
        st.session_state.ap_posted_today = 0
    if "ap_posted_date" not in st.session_state:
        st.session_state.ap_posted_date = datetime.now().date().isoformat()
    if "ap_paused" not in st.session_state:
        st.session_state.ap_paused = False
    if "ap_source_instance" not in st.session_state:
        st.session_state.ap_source_instance = MockSource()
    if "ap_run_requested" not in st.session_state:
        st.session_state.ap_run_requested = False


_init_autopilot_state()


def _reset_daily_cap_if_needed():
    today = datetime.now().date().isoformat()
    if st.session_state.ap_posted_date != today:
        st.session_state.ap_posted_date = today
        st.session_state.ap_posted_today = 0


_reset_daily_cap_if_needed()


def _cached_sample_result(review_id):
    """Return a cached triage result from sample_results.json, or None."""
    path = PROJECT_ROOT / "sample_results.json"
    if not os.path.exists(path):
        return None
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        for entry in data:
            if entry.get("id") == review_id:
                return entry.get("result")
    except (json.JSONDecodeError, OSError):
        pass
    return None


def _ap_source():
    desired = st.session_state.ap_source
    current = st.session_state.get("ap_source_instance")
    if current is None or getattr(current, "name", None) != desired:
        current = GoogleSource() if desired == "google" else MockSource()
        st.session_state.ap_source_instance = current
    return current


# ---------------------------------------------------------------------------
# Tabs
# ---------------------------------------------------------------------------

tab_single, tab_batch, tab_auto = st.tabs(["Single review", "Batch", "Autopilot"])

# ===========================================================================
# SINGLE REVIEW TAB
# ===========================================================================

with tab_single:
    ui.title("Analyze a review", "Paste a Google review. ReviewDesk decides what to do and drafts a reply.")
    with st.container(key="panel_input"):
        c1, c2, c3 = st.columns([1, 3, 1])
        with c1:
            stars = st.selectbox("Stars", options=[1, 2, 3, 4, 5], index=2, key="ss_stars")
            language = st.selectbox("Reply language", COMMON_LANGUAGES,
                                    index=COMMON_LANGUAGES.index(st.session_state.profile["default_language"]),
                                    key="ss_language")
            tone = st.selectbox("Tone", TONES,
                                index=TONES.index(st.session_state.profile["default_tone"]),
                                key="ss_tone")
        with c2:
            review_text = st.text_area("Paste the Google review", height=215, key="ss_review_text",
                                       placeholder="Paste the customer's review here, in any language...")
        with c3:
            st.markdown("<div style='height:1.75rem'></div>", unsafe_allow_html=True)
            analyze_clicked = st.button("Analyze review", type="primary", key="ss_analyze")

    owner_language = st.session_state.profile.get("default_language", "English")
    if owner_language == "auto":
        owner_language = "English"

    if analyze_clicked:
        if not review_text.strip():
            st.error("Please paste a review first.")
        else:
            review = {
                "stars": stars,
                "text": review_text,
            }
            result, raw, err = analyze_one(
                review, st.session_state.profile, language, tone, owner_language,
            )
            if err:
                st.session_state.single_result = None
                ui.show_error("Could not analyze this review. Please try again or review it by hand.", err, "Analysis")
            else:
                st.session_state.single_result = result
                st.session_state.single_raw = raw
                st.session_state.single_draft = result.get("draft_reply") or ""
                st.session_state["ss_draft_edit"] = result.get("draft_reply") or ""

    result = st.session_state.single_result

    if not result and not analyze_clicked:
        empty_state("single")

    if result:
        if result.get("_sentiment_error"):
            st.warning(
                "Optional Qwen sentiment signal unavailable: "
                + str(result["_sentiment_error"])
            )
        elif result.get("_sentiment_signal"):
            st.info(
                "Advisory Qwen sentiment: "
                + str(result["_sentiment_signal"]["sentiment"]).title()
                + ". ReviewDesk's triage decision remains authoritative."
            )
        action = result.get("action", "reply")
        draft = st.session_state.single_draft
        draft_translation = result.get("draft_translation")
        review_translation = result.get("review_translation")

        st.markdown("---")
        ui.label("Result")

        # Result card with action-color left edge
        style = ACTION_STYLE.get(action, {"label": action, "color": "#6b7280"})
        card_key = f"card_{action}_single"
        with st.container(key=card_key):
            result_header(
                style,
                reason=result.get("reason", ""),
                sentiment=result.get("sentiment", ""),
                language=result.get("review_language", ""),
                flags=result.get("flags", []),
            )

            # Review translation
            if review_translation:
                with st.expander("Review translation (into your language)"):
                    st.write(review_translation)

            st.markdown("---")

            # Draft section (reply / reply_needs_owner only)
            if action in ("reply", "reply_needs_owner"):
                ui.label("Draft reply · edit before posting")
                if "ss_draft_edit" not in st.session_state:
                    st.session_state["ss_draft_edit"] = draft
                edited = st.text_area(
                    "Draft reply", height=160, key="ss_draft_edit",
                    label_visibility="collapsed",
                )
                st.session_state.single_draft = edited
                words = len(edited.split())
                st.caption(f"Word count: {words} (target 30-80)")

                ccopy, crewrite = st.columns([1, 1])
                with ccopy:
                    st.code(edited, language=None)
                    if st.button("Check translation", key="ss_check_translation"):
                        if not edited.strip():
                            st.error("Nothing to translate.")
                        else:
                            try:
                                tr_user = build_translate_message(edited, target_language=owner_language)
                                tr_raw = call_model(TRANSLATE_SYSTEM, tr_user)
                                st.session_state.single_draft_translation = tr_raw.strip()
                                st.rerun()
                            except Exception as err:  # noqa: BLE001
                                ui.show_error("Translation failed. The current draft is still available.", err, "Translation")
                with crewrite:
                    new_lang = st.selectbox("Rewrite language", COMMON_LANGUAGES,
                                            index=COMMON_LANGUAGES.index(language) if language in COMMON_LANGUAGES else 0,
                                            key="ss_rewrite_lang")
                    new_tone = st.selectbox("Rewrite tone", TONES,
                                            index=TONES.index(tone) if tone in TONES else 0,
                                            key="ss_rewrite_tone")
                    if st.button("Rewrite", key="ss_rewrite"):
                        if not edited.strip():
                            st.error("Nothing to rewrite.")
                        else:
                            try:
                                rewrite_user = build_rewrite_message(edited, language=new_lang, tone=new_tone)
                                rewrite_raw = call_model(REWRITE_SYSTEM, rewrite_user)
                                rewritten = rewrite_raw.strip()
                                st.session_state.single_draft = rewritten
                                st.session_state["ss_draft_edit"] = rewritten
                                st.success("Draft rewritten.")
                                st.rerun()
                            except Exception as err:  # noqa: BLE001
                                ui.show_error("Rewrite failed. The current draft is still available.", err, "Rewrite")

                # Draft translation for owner check
                checked_tr = st.session_state.get("single_draft_translation")
                if checked_tr:
                    with st.expander("Draft translation (checked)"):
                        st.write(checked_tr)
                elif draft_translation:
                    with st.expander("Draft translation (check before posting)"):
                        st.write(draft_translation)

                # Warnings
                problems = draft_warnings(edited, st.session_state.profile, draft_translation)
                if problems:
                    for prob in problems:
                        notice("warn", prob)
                else:
                    notice("ok", "Draft looks clean.")

            # Owner checklist
            owner_checklist_items = result.get("owner_checklist", [])
            if owner_checklist_items:
                st.markdown('**Owner checklist**')
                checklist(owner_checklist_items)

            # Report note
            if action == "report" and result.get("report_note"):
                st.markdown('**Report note** (paste into the platform’s own report form)')
                st.info(result["report_note"])

            # Raw JSON (collapsed, for debugging)
            with st.expander("Raw model output (JSON)"):
                st.code(st.session_state.single_raw or "", language="json")

# ===========================================================================
# BATCH TAB
# ===========================================================================

with tab_batch:
    ui.title("Batch review", "Paste reviews or upload a CSV. ReviewDesk triages them all.")

    st.caption("Paste reviews (one per line, format: stars|text) or upload a CSV with `stars` and `text` columns.")

    # Sample data button
    col_sample, col_upload = st.columns([1, 1])
    with col_sample:
        run_live = st.toggle("Run samples live (uses API)", value=False, key="bt_run_live")
        if st.button("Load sample data (15 reviews)", key="bt_load_samples"):
            try:
                samples_path = PROJECT_ROOT / "samples.csv"
                reviews = []
                with open(samples_path, encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        try:
                            stars = int(row.get("stars", "").strip() or 0)
                        except ValueError:
                            stars = 0
                        reviews.append({
                            "stars": stars,
                            "text": row.get("text", "") or "",
                            "language": row.get("language") or "",
                            "expected_action": row.get("expected_action") or "",
                        })
                st.session_state.batch_reviews = reviews
                st.session_state.batch_input = "\n".join(
                    f"{r['stars']}|{r['text']}" for r in reviews
                )
                if not run_live:
                    # Load cached results from sample_results.json
                    cached_path = PROJECT_ROOT / "sample_results.json"
                    if os.path.exists(cached_path):
                        with open(cached_path, encoding="utf-8") as f:
                            cached = json.load(f)
                        results = []
                        for entry in cached:
                            r = dict(entry.get("result", {}))
                            r["_stars"] = entry.get("stars", 0)
                            r["_text"] = entry.get("text", "")
                            r["_language"] = entry.get("language", "")
                            r["_expected_action"] = entry.get("expected_action", r.get("expected_action", ""))
                            results.append(r)
                        st.session_state.batch_results = results
                        st.session_state.batch_drafts = {}
                        st.session_state.batch_overrides = {}
                        st.success(f"Loaded {len(reviews)} sample reviews with cached results.")
                    else:
                        st.warning("No cached results found. Run scripts/cache_samples.py first, or toggle 'Run samples live'.")
                else:
                    st.success(f"Loaded {len(reviews)} sample reviews. Click 'Analyze batch' to run live.")
            except Exception as err:  # noqa: BLE001
                ui.show_error("Could not load the demo samples.", err, "Samples")

    with col_upload:
        up = st.file_uploader("Or upload CSV", type=["csv"], key="bt_upload")
        if up is not None:
            try:
                content = up.read().decode("utf-8-sig")
                st.session_state.batch_input = content
                st.session_state.batch_reviews = None  # force re-parse from text area
                st.success("CSV uploaded.")
            except Exception as err:  # noqa: BLE001
                ui.show_error("Could not read that CSV file.", err, "CSV upload")

    batch_input = st.text_area(
        "Reviews (one per line, format: stars|text)", height=200,
        value=st.session_state.batch_input, key="bt_input_area",
        placeholder="5|Great food, quick service.\n1|Cold food and long wait...\n",
    )
    st.session_state.batch_input = batch_input

    col_run, col_clear = st.columns([1, 1])
    with col_run:
        run_batch = st.button("Analyze batch", type="primary", key="bt_run")
    with col_clear:
        if st.button("Clear", key="bt_clear"):
            st.session_state.batch_input = ""
            st.session_state.batch_reviews = None
            st.session_state.batch_results = []
            st.session_state.batch_drafts = {}
            st.session_state.batch_overrides = {}
            st.rerun()

    # Build the review list to analyze.
    def parse_batch_input(text):
        reviews = []
        if not text or not text.strip():
            return reviews
        first_line = text.strip().splitlines()[0] if text.strip() else ""
        looks_csv = "," in first_line and ("stars" in first_line.lower() or "text" in first_line.lower())
        if looks_csv:
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                try:
                    stars = int(row.get("stars", "").strip() or 0)
                except ValueError:
                    stars = 0
                reviews.append({
                    "stars": stars,
                    "text": row.get("text", "").strip(),
                    "language": row.get("language") or "",
                    "expected_action": row.get("expected_action") or "",
                })
        else:
            for line in text.splitlines():
                line = line.strip()
                if not line:
                    continue
                if "|" in line:
                    stars_part, text_part = line.split("|", 1)
                    try:
                        stars = int(stars_part.strip())
                    except ValueError:
                        stars = 0
                    reviews.append({
                        "stars": stars,
                        "text": text_part.strip(),
                        "language": "",
                        "expected_action": "",
                    })
                else:
                    reviews.append({
                        "stars": 0,
                        "text": line,
                        "language": "",
                        "expected_action": "",
                    })
        return reviews

    if run_batch:
        if st.session_state.batch_reviews:
            reviews = st.session_state.batch_reviews
        else:
            reviews = parse_batch_input(batch_input)

        if not reviews:
            st.error("No reviews to analyze.")
        else:
            if len(reviews) > MAX_BATCH:
                st.warning(f"Capping batch at {MAX_BATCH} reviews ({len(reviews)} provided).")
                reviews = reviews[:MAX_BATCH]

            profile = st.session_state.profile
            language = profile["default_language"]
            tone = profile["default_tone"]
            owner_language = language if language != "auto" else "English"

            results = []
            progress = st.progress(0)
            status = st.empty()
            for i, review in enumerate(reviews):
                status.text(f"Analyzing review {i+1} of {len(reviews)}...")
                result, raw, err = analyze_one(
                    review, profile, language, tone, owner_language,
                )
                if err:
                    result = {
                        "action": "reply_needs_owner",
                        "sentiment": "mixed",
                        "flags": ["other"],
                        "reason": f"Could not analyze: {err}",
                        "review_language": "unknown",
                        "language_used": "none",
                        "draft_reply": None,
                        "review_translation": None,
                        "draft_translation": None,
                        "report_note": None,
                        "owner_checklist": ["Read the review and write the reply yourself"],
                        "_stars": review.get("stars", 0),
                        "_text": review.get("text", ""),
                        "_language": review.get("language") or language,
                        "_expected_action": review.get("expected_action") or "",
                    }
                results.append(result)
                progress.progress((i + 1) / len(reviews))

            status.text("")
            st.session_state.batch_results = results
            st.session_state.batch_drafts = {}
            st.session_state.batch_overrides = {}
            st.success(f"Analyzed {len(results)} reviews.")

    # Display batch results
    results = st.session_state.batch_results
    if results:
        # Urgency sort: holds first, then check-facts, then reports, then replies.
        sorted_results = sorted(results, key=lambda r: URGENCY_ORDER.get(r.get("action", "reply"), 99))

        # Summary line (prominent).
        counts = {a: 0 for a in ACTIONS}
        for r in results:
            counts[r.get("action", "reply")] = counts.get(r.get("action", "reply"), 0) + 1
        summary(len(results), counts, ACTION_STYLE, ["hold", "reply_needs_owner", "report", "reply"])

        st.markdown("---")
        label("Results (urgency order)")

        csv_rows = []
        for idx, r in enumerate(sorted_results):
            action = r.get("action", "reply")
            override_key = f"override_{idx}"
            draft_key = f"draft_{idx}"
            style = ACTION_STYLE.get(action, {"label": action, "color": "#6b7280"})

            card_key = f"card_{action}_{idx}"
            with st.container(key=card_key):
                row_head(
                    style,
                    text=r.get("_text", ""),
                    reason=r.get("reason", ""),
                    stars=r.get("_stars", 0),
                    language=r.get("_language", ""),
                    flags=r.get("flags", []),
                )

                # Override action
                new_action = st.selectbox(
                    "Override action", list(ACTIONS),
                    index=list(ACTIONS).index(action) if action in ACTIONS else 0,
                    key=override_key,
                )
                if new_action != action:
                    st.session_state.batch_overrides[idx] = new_action
                else:
                    st.session_state.batch_overrides.pop(idx, None)

                # Draft section (reply / reply_needs_owner only)
                if action in ("reply", "reply_needs_owner"):
                    st.markdown('**Draft reply** (edit before posting)')
                    draft_val = r.get("draft_reply") or ""
                    if draft_key not in st.session_state.batch_drafts:
                        st.session_state.batch_drafts[draft_key] = draft_val
                    if draft_key not in st.session_state:
                        st.session_state[draft_key] = st.session_state.batch_drafts[draft_key]
                    edited_draft = st.text_area(
                        "Draft", height=100, key=draft_key, label_visibility="collapsed",
                    )
                    st.session_state.batch_drafts[draft_key] = edited_draft
                    words = len(edited_draft.split())
                    st.caption(f"Word count: {words}")

                    # Warnings on edited draft
                    probs = check_draft(edited_draft, st.session_state.profile, r.get("draft_translation"))
                    if probs:
                        for prob in probs:
                            notice("warn", prob)

                # Report note
                if action == "report" and r.get("report_note"):
                    st.caption(f"Report note: {esc(r['report_note'])}")

                # Review translation
                if r.get("review_translation"):
                    with st.expander("Review translation"):
                        st.write(r["review_translation"])

                # Owner checklist
                if r.get("owner_checklist"):
                    with st.expander("Owner checklist"):
                        checklist(r["owner_checklist"])

            csv_rows.append({
                "stars": r.get("_stars", 0),
                "text": r.get("_text", ""),
                "language": r.get("_language", ""),
                "action": st.session_state.batch_overrides.get(idx, action),
                "sentiment": r.get("sentiment", ""),
                "flags": ", ".join(r.get("flags", [])),
                "reason": r.get("reason", ""),
                "draft_reply": st.session_state.batch_drafts.get(draft_key, r.get("draft_reply") or ""),
                "review_translation": r.get("review_translation") or "",
                "report_note": r.get("report_note") or "",
            })

        st.markdown("---")
        csv_download_button(csv_rows)
    else:
        empty_state("batch")

# ===========================================================================
# AUTOPILOT TAB
# ===========================================================================

with tab_auto:
    ui.title("Autopilot", "Low-risk replies are recorded in the demo after a veto window. Everything else waits for you.")
    _s = st.session_state.ap_settings
    _policy = AutopilotPolicy(
        enabled=_s["enabled"], dry_run=_s["dry_run"], min_stars=_s["min_stars"],
        trusted_languages=tuple(_s["trusted_languages"]),
        delay_minutes=_s["veto_minutes"], daily_cap=_s["daily_cap"],
    )
    if st.session_state.ap_paused:
        ui.status_bar([("Autopilot paused", "stop"), ("Demo only: nothing is sent", "warn")])
    elif _policy.enabled:
        ui.status_bar([("Autopilot on", "ok"), ("Demo only: nothing is sent", "warn"), (f"Veto window {_policy.delay_minutes} min", "ok"), (f"Daily cap {_policy.daily_cap}", "ok")])
    else:
        ui.status_bar([("Autopilot off", "warn"), ("Demo only: nothing is sent", "warn")])
    # --- Source selector + demo banner ---
    src_name = st.selectbox(
        "Review source", ["mock", "google"],
        index=0 if st.session_state.ap_source == "mock" else 1,
        key="ap_src_select",
        help="Google requires approved Business Profile API access.",
    )
    st.session_state.ap_source = src_name
    if src_name != getattr(st.session_state.get("ap_source_instance"), "name", None):
        st.session_state.ap_source_instance = (
            GoogleSource() if src_name == "google" else MockSource()
        )
    if src_name == "google":
        st.info("Google Business Profile API access is not approved for this project. Use the simulated source for the demo.")
    else:
        ui.demo_banner(DEMO_BANNER)

    # --- Settings ---
    with st.expander("Autopilot settings", expanded=False):
        s = st.session_state.ap_settings
        c1, c2, c3 = st.columns(3)
        with c1:
            s["enabled"] = st.toggle("Autopilot enabled", value=s["enabled"], key="ap_enabled")
            s["dry_run"] = st.toggle("Dry run (log only, send nothing)", value=s["dry_run"], key="ap_dry")
        with c2:
            s["min_stars"] = st.number_input("Minimum stars", min_value=1, max_value=5, value=s["min_stars"], key="ap_stars")
            s["veto_minutes"] = st.number_input("Veto window (minutes)", min_value=0, max_value=60, value=s["veto_minutes"], key="ap_veto")
        with c3:
            s["daily_cap"] = st.number_input("Daily cap (autopilot posts)", min_value=1, max_value=50, value=s["daily_cap"], key="ap_cap")
            s["trusted_languages"] = st.multiselect(
                "Trusted languages", COMMON_LANGUAGES,
                default=s["trusted_languages"], key="ap_lang",
                help="Add a language only after a native reader has checked its output.",
            )
        st.session_state.ap_settings = s

    # policy is defined above as _policy (before status_bar); keep alias for clarity
    policy = _policy

    # --- Fetch + Run + Pause ---
    fc1, fc2, fc3, fc4 = st.columns([1, 1, 1, 2])
    with fc1:
        if st.button("Fetch new reviews", key="ap_fetch"):
            try:
                source = _ap_source()
                fetched = source.fetch_reviews()
                if not fetched:
                    st.info("No new unreplied reviews.")
                for review in fetched:
                    review["result"] = None  # triage below
                st.session_state.ap_fetch_pending = fetched
                st.rerun()
            except RuntimeError as err:
                ui.show_error("The selected review source is unavailable.", err, "Review source")
    with fc2:
        if st.button("Fetch all", key="ap_fetch_all"):
            try:
                source = _ap_source()
                fetched = source.fetch_all()
                for review in fetched:
                    review["result"] = None
                st.session_state.ap_fetch_pending = fetched
                st.rerun()
            except RuntimeError as err:
                ui.show_error("The selected review source is unavailable.", err, "Review source")
    with fc3:
        if st.button("Run cycle", key="ap_run"):
            st.session_state.ap_run_requested = True
    with fc4:
        if st.session_state.ap_paused:
            if st.button("Resume", key="ap_resume"):
                st.session_state.ap_paused = False
                st.rerun()
        else:
            if st.button("Pause", key="ap_pause"):
                st.session_state.ap_paused = True
                st.rerun()

    # --- Triage fetched reviews ---
    pending = st.session_state.get("ap_fetch_pending", [])
    if pending:
        profile = st.session_state.profile
        lang = profile.get("default_language", "auto")
        tone = profile.get("default_tone", "warm")
        owner_lang = lang if lang != "auto" else "English"
        source = _ap_source()
        for review in pending:
            rid = review["id"]
            if rid in st.session_state.ap_handled:
                continue
            # Use cached sample result if available
            cached = _cached_sample_result(rid)
            if cached is not None:
                review["result"] = cached
            else:
                result, _, err = analyze_one(
                    review, profile, lang, tone, owner_lang
                )
                review["result"] = result if result else safe_parse('{"action":"reply_needs_owner","sentiment":"mixed","flags":["other"],"reason":"Could not analyze","review_language":"unknown","language_used":"none","draft_reply":null,"review_translation":null,"draft_translation":null,"report_note":null,"owner_checklist":["Read the review and write the reply yourself"]}')
        auto_rows, queue_rows, skipped_rows = triage_and_split(
            pending, source, profile, policy,
            st.session_state.ap_handled,
            posted_today=st.session_state.ap_posted_today,
        )
        st.session_state.ap_auto = dedup_by_id(auto_rows, st.session_state.ap_handled)
        st.session_state.ap_queue = dedup_by_id(queue_rows, st.session_state.ap_handled)
        st.session_state.ap_skipped = skipped_rows
        st.session_state.ap_fetch_pending = []
        st.rerun()

    # --- Run cycle logic ---
    if st.session_state.pop("ap_run_requested", False):
        if not st.session_state.ap_paused and st.session_state.ap_auto:
            source = _ap_source()
            profile = st.session_state.profile
            posted, would, failed = run_cycle(
                st.session_state.ap_auto, source, profile, policy,
                st.session_state.ap_audit,
            )
            st.session_state.ap_posted_today += posted
            # Move handled and failed rows out of the automatic lane. Failed
            # rows are surfaced for owner review instead of disappearing.
            failed_ids = {
                r["review"]["id"] for r in st.session_state.ap_auto if r.get("failed")
            }
            failed_rows = [
                r for r in st.session_state.ap_auto if r.get("failed")
            ]
            handled_ids = {
                r["review"]["id"] for r in st.session_state.ap_auto if r.get("handled")
            }
            st.session_state.ap_auto = [
                r for r in st.session_state.ap_auto
                if r["review"]["id"] not in handled_ids and
                r["review"]["id"] not in failed_ids
            ]
            st.session_state.ap_queue.extend(failed_rows)
            if posted or would or failed:
                st.rerun()

    # --- Three lists ---
    st.markdown("---")
    ui.lane_header("Automatic draft lane", len(st.session_state.ap_auto), "#1B8A5A", "Records the simulated outcome after the veto window unless you cancel")
    if not st.session_state.ap_auto:
        st.caption("No reviews waiting for the veto window.")
    now = time.time()
    for i, row in enumerate(st.session_state.ap_auto):
        r = row["review"]
        remaining = max(0, int((row["due_at"] - now) / 60))
        with st.container(key=f"card_reply_ap{i}"):
            ui.row_head(ACTION_STYLE["reply"], r.get("text", ""), "Veto window active.", r.get("stars", 0), r.get("review_language", ""), row.get("flags", []), stacked=True)
            st.markdown(ui.countdown(remaining), unsafe_allow_html=True)
            if st.button(f"Cancel {r['id']}", key=f"ap_cancel_{i}"):
                st.session_state.ap_auto.pop(i)
                st.session_state.ap_handled.add(r["id"])
                st.rerun()

    ui.lane_header("Approval queue", len(st.session_state.ap_queue), "#B7791F", "You edit, then approve and record; copy any public reply by hand")
    if not st.session_state.ap_queue:
        st.caption("No reviews waiting for owner approval.")
    for i, row in enumerate(st.session_state.ap_queue):
        r = row["review"]
        result = row["result"]
        with st.container(key=f"card_reply_needs_owner_ap{i}"):
            if row.get("last_error"):
                st.warning(f"Automatic attempt failed: {row['last_error']}")
            ui.row_head(ACTION_STYLE["reply_needs_owner"], r.get("text", ""), "Names a specific incident.", r.get("stars", 0), r.get("review_language", ""), row.get("flags", []), stacked=True)
            draft = st.text_area(
                "Draft", value=result.get("draft_reply") or "",
                height=80, key=f"ap_qdraft_{i}", label_visibility="collapsed",
            )
            result["draft_reply"] = draft
            bc1, bc2 = st.columns([1, 1])
            with bc1:
                if st.button(f"Approve and record {r['id']}", key=f"ap_approve_{i}"):
                    source = _ap_source()
                    ok, note = send_reply(
                        source, r, result, st.session_state.profile, policy,
                        approver="owner", audit_log=st.session_state.ap_audit,
                    )
                    if ok:
                        st.session_state.ap_handled.add(r["id"])
                        st.session_state.ap_queue.pop(i)
                        st.success(note)
                        st.rerun()
                    else:
                        ui.show_error("The reply could not be recorded; it remains in the approval queue.", note, "Owner approval")
            with bc2:
                retry_label = f"Retry automatically {r['id']}" if row.get("failed") else f"Skip {r['id']}"
                if st.button(retry_label, key=f"ap_skip_{i}"):
                    if row.get("failed"):
                        row["failed"] = False
                        row.pop("last_error", None)
                        row["due_at"] = time.time()
                        st.session_state.ap_queue.pop(i)
                        st.session_state.ap_auto.append(row)
                    else:
                        st.session_state.ap_handled.add(r["id"])
                        st.session_state.ap_queue.pop(i)
                    st.rerun()

    ui.lane_header("Skipped", len(st.session_state.ap_skipped), "#5F6B7A", "Held back by the safety rules")
    if not st.session_state.ap_skipped:
        st.caption("No skipped reviews.")
    for row in st.session_state.ap_skipped:
        r = row["review"]
        with st.container(key=f"card_hold_ap{row.get('idx', 0)}"):
            ui.row_head(ACTION_STYLE["hold"], r.get("text", ""), "; ".join(row.get("reasons", [])), r.get("stars", 0), r.get("review_language", ""), row.get("flags", []), stacked=True)

    # --- Audit log ---
    st.markdown("---")
    label("Audit log")
    if not st.session_state.ap_audit:
        st.caption("No activity yet.")
    else:
        audit_rows = []
        for a in st.session_state.ap_audit:
            audit_rows.append({
                "timestamp": _csv_safe(a.get("timestamp", a.get("time", ""))),
                "review_id": _csv_safe(a.get("review_id", "")),
                "excerpt": _csv_safe(a["excerpt"]),
                "action": _csv_safe(a.get("action", a.get("decision", ""))),
                "status": _csv_safe(a.get("status", "")),
                "reasons": _csv_safe("; ".join(a["reasons"])),
                "actor": _csv_safe(a.get("actor", a.get("approver", ""))),
                "error": _csv_safe(a.get("error", "")),
            })
        st.dataframe(audit_rows, use_container_width=True)
        csv_buf = io.StringIO()
        writer = csv.DictWriter(csv_buf, fieldnames=["timestamp", "review_id", "excerpt", "action", "status", "reasons", "actor", "error"])
        writer.writeheader()
        writer.writerows(audit_rows)
        st.download_button(
            "Download audit CSV", data="\ufeff" + csv_buf.getvalue(),
            file_name="audit_log.csv", mime="text/csv",
        )

ui.footer()
