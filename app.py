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

import base64
import csv
import html
import io
import os

import streamlit as st

from prompts import (
    ACTIONS,
    COMMON_LANGUAGES,
    DEFAULT_PROFILE,
    TONES,
    build_system_prompt,
    build_user_message,
    build_rewrite_message,
    build_translate_message,
    check_draft,
    parse_triage_output,
    safe_parse,
)
from llm import PROVIDER, call_model, provider_available

# ---------------------------------------------------------------------------
# Page config & CSS
# ---------------------------------------------------------------------------

st.set_page_config(page_title="ReviewDesk", page_icon="\U0001F4CB", layout="wide")

# One dict holding label + color for each action (values come from prompts.ACTIONS).
ACTION_STYLE = {
    "reply": {"label": "Reply", "color": "#10b981"},
    "reply_needs_owner": {"label": "Check facts", "color": "#f59e0b"},
    "hold": {"label": "Hold", "color": "#ef4444"},
    "report": {"label": "Report", "color": "#6b7280"},
}

# Supported review platforms. Google remains the default per the original spec.
PLATFORMS = ("Google", "Yelp", "Facebook", "TripAdvisor", "Other")

URGENCY_ORDER = {"hold": 0, "reply_needs_owner": 1, "report": 2, "reply": 3}

# 30-review batch cap is enforced here in app.py (the constant is shared with llm.py).
MAX_BATCH = 30

st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=Plus+Jakarta+Sans:wght@600;800&display=swap');

    :root {
        --slate-900: #0f172a;
        --slate-800: #1e293b;
        --slate-700: #334155;
        --slate-500: #64748b;
        --slate-100: #f1f5f9;
        --reply: #10b981;
        --check: #f59e0b;
        --hold: #ef4444;
        --report: #6b7280;
        --ink: #0f172a;
        --muted: #64748b;
        --border: #e2e8f0;
    }
    .block-container { padding-top: 1rem; max-width: 1100px; }
    .app-title { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: 1.5rem; letter-spacing: -0.03em; color: var(--slate-900); margin: 0 0 0.25rem 0; }
    .app-subtitle { color: var(--slate-500); font-size: 0.875rem; margin-top: 0; font-family: 'IBM Plex Mono', monospace; }
    .section-title { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 1rem; letter-spacing: 0.05em; color: var(--slate-900); margin: 1rem 0 0.5rem 0; text-transform: uppercase; }
    .badge {
        display: inline-block; padding: 0.18rem 0.7rem; border-radius: 6px;
        font-size: 0.75rem; font-weight: 700; color: #fff; font-family: 'IBM Plex Mono', monospace;
    }
    .card {
        border: 1px solid var(--border); border-radius: 10px; padding: 1rem 1.25rem;
        margin: 0.75rem 0; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .card h3 { margin: 0 0 0.5rem 0; font-size: 0.95rem; font-family: 'Plus Jakarta Sans', sans-serif; color: var(--slate-900); }
    .card p { margin: 0.25rem 0; color: var(--slate-700); font-family: 'IBM Plex Mono', monospace; }
    .flag {
        display: inline-block; background: #f8fafc; color: var(--slate-700);
        border: 1px solid var(--border); border-radius: 6px; padding: 0.12rem 0.5rem;
        font-size: 0.75rem; font-family: 'IBM Plex Mono', monospace; margin: 0.15rem 0.35rem 0.15rem 0;
    }
    .warn {
        background: #fef3c7; border: 1px solid #f59e0b; color: #92400e;
        border-radius: 8px; padding: 0.7rem 1rem; margin: 0.6rem 0; font-size: 0.875rem; font-family: 'IBM Plex Mono', monospace;
    }
    .warn b { color: #78350f; }
    .muted { color: var(--slate-500); font-size: 0.85rem; font-family: 'IBM Plex Mono', monospace; }
    .small { font-size: 0.85rem; font-family: 'IBM Plex Mono', monospace; }
    .stTextArea textarea { font-family: 'IBM Plex Mono', monospace; font-size: 0.9rem; }
    div[data-testid="stHorizontalBlock"] { gap: 0.6rem; }
    .stSelectbox > div > div { font-family: 'IBM Plex Mono', monospace; }
    .stButton > button { font-family: 'IBM Plex Mono', monospace; font-weight: 700; border-radius: 6px; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    .card { animation: fadeIn 0.35s ease-out both; }
    </style>
    """,
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def esc(value):
    """HTML-escape a value so it is safe to inject into unsafe_allow_html."""
    return html.escape(str(value or ""))


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


def analyze_one(review, profile, language, tone, owner_language, platform="Google"):
    """Run triage for one review. Returns (result_dict, raw_text_or_None, error_or_None).

    Per-review language overrides the default when present (used by samples).
    """
    review_language = review.get("language") or language
    review_platform = review.get("platform") or platform
    system = build_system_prompt(platform=review_platform)
    user = build_user_message(
        profile, review, language=review_language, tone=tone, owner_language=owner_language,
        platform=review_platform,
    )
    try:
        raw = call_model(system, user)
    except Exception as err:  # noqa: BLE001
        return None, None, str(err)
    result = safe_parse(raw)
    # Carry through source fields for display / comparison.
    result["_stars"] = review.get("stars", 0)
    result["_text"] = review.get("text", "")
    result["_language"] = review.get("language") or language
    result["_platform"] = review_platform
    result["_expected_action"] = review.get("expected_action")
    return result, raw, None


def draft_warnings(draft, profile, draft_translation=None):
    return check_draft(draft, profile, draft_translation)


def action_badge(action):
    style = ACTION_STYLE.get(action, {"label": action, "color": "#6b7280"})
    return f'<span class="badge" style="background:{esc(style["color"])}">{esc(style["label"])}</span>'


def csv_download_button(rows, filename="reviewdesk_results.csv"):
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        ["stars", "text", "platform", "language", "action", "sentiment", "flags", "reason",
         "draft_reply", "review_translation", "report_note"]
    )
    for r in rows:
        writer.writerow(
            [
                r.get("stars", ""),
                r.get("text", ""),
                r.get("platform", ""),
                r.get("language", ""),
                r.get("action", ""),
                r.get("sentiment", ""),
                ", ".join(r.get("flags", [])),
                r.get("reason", ""),
                r.get("draft_reply") or "",
                r.get("review_translation") or "",
                r.get("report_note") or "",
            ]
        )
    st.download_button(
        label="Download CSV",
        data=buf.getvalue(),
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
    st.info(
        "Running in MOCK mode (no API key). Results are canned so you can explore "
        "the UI. Set ANTHROPIC_API_KEY and `REVIEWDESK_PROVIDER=anthropic` for real model calls."
    )

# ---------------------------------------------------------------------------
# Sidebar: Business setup
# ---------------------------------------------------------------------------

with st.sidebar:
    st.markdown("### \U0001F4CB ReviewDesk")
    st.markdown("Business setup")
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
    default_platform = p.get("default_platform", "Google")
    if default_platform not in PLATFORMS:
        default_platform = "Google"
    p["default_platform"] = st.selectbox("Review platform", PLATFORMS,
                                         index=PLATFORMS.index(default_platform), key="sb_platform",
                                         help="The platform the review came from (used in the system prompt).")
    save_profile(p)

    st.markdown("---")
    st.caption("No accounts, no database. Reviews live only in this browser session.")

# ---------------------------------------------------------------------------
# Tabs
# ---------------------------------------------------------------------------

tab_single, tab_batch = st.tabs(["\U0001F4D7 Single review", "\U0001F4CB Batch"])

# ===========================================================================
# SINGLE REVIEW TAB
# ===========================================================================

with tab_single:
    st.markdown('<div class="section-title">Single review</div>', unsafe_allow_html=True)

    c1, c2, c3 = st.columns([1, 3, 1])
    with c1:
        stars = st.selectbox("Stars", options=[1, 2, 3, 4, 5], index=2, key="ss_stars")
    with c2:
        review_text = st.text_area("Paste the Google review", height=140,
                                   key="ss_review_text",
                                   placeholder="Paste the customer's review here...")
    with c3:
        language = st.selectbox("Language", COMMON_LANGUAGES,
                                index=COMMON_LANGUAGES.index(st.session_state.profile["default_language"]),
                                key="ss_language")
        tone = st.selectbox("Tone", TONES,
                            index=TONES.index(st.session_state.profile["default_tone"]),
                            key="ss_tone")

    owner_language = st.session_state.profile.get("default_language", "English")
    if owner_language == "auto":
        owner_language = "English"

    col_btn = st.columns([1, 1, 6])
    with col_btn[0]:
        analyze_clicked = st.button("Analyze", type="primary", key="ss_analyze")

    if analyze_clicked:
        if not review_text.strip():
            st.error("Please paste a review first.")
        else:
            review = {
                "stars": stars,
                "text": review_text,
                "platform": st.session_state.profile.get("default_platform", "Google"),
            }
            result, raw, err = analyze_one(
                review, st.session_state.profile, language, tone, owner_language,
                platform=st.session_state.profile.get("default_platform", "Google"),
            )
            if err:
                st.session_state.single_result = None
                st.error(f"Could not analyze: {err}")
            else:
                st.session_state.single_result = result
                st.session_state.single_raw = raw
                st.session_state.single_draft = result.get("draft_reply") or ""

    result = st.session_state.single_result

    if result:
        action = result.get("action", "reply")
        draft = st.session_state.single_draft
        draft_translation = result.get("draft_translation")
        review_translation = result.get("review_translation")

        st.markdown("---")
        st.markdown('<div class="section-title">Result</div>', unsafe_allow_html=True)

        # Result card with action-color left edge
        style = ACTION_STYLE.get(action, {"label": action, "color": "#6b7280"})
        st.markdown(
            f'<div class="card" style="border-left: 4px solid {esc(style["color"])};">',
            unsafe_allow_html=True,
        )

        # Header row: prominent badge + sentiment + flags
        hc1, hc2 = st.columns([1, 2])
        with hc1:
            st.markdown(
                f'<span class="badge" style="background:{esc(style["color"])}; font-size:0.85rem;">'
                f'{esc(style["label"]).upper()}</span>',
                unsafe_allow_html=True,
            )
        with hc2:
            st.markdown(
                f'**Sentiment:** {esc(result.get("sentiment","")).title()}'
            )
            flags = result.get("flags", [])
            if flags:
                flag_html = "".join(f'<span class="flag">{esc(f)}</span>' for f in flags)
                st.markdown(f'**Flags:** {flag_html}', unsafe_allow_html=True)
            else:
                st.markdown('**Flags:** —')
        st.markdown(f'**Reason:** {esc(result.get("reason",""))}')

        # Review translation
        if review_translation:
            with st.expander("Review translation (into your language)"):
                st.write(review_translation)

        st.markdown("---")

        # Draft section (reply / reply_needs_owner only)
        if action in ("reply", "reply_needs_owner"):
            st.markdown('<div class="card">', unsafe_allow_html=True)
            st.markdown('**Draft reply** (edit before posting)')
            edited = st.text_area(
                "Draft reply", value=draft, height=160, key="ss_draft_edit",
                label_visibility="collapsed",
            )
            st.session_state.single_draft = edited
            words = len(edited.split())
            st.caption(f"Word count: {words} (target 30-80)")

            ccopy, crewrite = st.columns([1, 1])
            with ccopy:
                b64 = base64.b64encode(edited.encode("utf-8")).decode()
                st.markdown(
                    f'<a href="data:text/plain;base64,{b64}" download="draft_reply.txt">'
                    f'<button style="padding:0.4rem 1rem;border:1px solid #e5e7eb;border-radius:6px;background:#fff;cursor:pointer">Copy draft</button></a>',
                    unsafe_allow_html=True,
                )
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
                            rewrite_raw = call_model(build_system_prompt(), rewrite_user)
                            rewritten = rewrite_raw.strip()
                            st.session_state.single_draft = rewritten
                            st.success("Draft rewritten.")
                            st.rerun()
                        except Exception as err:  # noqa: BLE001
                            st.error(f"Rewrite failed: {err}")

            # Draft translation for owner check
            if draft_translation:
                with st.expander("Draft translation (check before posting)"):
                    st.write(draft_translation)

            # Warnings
            problems = draft_warnings(edited, st.session_state.profile, draft_translation)
            if problems:
                for prob in problems:
                    st.markdown(f'<div class="warn">\u26A0 {esc(prob)}</div>', unsafe_allow_html=True)
            else:
                st.markdown('<div class="warn">\u2705 Draft looks clean.</div>', unsafe_allow_html=True)

            st.markdown('</div>', unsafe_allow_html=True)

        # Owner checklist
        checklist = result.get("owner_checklist", [])
        if checklist:
            st.markdown('<div class="card">', unsafe_allow_html=True)
            st.markdown('**Owner checklist**')
            for item in checklist:
                st.markdown(f"- {esc(item)}")
            st.markdown('</div>', unsafe_allow_html=True)

        # Report note
        if action == "report" and result.get("report_note"):
            st.markdown('<div class="card">', unsafe_allow_html=True)
            st.markdown('**Report note** (paste into the platform’s own report form)')
            st.info(result["report_note"])
            st.markdown('</div>', unsafe_allow_html=True)

        # Raw JSON (collapsed, for debugging)
        with st.expander("Raw model output (JSON)"):
            st.code(st.session_state.single_raw or "", language="json")

        st.markdown('</div>', unsafe_allow_html=True)

# ===========================================================================
# BATCH TAB
# ===========================================================================

with tab_batch:
    st.markdown('<div class="section-title">Batch review</div>', unsafe_allow_html=True)

    st.caption("Paste reviews (one per line, format: stars|text) or upload a CSV with `stars` and `text` columns.")

    # Sample data button
    col_sample, col_upload = st.columns([1, 1])
    with col_sample:
        if st.button("Load sample data (15 reviews)", key="bt_load_samples"):
            try:
                samples_path = os.path.join(os.path.dirname(__file__), "samples.csv")
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
                            "platform": row.get("platform") or "Google",
                            "expected_action": row.get("expected_action") or "",
                        })
                st.session_state.batch_reviews = reviews
                # Also echo into the text area as stars|text for visibility.
                st.session_state.batch_input = "\n".join(
                    f"{r['stars']}|{r['text']}" for r in reviews
                )
                st.success(f"Loaded {len(reviews)} sample reviews.")
            except Exception as err:  # noqa: BLE001
                st.error(f"Could not load samples: {err}")

    with col_upload:
        up = st.file_uploader("Or upload CSV", type=["csv"], key="bt_upload")
        if up is not None:
            try:
                content = up.read().decode("utf-8")
                st.session_state.batch_input = content
                st.session_state.batch_reviews = None  # force re-parse from text area
                st.success("CSV uploaded.")
            except Exception as err:  # noqa: BLE001
                st.error(f"Could not read CSV: {err}")

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
                    "platform": row.get("platform") or "Google",
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
                        "platform": "Google",
                        "expected_action": "",
                    })
                else:
                    reviews.append({
                        "stars": 0,
                        "text": line,
                        "language": "",
                        "platform": "Google",
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
                review_platform = review.get("platform") or profile.get("default_platform", "Google")
                result, raw, err = analyze_one(
                    review, profile, language, tone, owner_language, platform=review_platform,
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
                        "_platform": review_platform,
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
        summary = " | ".join(
            f"{counts[a]} {ACTION_STYLE[a]['label'].lower()}"
            for a in ["hold", "reply_needs_owner", "report", "reply"] if counts[a]
        )
        st.markdown(
            f'<div class="card" style="background:var(--slate-100); border-left:4px solid var(--ink);">'
            f'<span class="muted" style="font-weight:700; letter-spacing:0.05em; text-transform:uppercase;">Batch</span>'
            f' <span class="app-subtitle" style="font-weight:700;">{len(results)} reviews:</span> '
            f'{summary}'
            f'</div>',
            unsafe_allow_html=True,
        )

        st.markdown("---")
        st.mark('<div class="section-title">Results (urgency order)</div>', unsafe_allow_html=True)

        csv_rows = []
        for idx, r in enumerate(sorted_results):
            action = r.get("action", "reply")
            override_key = f"override_{idx}"
            draft_key = f"draft_{idx}"
            style = ACTION_STYLE.get(action, {"label": action, "color": "#6b7280"})

            st.markdown(
                f'<div class="card" style="border-left: 4px solid {esc(style["color"])};">',
                unsafe_allow_html=True,
            )
            # Top row: stars, text, language, platform, expected
            tc1, tc2 = st.columns([2, 1])
            with tc1:
                st.markdown(f'**Stars:** {esc(r.get("_stars", 0))}')
                st.markdown(f'**Text:** {esc(r.get("_text",""))[:120]}{"..." if len(r.get("_text","")) > 120 else ""}')
                if r.get("_language"):
                    st.markdown(f'**Language:** {esc(r["_language"])}')
                if r.get("_platform"):
                    st.markdown(f'**Platform:** {esc(r["_platform"])}')
                if r.get("_expected_action"):
                    st.markdown(f'**Expected:** {esc(r["_expected_action"])}')
            with tc2:
                st.markdown(
                    f'<span class="badge" style="background:{esc(style["color"])}; font-size:0.85rem;">'
                    f'{esc(style["label"]).upper()}</span>',
                    unsafe_allow_html=True,
                )
                st.markdown(f'**Sentiment:** {esc(r.get("sentiment","")).title()}')
                flags = r.get("flags", [])
                if flags:
                    flag_html = "".join(f'<span class="flag">{esc(f)}</span>' for f in flags)
                    st.markdown(f'**Flags:** {flag_html}', unsafe_allow_html=True)
                else:
                    st.markdown('**Flags:** —')
            st.markdown(f'**Reason:** {esc(r.get("reason",""))}')

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
                st.markdown('<div style="margin-top:0.5rem;">', unsafe_allow_html=True)
                st.markdown('**Draft reply** (edit before posting)')
                draft_val = r.get("draft_reply") or ""
                if draft_key not in st.session_state.batch_drafts:
                    st.session_state.batch_drafts[draft_key] = draft_val
                edited_draft = st.text_area(
                    "Draft", value=st.session_state.batch_drafts[draft_key],
                    height=100, key=draft_key, label_visibility="collapsed",
                )
                st.session_state.batch_drafts[draft_key] = edited_draft
                words = len(edited_draft.split())
                st.caption(f"Word count: {words}")

                # Warnings on edited draft
                probs = check_draft(edited_draft, st.session_state.profile, r.get("draft_translation"))
                if probs:
                    for prob in probs:
                        st.markdown(f'<div class="warn">\u26A0 {esc(prob)}</div>', unsafe_allow_html=True)
                st.markdown('</div>', unsafe_allow_html=True)

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
                    for item in r["owner_checklist"]:
                        st.markdown(f"- {esc(item)}")

            st.markdown('</div>', unsafe_allow_html=True)
            csv_rows.append({
                "stars": r.get("_stars", 0),
                "text": r.get("_text", ""),
                "platform": r.get("_platform", ""),
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
