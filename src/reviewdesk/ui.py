"""ui.py: ReviewDesk look and feel. CSS plus small HTML helpers. No model logic.

Needs Streamlit 1.40 or newer (uses st.container(key=...)).
Every piece of untrusted text goes through esc() before it enters HTML.
"""

import html

import streamlit as st


def show_error(message, error, context="ReviewDesk"):
    """Show a safe message while keeping technical details in the console."""
    print(f"{context}: {error!r}")
    st.error(message)


def esc(value):
    return html.escape(str(value or ""))


CSS = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --ink:#10213B; --body:#52647D; --muted:#8291A8; --line:#DCE5F0; --bg:#F5F8FC; --card:#FFFFFF;
  --accent:#173B67; --accent-2:#2C6BED; --focus:#3B82F6; --soft:#EEF4FB;
  --reply:#138A61; --check:#B7791F; --hold:#C2414A; --report:#64748B;
  --shadow:0 18px 45px rgba(21,48,82,.08); --shadow-sm:0 5px 18px rgba(21,48,82,.07);
}

/* ---------- base ---------- */
html, body, .stApp, [class*="css"] { font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif; color:var(--body); }
.stApp { background:radial-gradient(circle at 88% 0%,#EAF2FF 0,transparent 31rem),var(--bg); }
.block-container { max-width:1180px; padding-top:1.6rem; padding-bottom:4rem; }
[data-testid="stToolbar"], #MainMenu, footer { display:none !important; }
header[data-testid="stHeader"] { background:transparent; }
h1,h2,h3,h4 { color:var(--ink); letter-spacing:-.02em; }

/* ---------- sidebar ---------- */
[data-testid="stSidebar"] { background:linear-gradient(180deg,#FFFFFF 0%,#F7FAFE 100%); border-right:1px solid var(--line); }
[data-testid="stSidebar"] h3 { display:none; }
[data-testid="stSidebar"] label p { font-size:.8rem; font-weight:500; color:var(--body); }
[data-testid="stSidebar"] [data-testid="stExpander"] { border:1px solid var(--line); border-radius:14px; background:rgba(255,255,255,.7); }
.rd-side-intro { padding:.2rem 0 1.1rem; }
.rd-side-mark { display:inline-block; vertical-align:middle; width:36px; height:36px; border-radius:11px; box-shadow:0 7px 15px rgba(44,107,237,.22); }
.rd-side-name { display:inline-block; margin-left:.55rem; vertical-align:middle; color:var(--ink); font-size:1rem; font-weight:800; }
.rd-side-copy { margin:.65rem 0 0; color:var(--muted); font-size:.75rem; line-height:1.55; }

/* ---------- hero ---------- */
.rd-hero { position:relative; overflow:hidden; display:flex; align-items:center; justify-content:space-between; gap:2rem; flex-wrap:wrap;
  background:linear-gradient(115deg,#102D52 0%,#1D4D83 55%,#2A64BC 100%); color:#fff; border-radius:22px; padding:2.2rem 2.5rem; margin:0 0 1.35rem 0;
  box-shadow:var(--shadow); }
.rd-hero:after { content:""; position:absolute; width:310px; height:310px; right:-110px; top:-150px; border:1px solid rgba(255,255,255,.16); border-radius:50%; box-shadow:0 0 0 28px rgba(255,255,255,.04),0 0 0 58px rgba(255,255,255,.025); }
.rd-hero-left { display:flex; align-items:center; gap:1rem; }
.rd-logo { width:52px; height:52px; border-radius:15px; display:block; box-shadow:0 8px 18px rgba(4,18,42,.22); }
.rd-name { font-size:1.75rem; font-weight:800; letter-spacing:-.03em; line-height:1.1; color:#fff; }
.rd-tag { color:rgba(255,255,255,.7); font-size:.95rem; margin-top:.15rem; }
.rd-hero-right { display:flex; flex-direction:column; align-items:flex-end; gap:.6rem; }
.rd-pill { font-size:.72rem; font-weight:600; color:#E7F0FF; background:rgba(255,255,255,.11); border:1px solid rgba(255,255,255,.2); border-radius:999px; padding:.42rem .9rem; letter-spacing:.01em; }
.rd-legend { display:flex; gap:1rem; flex-wrap:wrap; font-size:.75rem; color:rgba(255,255,255,.7); font-weight:500; }
.rd-legend i { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:.3rem; }

/* ---------- demo strip ---------- */
.rd-demo { display:flex; align-items:center; gap:.55rem; background:#FFF9E6; border:1px solid #F1D77D; color:#765A09; border-radius:12px; padding:.55rem .85rem; font-size:.8rem; font-weight:600; margin:0 0 1rem 0; box-shadow:0 3px 12px rgba(175,130,20,.08); }
.rd-dot { width:8px; height:8px; border-radius:50%; background:#E0A100; }
[data-testid="stAlert"] { border-radius:12px; font-size:.88rem; border:1px solid var(--line); box-shadow:var(--shadow-sm); }

/* ---------- tabs as segmented control ---------- */
[data-testid="stTabs"] > div[data-orientation] { border-bottom:none !important; box-shadow:none !important; }
[data-testid="stTabs"] [role="tablist"], div[data-baseweb="tab-list"] { gap:.3rem; background:rgba(255,255,255,.78); border:1px solid var(--line) !important; border-radius:13px; padding:.3rem; width:fit-content; max-width:100%; box-shadow:var(--shadow-sm); }
[data-testid="stTab"], button[data-baseweb="tab"] { border-radius:10px; padding:.52rem 1.05rem; height:auto; background:transparent; transition:all .18s ease; }
[data-testid="stTab"] p, button[data-baseweb="tab"] p { color:#4B5563; font-weight:500; font-size:.9rem; }
[data-testid="stTab"][aria-selected="true"], button[data-baseweb="tab"][aria-selected="true"] { background:var(--accent); box-shadow:0 5px 12px rgba(23,59,103,.2); }
[data-testid="stTab"][aria-selected="true"] p, button[data-baseweb="tab"][aria-selected="true"] p { color:#fff; }
.react-aria-SelectionIndicator, div[data-baseweb="tab-highlight"], div[data-baseweb="tab-border"] { display:none !important; }

/* ---------- labels and text ---------- */
.rd-label { font-size:.68rem; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); margin:1.1rem 0 .4rem 0; }
.rd-title { font-size:1.45rem; font-weight:800; color:var(--ink); letter-spacing:-.035em; margin:.25rem 0 .18rem 0; }
.rd-sub { color:var(--muted); font-size:.9rem; margin:0 0 .5rem 0; }
.rd-text { background:#F8FAFD; border:1px solid var(--line); border-radius:13px; padding:.85rem 1rem; font-size:.95rem; line-height:1.65; white-space:pre-wrap; unicode-bidi:plaintext; text-align:start; color:var(--ink); box-shadow:inset 0 1px rgba(255,255,255,.8); }
.rd-muted { color:#4B5563; }
.stTextArea textarea { unicode-bidi:plaintext; text-align:start; line-height:1.6; }

/* ---------- inputs ---------- */
[data-testid="stTextAreaRootElement"], [data-testid="stTextInputRootElement"], [data-testid="stSelectbox"] [role="group"], [data-testid="stNumberInputContainer"],
div[data-baseweb="input"], div[data-baseweb="textarea"], div[data-baseweb="select"] > div { background:rgba(255,255,255,.92) !important; border:1px solid var(--line) !important; border-radius:11px !important; }
[data-testid="stTextAreaRootElement"]:focus-within, [data-testid="stTextInputRootElement"]:focus-within, [data-testid="stSelectbox"] [role="group"]:focus-within,
div[data-baseweb="input"]:focus-within, div[data-baseweb="textarea"]:focus-within, div[data-baseweb="select"] > div:focus-within { border-color:var(--focus) !important; box-shadow:0 0 0 3px rgba(37,99,235,.12) !important; }
div[data-baseweb="base-input"] { background:transparent !important; }

/* ---------- panels and cards ---------- */
[class*="st-key-panel_"] { background:rgba(255,255,255,.88); border:1px solid var(--line); border-radius:18px; padding:1.3rem 1.4rem; margin-bottom:1rem; box-shadow:var(--shadow-sm); }
[class*="st-key-card_"] { background:rgba(255,255,255,.94); border:1px solid var(--line); border-left:4px solid var(--line); border-radius:16px; padding:1.05rem 1.25rem; margin-bottom:.85rem; box-shadow:var(--shadow-sm); transition:transform .18s ease,box-shadow .18s ease; }
[class*="st-key-card_"]:hover { transform:translateY(-2px); box-shadow:var(--shadow); }
[class*="st-key-card_reply_needs_owner"] { border-left-color:var(--check); }
[class*="st-key-card_reply_"]:not([class*="needs_owner"]) { border-left-color:var(--reply); }
[class*="st-key-card_hold"] { border-left-color:var(--hold); }
[class*="st-key-card_report"] { border-left-color:var(--report); }

/* ---------- result banner ---------- */
.rd-banner { display:flex; align-items:center; gap:.8rem; padding:.9rem 1rem; border-radius:14px; background:linear-gradient(100deg,#F5F8FC,#FFFFFF); border:1px solid var(--line); }
.rd-ico { flex:none; width:40px; height:40px; border-radius:8px; background:var(--c, var(--accent)); color:#fff; display:flex; align-items:center; justify-content:center; }
.rd-ico svg { width:20px; height:20px; }
.rd-kicker { font-size:.7rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--c, var(--accent)); }
.rd-headline { font-size:1.2rem; font-weight:700; letter-spacing:-.02em; color:var(--ink); line-height:1.2; margin-top:.15rem; }
.rd-reason { margin:.7rem 0 .2rem 0; font-size:.95rem; line-height:1.6; color:var(--body); unicode-bidi:plaintext; text-align:start; }
.rd-chips { display:flex; flex-wrap:wrap; gap:.35rem; margin-top:.5rem; }
.rd-chip { font-size:.7rem; font-weight:600; color:#40516A; background:#F1F5FA; border:1px solid var(--line); border-radius:999px; padding:.2rem .6rem; }
.rd-flag { background:#FEF3F2; border-color:#FBD5D0; color:#9B2C1F; }
.rd-badge { display:inline-block; flex:none; padding:.25rem .7rem; border-radius:6px; color:#fff; font-weight:700; font-size:.7rem; letter-spacing:.06em; text-transform:uppercase; }

/* ---------- batch summary ---------- */
.rd-summary { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:1rem 1.2rem; margin:.4rem 0 1rem 0; }
.rd-sum-title { font-size:.7rem; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:var(--muted); margin-bottom:.5rem; }
.rd-sum-row { display:flex; flex-wrap:wrap; gap:.6rem; }
.rd-sum { display:flex; align-items:baseline; gap:.4rem; padding:.5rem .9rem; border-radius:8px; background:color-mix(in srgb, var(--c) 8%, white); border:1px solid color-mix(in srgb, var(--c) 25%, white); color:var(--c); font-weight:600; }
.rd-sum b { font-size:1.5rem; font-weight:700; line-height:1; }

/* ---------- batch rows ---------- */
.rd-row { display:flex; gap:.85rem; align-items:flex-start; }
.rd-row-main { flex:1; min-width:0; }
.rd-row.rd-stack { flex-direction:column; gap:.5rem; }
.rd-row.rd-stack .rd-badge { align-self:flex-start; }
.rd-row-text { font-size:.95rem; font-weight:500; line-height:1.45; color:var(--ink); unicode-bidi:plaintext; text-align:start; overflow-wrap:anywhere; }
.rd-row-meta { color:var(--muted); font-size:.8rem; margin-top:.25rem; }
.rd-stars { color:#B7791F; letter-spacing:.04em; }

/* ---------- notices and checklist ---------- */
.rd-note { border-radius:8px; padding:.6rem .85rem; margin:.5rem 0; font-size:.875rem; font-weight:500; }
.rd-warn { background:#FFF7E6; border:1px solid #F3D08A; color:#7A4B00; }
.rd-ok { background:#ECF8F2; border:1px solid #BDE5D0; color:#14633F; }
.rd-check { display:flex; gap:.6rem; align-items:flex-start; padding:.3rem 0; }
.rd-box { width:16px; height:16px; border:2px solid #9CA3AF; border-radius:4px; margin-top:.2rem; flex:none; }

/* ---------- empty state ---------- */
.rd-steps { display:grid; grid-template-columns:repeat(3,1fr); gap:.8rem; margin:.4rem 0 1rem 0; }
.rd-step { background:rgba(255,255,255,.9); border:1px solid var(--line); border-radius:16px; padding:1rem 1.1rem; box-shadow:var(--shadow-sm); }
.rd-step span { display:inline-flex; width:26px; height:26px; border-radius:999px; background:var(--accent); color:#fff; font-weight:700; font-size:.85rem; align-items:center; justify-content:center; margin-bottom:.45rem; }
.rd-step b { display:block; font-size:.95rem; color:var(--ink); }
.rd-step p { margin:.2rem 0 0 0; color:var(--muted); font-size:.85rem; line-height:1.5; }

/* ---------- autopilot ---------- */
.rd-status-bar { display:flex; flex-wrap:wrap; gap:.5rem; margin:.2rem 0 1rem 0; }
.rd-status { display:inline-flex; align-items:center; gap:.45rem; padding:.42rem .82rem; border-radius:999px; font-size:.76rem; font-weight:700; border:1px solid var(--line); background:#fff; color:var(--body); box-shadow:0 2px 7px rgba(21,48,82,.04); }
.rd-status i { width:8px; height:8px; border-radius:50%; background:#9CA3AF; }
.rd-s-ok { background:#ECF8F2; border-color:#BDE5D0; color:#14633F; } .rd-s-ok i { background:var(--reply); }
.rd-s-warn { background:#FFF7E6; border-color:#F3D08A; color:#7A4B00; } .rd-s-warn i { background:#E0A100; }
.rd-s-stop { background:#FEF3F2; border-color:#FBD5D0; color:#9B2C1F; } .rd-s-stop i { background:var(--hold); }
.rd-lane { background:rgba(255,255,255,.9); border:1px solid var(--line); border-top:4px solid var(--c); border-radius:15px; padding:.9rem 1rem; margin-bottom:.8rem; box-shadow:var(--shadow-sm); }
.rd-lane-top { display:flex; align-items:center; justify-content:space-between; }
.rd-lane-title { font-weight:700; font-size:.95rem; color:var(--ink); }
.rd-lane-count { min-width:24px; text-align:center; font-weight:700; font-size:.8rem; color:#fff; background:var(--c); border-radius:999px; padding:.1rem .5rem; }
.rd-lane-cap { color:var(--muted); font-size:.8rem; margin-top:.2rem; }
.rd-count { display:inline-flex; align-items:center; gap:.3rem; font-size:.75rem; font-weight:600; color:#14633F; background:#ECF8F2; border:1px solid #BDE5D0; border-radius:6px; padding:.15rem .6rem; }
.rd-count.rd-due { color:#7A4B00; background:#FFF7E6; border-color:#F3D08A; }

/* ---------- controls ---------- */
[data-testid="stBaseButton-primary"] { background:linear-gradient(135deg,var(--accent),#285A9A); border:0; border-radius:11px; font-weight:700; padding:.58rem 1.35rem; box-shadow:0 6px 14px rgba(23,59,103,.18); transition:transform .18s ease,box-shadow .18s ease; }
[data-testid="stBaseButton-primary"]:hover { transform:translateY(-1px); box-shadow:0 9px 18px rgba(23,59,103,.24); }
[data-testid="stBaseButton-secondary"] { border-radius:11px; font-weight:600; border:1px solid var(--line); background:rgba(255,255,255,.9); }
[data-testid="stBaseButton-secondary"]:hover { border-color:var(--focus); color:var(--accent); background:#F4F8FE; }
[data-testid="stExpander"] { border:1px solid var(--line); border-radius:13px; background:rgba(255,255,255,.74); overflow:hidden; }
.stDownloadButton > button { border-radius:11px; font-weight:700; }
.stProgress > div > div { background:linear-gradient(90deg,var(--accent-2),#63A4FF); }
.rd-kicker + .rd-headline { text-wrap:balance; }
.rd-foot { margin:2rem 0 0 0; padding-top:1rem; border-top:1px solid var(--line); color:var(--muted); font-size:.8rem; line-height:1.6; }

@media (max-width: 640px) {
  .block-container { padding:2.4rem .85rem 2.5rem .85rem; }
  .rd-pill { display:none; } .rd-name { font-size:1.35rem; }
  .rd-headline { font-size:1.1rem; } .rd-steps { grid-template-columns:1fr; }
  .rd-sum b { font-size:1.4rem; } .rd-sum { padding:.5rem .8rem; }
  .rd-row { flex-direction:column; gap:.55rem; }
  [class*="st-key-card_"], [class*="st-key-panel_"] { padding:.9rem .95rem 1rem .95rem; }
}
"""

# tiny inline icons (stroke = currentColor)
_ICONS = {
    "Reply": '<path d="M5 13l4 4L19 7"/>',
    "Check facts": '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
    "Hold": '<path d="M9 6.5v11M15 6.5v11"/>',
    "Report": '<path d="M6 4v16M6 5h11l-2.5 4 2.5 4H6"/>',
}


def _icon(label):
    body = _ICONS.get(label, _ICONS["Check facts"])
    return (f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" '
            f'stroke-linecap="round" stroke-linejoin="round">{body}</svg>')


def inject_css():
    st.markdown(f"<style>{CSS}</style>", unsafe_allow_html=True)


def logo_svg(class_name):
    """Return the static ReviewDesk mark for the app's HTML surfaces."""
    return (
        f'<svg class="{class_name}" viewBox="0 0 128 128" role="img" aria-label="ReviewDesk logo">'
        '<rect width="128" height="128" rx="30" fill="#102D52"/>'
        '<rect x="22" y="22" width="35" height="35" rx="10" fill="#5E9BFF"/>'
        '<rect x="71" y="22" width="35" height="35" rx="10" fill="#FFFFFF" fill-opacity=".18"/>'
        '<rect x="22" y="71" width="35" height="35" rx="10" fill="#FFFFFF" fill-opacity=".18"/>'
        '<rect x="71" y="71" width="35" height="35" rx="10" fill="#2C6BED"/>'
        '<path d="m78 88 8 8 17-19" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="7"/>'
        '</svg>'
    )


def header(legend=None):
    logo = logo_svg("rd-logo")
    """Hero banner. legend: optional list of (label, color) shown as colored dots."""
    legend = legend or [("Reply", "#1B8A5A"), ("Check facts", "#B7791F"), ("Hold", "#C0392B"), ("Report", "#5F6B7A")]
    dots = "".join(f'<span><i style="background:{esc(c)}"></i>{esc(l)}</span>' for l, c in legend)
    st.markdown(
        f'<div class="rd-hero"><div class="rd-hero-left">{logo}'
        '<div><div class="rd-name">ReviewDesk</div><div class="rd-tag">Know when not to reply.</div></div></div>'
        f'<div class="rd-hero-right"><div class="rd-pill">You decide what gets posted</div><div class="rd-legend">{dots}</div></div></div>',
        unsafe_allow_html=True,
    )


def sidebar_intro():
    st.markdown(
        f'<div class="rd-side-intro">{logo_svg("rd-side-mark")}'
        '<span class="rd-side-name">ReviewDesk</span>'
        '<p class="rd-side-copy">A calm workspace for deciding what deserves a reply.</p></div>',
        unsafe_allow_html=True,
    )


def demo_banner(text="Demo mode: nothing is sent to Google"):
    st.markdown(f'<div class="rd-demo"><span class="rd-dot"></span>{esc(text)}</div>', unsafe_allow_html=True)


def title(text, sub=""):
    sub_html = f'<div class="rd-sub">{esc(sub)}</div>' if sub else ""
    st.markdown(f'<div class="rd-title">{esc(text)}</div>{sub_html}', unsafe_allow_html=True)


def label(text):
    st.markdown(f'<div class="rd-label">{esc(text)}</div>', unsafe_allow_html=True)


def text_block(text, muted=False):
    cls = "rd-text rd-muted" if muted else "rd-text"
    st.markdown(f'<div class="{cls}" dir="auto">{esc(text)}</div>', unsafe_allow_html=True)


def result_header(style, reason, sentiment="", language="", flags=()):
    chips = []
    if sentiment:
        chips.append(f'<span class="rd-chip">{esc(sentiment).title()}</span>')
    if language and str(language).lower() not in ("unknown", "none"):
        chips.append(f'<span class="rd-chip">{esc(language)}</span>')
    chips += [f'<span class="rd-chip rd-flag">{esc(f).replace("_", " ")}</span>' for f in flags]
    st.markdown(
        f'<div class="rd-banner" style="--c:{esc(style["color"])}"><span class="rd-ico">{_icon(style["label"])}</span>'
        f'<div><div class="rd-kicker">{esc(style["label"])}</div><div class="rd-headline">{esc(style.get("headline", ""))}</div></div></div>'
        f'<div class="rd-reason" dir="auto">{esc(reason)}</div>'
        f'<div class="rd-chips">{"".join(chips)}</div>',
        unsafe_allow_html=True,
    )


def summary(total, counts, style_map, order):
    chips = "".join(
        f'<span class="rd-sum" style="--c:{esc(style_map[a]["color"])}"><b>{counts[a]}</b>{esc(style_map[a]["label"])}</span>'
        for a in order if counts.get(a)
    )
    st.markdown(
        f'<div class="rd-summary"><div class="rd-sum-title">{total} reviews analyzed</div>'
        f'<div class="rd-sum-row">{chips}</div></div>',
        unsafe_allow_html=True,
    )


def row_head(style, text, reason, stars=0, language="", flags=(), stacked=False):
    snippet = str(text or "")
    snippet = snippet[:140] + ("..." if len(snippet) > 140 else "")
    try:
        n = max(0, min(5, int(stars)))
    except (TypeError, ValueError):
        n = 0
    star_html = f'<span class="rd-stars">{"★" * n}{"☆" * (5 - n)}</span> &nbsp;' if n else ""
    meta = f'{star_html}{esc(language)}' if language else star_html
    flag_html = "".join(f'<span class="rd-chip rd-flag">{esc(f).replace("_", " ")}</span>' for f in flags)
    st.markdown(
        f'<div class="rd-row{" rd-stack" if stacked else ""}"><span class="rd-badge" style="background:{esc(style["color"])}">{esc(style["label"])}</span>'
        f'<div class="rd-row-main"><div class="rd-row-text" dir="auto">{esc(snippet) or "(no text)"}</div>'
        f'<div class="rd-row-meta">{meta}</div>'
        f'<div class="rd-reason" style="font-size:.9rem;margin-top:.5rem">{esc(reason)}</div>'
        f'<div class="rd-chips">{flag_html}</div></div></div>',
        unsafe_allow_html=True,
    )


def notice(kind, text):
    cls = "rd-ok" if kind == "ok" else "rd-warn"
    icon = "&#10003;" if kind == "ok" else "&#9888;"
    st.markdown(f'<div class="rd-note {cls}">{icon} {esc(text)}</div>', unsafe_allow_html=True)


def checklist(items):
    rows = "".join(f'<div class="rd-check"><span class="rd-box"></span><span>{esc(i)}</span></div>' for i in items)
    st.markdown(rows, unsafe_allow_html=True)


def empty_state(key_suffix=""):
    st.markdown(
        '<div class="rd-steps">'
        '<div class="rd-step"><span>1</span><b>Paste</b><p>Drop in a customer review, in any language.</p></div>'
        '<div class="rd-step"><span>2</span><b>Decide</b><p>See whether to reply, check facts, hold, or report.</p></div>'
        '<div class="rd-step"><span>3</span><b>You post</b><p>Edit the draft, read the translation, then post it yourself.</p></div>'
        '</div>',
        unsafe_allow_html=True,
    )
    if st.button("Try a sample", key=f"empty_try_sample_{key_suffix}"):
        import os, csv, json
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        samples_path = os.path.join(project_root, "samples.csv")
        cached_path = os.path.join(project_root, "sample_results.json")
        reviews = []
        with open(samples_path, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                try:
                    stars = int(row.get("stars", "").strip() or 0)
                except ValueError:
                    stars = 0
                reviews.append({
                    "stars": stars,
                    "text": row.get("text", "") or "",
                    "language": row.get("language", ""),
                    "expected_action": row.get("expected_action", ""),
                })
        st.session_state.batch_reviews = reviews
        st.session_state.batch_input = "\n".join(
            f"{r['stars']}|{r['text']}" for r in reviews
        )
        if os.path.exists(cached_path):
            with open(cached_path, encoding="utf-8") as f:
                cached = json.load(f)
            results = []
            for entry in cached:
                r = dict(entry.get("result", {}))
                r["_stars"] = entry.get("stars", 0)
                r["_text"] = entry.get("text", "")
                r["_language"] = entry.get("language", "")
                r["_platform"] = entry.get("platform", "Google")
                r["_expected_action"] = entry.get("expected_action", r.get("expected_action", ""))
                results.append(r)
            st.session_state.batch_results = results
            st.session_state.batch_drafts = {}
            st.session_state.batch_overrides = {}
        st.rerun()


# ---------- autopilot helpers ----------
def status_bar(items):
    """items: list of (text, kind) where kind is ok | warn | stop | off."""
    cls = {"ok": "rd-s-ok", "warn": "rd-s-warn", "stop": "rd-s-stop"}
    chips = "".join(f'<span class="rd-status {cls.get(k, "")}"><i></i>{esc(t)}</span>' for t, k in items)
    st.markdown(f'<div class="rd-status-bar">{chips}</div>', unsafe_allow_html=True)


def lane_header(title_text, count, color, caption=""):
    st.markdown(
        f'<div class="rd-lane" style="--c:{esc(color)}"><div class="rd-lane-top"><span class="rd-lane-title">{esc(title_text)}</span>'
        f'<span class="rd-lane-count">{int(count)}</span></div><div class="rd-lane-cap">{esc(caption)}</div></div>',
        unsafe_allow_html=True,
    )


def countdown(minutes_left):
    """Veto countdown chip. Recalculated on every rerun, no ticking timer."""
    if minutes_left <= 0:
        return '<span class="rd-count rd-due">Due now</span>'
    return f'<span class="rd-count">{int(minutes_left)} min left to cancel</span>'


def footer(text="Review text is sent to the model provider. Drafts are suggestions: read every reply and its translation before anything is posted."):
    st.markdown(f'<div class="rd-foot">{esc(text)}</div>', unsafe_allow_html=True)
