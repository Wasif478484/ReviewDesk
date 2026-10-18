"""ui.py: ReviewDesk look and feel. CSS plus small HTML helpers. No model logic.

Needs Streamlit 1.40 or newer (uses st.container(key=...)).
Every piece of untrusted text goes through esc() before it enters HTML.

Design language: "The Owner's Desk" — a warm editorial workspace.
Paper surfaces, ink typography (Fraunces serif display + Inter body +
JetBrains Mono ledgers), rubber-stamp action badges, and dashed ledger rules.
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
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..800;1,9..144,400..700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap');

:root {
  --paper:#F6F3EB; --card:#FFFDF7; --card-2:#FBF8F0;
  --ink:#211E16; --body-c:#4E4939; --muted:#8B8471;
  --line:#E4DECC; --line-strong:#CDC5AC;
  --accent:#1E5B4F; --accent-soft:#E6EFEA;
  --reply:#1F7A5C; --reply-wash:#EAF4EE;
  --check:#9A6A12; --check-wash:#F9F1DC;
  --hold:#B3402E; --hold-wash:#F9E9E3;
  --report:#66604D; --report-wash:#EFEBDF;
  --wash:#F3EFE4;
  --font-display:'Fraunces',Georgia,'Times New Roman',serif;
  --font-mono:'JetBrains Mono',ui-monospace,'SFMono-Regular',Menlo,monospace;
  --shadow-sm:0 1px 2px rgba(64,54,32,.05),0 3px 12px rgba(64,54,32,.06);
  --shadow:0 2px 5px rgba(64,54,32,.07),0 12px 28px rgba(64,54,32,.10);
}

/* ---------- base ---------- */
html, body, .stApp, [class*="css"] { font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif; color:var(--body-c); }
.stApp {
  background:
    radial-gradient(circle at 12% 6%, rgba(30,91,79,.055) 0, transparent 30rem),
    radial-gradient(circle at 92% -4%, rgba(179,64,46,.05) 0, transparent 26rem),
    radial-gradient(rgba(33,30,22,.035) 1px, transparent 1.4px),
    var(--paper);
  background-size:auto, auto, 23px 23px, auto;
  background-attachment:fixed;
}
.block-container { max-width:1160px; padding-top:1.9rem; padding-bottom:4rem; }
[data-testid="stToolbar"], #MainMenu, footer { display:none !important; }
header[data-testid="stHeader"] { background:transparent; }
h1,h2,h3,h4 { color:var(--ink); letter-spacing:-.01em; }
.stMarkdown strong { color:var(--ink); }
.stMarkdown hr { border:none !important; border-top:1px dashed var(--line-strong) !important; margin:1.5rem 0 !important; }

/* ---------- sidebar ---------- */
[data-testid="stSidebar"] { background:linear-gradient(180deg,#FBF9F2 0%,#F3EFE3 100%); border-right:1px solid var(--line); }
[data-testid="stSidebar"] h3 { display:none; }
[data-testid="stSidebar"] label p { font-size:.8rem; font-weight:500; color:var(--body-c); }
[data-testid="stSidebar"] [data-testid="stExpander"] { border:1px solid var(--line); border-radius:12px; background:rgba(255,253,247,.72); }
.rd-side-intro { padding:.2rem 0 1.05rem; }
.rd-side-mark { display:inline-block; vertical-align:middle; width:38px; height:38px; border-radius:10px; box-shadow:0 6px 14px rgba(30,91,79,.24); }
.rd-side-name { display:inline-block; margin-left:.6rem; vertical-align:middle; font-family:var(--font-display); color:var(--ink); font-size:1.1rem; font-weight:600; letter-spacing:-.01em; }
.rd-side-copy { margin:.7rem 0 0; color:var(--muted); font-size:.78rem; line-height:1.55; }

/* ---------- masthead hero ---------- */
.rd-mast { position:relative; overflow:hidden; border-radius:18px; padding:1.85rem 2.3rem 1.5rem; margin:0 0 1.3rem 0;
  background:radial-gradient(900px 340px at 88% -20%, rgba(31,122,92,.30) 0, transparent 62%), linear-gradient(180deg,#262319 0%,#1B1912 100%);
  border:1px solid rgba(33,30,22,.9); box-shadow:var(--shadow); color:#F6F3EB; }
.rd-mast:before { content:"\\201D"; position:absolute; right:.2rem; top:-5.2rem; font-family:var(--font-display); font-style:italic; font-weight:700;
  font-size:19rem; line-height:1; color:rgba(246,243,235,.065); pointer-events:none; }
.rd-mast-in { display:flex; align-items:center; justify-content:space-between; gap:2rem; flex-wrap:wrap; position:relative; }
.rd-mast-left { display:flex; align-items:center; gap:1.05rem; }
.rd-logo { width:56px; height:56px; border-radius:14px; display:block; box-shadow:0 10px 22px rgba(0,0,0,.35); }
.rd-mast-kicker { font-family:var(--font-mono); font-size:.66rem; font-weight:600; letter-spacing:.22em; text-transform:uppercase; color:rgba(246,243,235,.52); }
.rd-name { font-family:var(--font-display); font-size:2.05rem; font-weight:600; letter-spacing:-.015em; line-height:1.12; color:#F6F3EB; margin-top:.14rem; }
.rd-tag { font-family:var(--font-display); font-style:italic; font-size:1rem; color:rgba(246,243,235,.68); margin-top:.12rem; }
.rd-mast-right { display:flex; flex-direction:column; align-items:flex-end; gap:.65rem; }
.rd-pill { font-family:var(--font-mono); font-size:.66rem; font-weight:600; letter-spacing:.09em; text-transform:uppercase; color:#E9E4D2;
  background:rgba(246,243,235,.08); border:1px solid rgba(246,243,235,.22); border-radius:999px; padding:.45rem .95rem; }
.rd-legend { display:flex; gap:1rem; flex-wrap:wrap; font-family:var(--font-mono); font-size:.68rem; color:rgba(246,243,235,.62); }
.rd-legend i { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:.35rem; }
.rd-mast-rule { margin-top:1.25rem; height:5px; border-top:2px solid rgba(246,243,235,.55); border-bottom:1px solid rgba(246,243,235,.26); }

/* ---------- demo strip ---------- */
.rd-demo { display:flex; align-items:center; gap:.55rem; background:#FBF3DC; border:1px solid #E8D9A8; color:#7A5212; border-radius:10px;
  padding:.55rem .85rem; font-size:.8rem; font-weight:600; margin:0 0 1rem 0; box-shadow:0 2px 8px rgba(160,120,30,.07); }
.rd-dot { width:8px; height:8px; border-radius:50%; background:#D9A62E; }
[data-testid="stAlert"] { border-radius:12px; font-size:.88rem; }

/* ---------- tabs as segmented control ---------- */
[data-testid="stTabs"] > div[data-orientation] { border-bottom:none !important; box-shadow:none !important; }
[data-testid="stTabs"] [role="tablist"], div[data-baseweb="tab-list"] { gap:.35rem; background:#EFEADC; border:1px solid var(--line) !important;
  border-radius:12px; padding:.32rem; width:fit-content; max-width:100%; box-shadow:inset 0 1px 3px rgba(64,54,32,.07); }
[data-testid="stTab"], button[data-baseweb="tab"] { border-radius:9px; padding:.5rem 1.05rem; height:auto; background:transparent; transition:all .16s ease; }
[data-testid="stTab"] p, button[data-baseweb="tab"] p { color:#6B6450; font-weight:600; font-size:.88rem; }
[data-testid="stTab"]:hover p, button[data-baseweb="tab"]:hover p { color:var(--ink); }
[data-testid="stTab"][aria-selected="true"], button[data-baseweb="tab"][aria-selected="true"] { background:var(--ink); box-shadow:0 3px 10px rgba(33,30,22,.30); }
[data-testid="stTab"][aria-selected="true"] p, button[data-baseweb="tab"][aria-selected="true"] p { color:#F6F3EB; }
.react-aria-SelectionIndicator, div[data-baseweb="tab-highlight"], div[data-baseweb="tab-border"] { display:none !important; }

/* ---------- labels and text ---------- */
.rd-label { font-family:var(--font-mono); font-size:.66rem; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:var(--muted);
  margin:1.05rem 0 .45rem 0; display:flex; align-items:center; gap:.55rem; }
.rd-label:before { content:""; width:20px; height:1px; background:var(--line-strong); }
.rd-title { font-family:var(--font-display); font-size:1.62rem; font-weight:600; color:var(--ink); letter-spacing:-.012em; margin:.2rem 0 .18rem 0; }
.rd-sub { color:var(--muted); font-size:.9rem; margin:0 0 .45rem 0; }
.rd-text { background:var(--card-2); border:1px solid var(--line); border-radius:12px; padding:.9rem 1.05rem; font-size:.95rem; line-height:1.65;
  white-space:pre-wrap; unicode-bidi:plaintext; text-align:start; color:var(--ink); }
.rd-muted { color:#5E5847; }
.stTextArea textarea { unicode-bidi:plaintext; text-align:start; line-height:1.6; }
.rd-hint { font-family:var(--font-mono); font-size:.64rem; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-top:.55rem; line-height:1.7; }

/* ---------- inputs ---------- */
[data-testid="stTextAreaRootElement"], [data-testid="stTextInputRootElement"], [data-testid="stSelectbox"] [role="group"], [data-testid="stNumberInputContainer"],
div[data-baseweb="input"], div[data-baseweb="textarea"], div[data-baseweb="select"] > div { background:#FFFEFA !important; border:1px solid var(--line-strong) !important; border-radius:10px !important; }
[data-testid="stTextAreaRootElement"]:focus-within, [data-testid="stTextInputRootElement"]:focus-within, [data-testid="stSelectbox"] [role="group"]:focus-within,
div[data-baseweb="input"]:focus-within, div[data-baseweb="textarea"]:focus-within, div[data-baseweb="select"] > div:focus-within { border-color:var(--accent) !important; box-shadow:0 0 0 3px rgba(31,122,92,.14) !important; }
div[data-baseweb="base-input"] { background:transparent !important; }

/* ---------- panels and cards ---------- */
[class*="st-key-panel_"] { background:rgba(255,253,247,.92); border:1px solid var(--line); border-radius:16px; padding:1.3rem 1.4rem; margin-bottom:1rem; box-shadow:var(--shadow-sm); }
[class*="st-key-card_"] { background:var(--card); border:1px solid var(--line); border-left:4px solid var(--line-strong); border-radius:14px; padding:1.05rem 1.25rem;
  margin-bottom:.85rem; box-shadow:var(--shadow-sm); transition:transform .16s ease,box-shadow .16s ease; }
[class*="st-key-card_"]:hover { transform:translateY(-2px); box-shadow:var(--shadow); }
[class*="st-key-card_reply_needs_owner"] { border-left-color:var(--check); }
[class*="st-key-card_reply_"]:not([class*="needs_owner"]) { border-left-color:var(--reply); }
[class*="st-key-card_hold"] { border-left-color:var(--hold); }
[class*="st-key-card_report"] { border-left-color:var(--report); }

/* ---------- result banner ---------- */
.rd-banner { display:flex; align-items:center; gap:.95rem; padding:1.05rem 1.2rem; border-radius:14px;
  background:linear-gradient(0deg, var(--wash,#F3EFE4), var(--wash,#F3EFE4)), #FFFDF7;
  border:1px solid color-mix(in srgb, var(--c, var(--accent)) 26%, #E4DECC); border-left:4px solid var(--c, var(--accent)); }
.rd-ico { flex:none; width:44px; height:44px; border-radius:50%; background:color-mix(in srgb, var(--c) 10%, #FFFDF7); color:var(--c);
  border:1px solid color-mix(in srgb, var(--c) 32%, transparent); display:flex; align-items:center; justify-content:center; }
.rd-ico svg { width:21px; height:21px; }
.rd-kicker { font-family:var(--font-mono); font-size:.66rem; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:var(--c, var(--accent)); }
.rd-headline { font-family:var(--font-display); font-size:1.5rem; font-weight:600; letter-spacing:-.01em; color:var(--ink); line-height:1.18; margin-top:.14rem; }
.rd-stamp { flex:none; margin-left:auto; font-family:var(--font-mono); font-size:.7rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
  color:var(--c); border:2px solid color-mix(in srgb, var(--c) 62%, transparent); outline:1px dashed color-mix(in srgb, var(--c) 42%, transparent);
  outline-offset:-6px; border-radius:9px; padding:.5rem .85rem; background:color-mix(in srgb, var(--c) 7%, transparent); transform:rotate(-2deg); }
.rd-reason { margin:.75rem 0 .15rem 0; font-size:.95rem; line-height:1.62; color:var(--body-c); unicode-bidi:plaintext; text-align:start; }
.rd-chips { display:flex; flex-wrap:wrap; gap:.38rem; margin-top:.55rem; }
.rd-chip { font-size:.71rem; font-weight:600; color:#5E5847; background:#F3EFE4; border:1px solid var(--line); border-radius:999px; padding:.22rem .65rem; }
.rd-chip.rd-flag { background:var(--hold-wash); border-color:#EBC9BD; color:#8E321F; }

/* ---------- batch summary ---------- */
.rd-summary { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:1rem 1.2rem; margin:.4rem 0 1rem 0; box-shadow:var(--shadow-sm); }
.rd-sum-title { font-family:var(--font-mono); font-size:.66rem; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); margin-bottom:.55rem; }
.rd-sum-row { display:flex; flex-wrap:wrap; gap:.6rem; }
.rd-sum { display:flex; align-items:baseline; gap:.45rem; padding:.55rem .95rem; border-radius:10px;
  background:color-mix(in srgb, var(--c) 9%, #FFFDF7); border:1px solid color-mix(in srgb, var(--c) 24%, #E4DECC);
  font-family:var(--font-mono); font-size:.68rem; font-weight:600; letter-spacing:.06em; text-transform:uppercase;
  color:color-mix(in srgb, var(--c) 80%, #211E16); }
.rd-sum b { font-family:var(--font-display); font-size:1.55rem; font-weight:600; line-height:1; color:var(--c); }

/* ---------- batch rows ---------- */
.rd-row { display:flex; gap:.85rem; align-items:flex-start; }
.rd-row-main { flex:1; min-width:0; }
.rd-row.rd-stack { flex-direction:column; gap:.5rem; }
.rd-row.rd-stack .rd-badge { align-self:flex-start; }
.rd-row-text { font-size:.95rem; font-weight:500; line-height:1.45; color:var(--ink); unicode-bidi:plaintext; text-align:start; overflow-wrap:anywhere; }
.rd-row-meta { color:var(--muted); font-size:.8rem; margin-top:.25rem; }
.rd-badge { display:inline-block; flex:none; padding:.3rem .68rem; border-radius:7px; color:#FFFDF7; font-family:var(--font-mono); font-weight:700;
  font-size:.66rem; letter-spacing:.12em; text-transform:uppercase; box-shadow:inset 0 0 0 1px rgba(255,255,255,.18); }
.rd-stars { color:#9A6A12; letter-spacing:.05em; }

/* ---------- notices and checklist ---------- */
.rd-note { border-radius:10px; padding:.62rem .9rem; margin:.5rem 0; font-size:.875rem; font-weight:500; }
.rd-warn { background:#FBF3DC; border:1px solid #E8D9A8; color:#7A5212; }
.rd-ok { background:#EAF4EE; border:1px solid #C4E0CE; color:#17503B; }
.rd-check { display:flex; gap:.6rem; align-items:flex-start; padding:.32rem 0; }
.rd-box { width:16px; height:16px; border:2px dashed #A79F8A; border-radius:5px; margin-top:.2rem; flex:none; background:rgba(255,253,247,.6); }

/* ---------- empty state ---------- */
.rd-steps { display:grid; grid-template-columns:repeat(3,1fr); gap:.9rem; margin:.5rem 0 1.1rem 0; }
.rd-step { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:1.05rem 1.15rem; box-shadow:var(--shadow-sm); }
.rd-step span { display:inline-block; font-family:var(--font-display); font-style:italic; font-weight:600; font-size:1.9rem; line-height:1;
  color:var(--accent); border-bottom:2px solid var(--line-strong); padding-bottom:.3rem; margin-bottom:.6rem; }
.rd-step b { display:block; font-size:.96rem; color:var(--ink); }
.rd-step p { margin:.25rem 0 0 0; color:var(--muted); font-size:.85rem; line-height:1.55; }

/* ---------- autopilot ---------- */
.rd-status-bar { display:flex; flex-wrap:wrap; gap:.5rem; margin:.2rem 0 1rem 0; }
.rd-status { display:inline-flex; align-items:center; gap:.5rem; padding:.44rem .85rem; border-radius:999px; font-family:var(--font-mono);
  font-size:.7rem; font-weight:600; border:1px solid var(--line); background:var(--card); color:var(--body-c); box-shadow:0 1px 4px rgba(64,54,32,.05); }
.rd-status i { width:8px; height:8px; border-radius:50%; background:#A79F8A; }
.rd-s-ok { background:#EAF4EE; border-color:#C4E0CE; color:#17503B; } .rd-s-ok i { background:var(--reply); }
.rd-s-warn { background:#FBF3DC; border-color:#E8D9A8; color:#7A5212; } .rd-s-warn i { background:#C99A2E; }
.rd-s-stop { background:#F9E9E3; border-color:#EBC9BD; color:#8E321F; } .rd-s-stop i { background:var(--hold); }
.rd-lane { background:var(--card); border:1px solid var(--line); border-top:3px solid var(--c); border-radius:14px; padding:.95rem 1.1rem;
  margin-bottom:.85rem; box-shadow:var(--shadow-sm); }
.rd-lane-top { display:flex; align-items:center; justify-content:space-between; }
.rd-lane-title { font-family:var(--font-display); font-weight:600; font-size:1.08rem; color:var(--ink); }
.rd-lane-count { min-width:26px; text-align:center; font-family:var(--font-mono); font-weight:700; font-size:.78rem; color:#FFFDF7; background:var(--c); border-radius:999px; padding:.12rem .55rem; }
.rd-lane-cap { color:var(--muted); font-size:.8rem; margin-top:.25rem; }
.rd-count { display:inline-flex; align-items:center; gap:.35rem; font-family:var(--font-mono); font-size:.7rem; font-weight:600; color:#17503B;
  background:#EAF4EE; border:1px solid #C4E0CE; border-radius:7px; padding:.18rem .6rem; }
.rd-count.rd-due { color:#7A5212; background:#FBF3DC; border-color:#E8D9A8; }

/* ---------- controls ---------- */
[data-testid="stBaseButton-primary"] { background:linear-gradient(180deg,#2E2A20,#1B1912); color:#F6F3EB; border:0; border-radius:10px; font-weight:600;
  padding:.58rem 1.35rem; box-shadow:0 4px 12px rgba(33,30,22,.22); transition:transform .16s ease,box-shadow .16s ease; }
[data-testid="stBaseButton-primary"] p { color:#F6F3EB; }
[data-testid="stBaseButton-primary"]:hover { transform:translateY(-1px); box-shadow:0 8px 18px rgba(33,30,22,.30); }
[data-testid="stBaseButton-secondary"] { border-radius:10px; font-weight:600; border:1px solid var(--line-strong); background:#FFFEFA; color:var(--ink); }
[data-testid="stBaseButton-secondary"]:hover { border-color:#8B8471; background:#FBF8F0; color:var(--ink); }
[data-testid="stExpander"] { border:1px solid var(--line); border-radius:12px; background:rgba(255,253,247,.8); overflow:hidden; }
.stDownloadButton > button { border-radius:10px; font-weight:600; border:1px solid var(--line-strong); background:#FFFEFA; color:var(--ink); }
.stProgress > div > div { background:linear-gradient(90deg,var(--accent),#3E8A72); }
.rd-kicker + .rd-headline { text-wrap:balance; }
.rd-foot { margin:2.2rem 0 0 0; padding-top:1.05rem; border-top:1px dashed var(--line-strong); color:var(--muted); font-size:.8rem; line-height:1.6; }

@media (max-width: 640px) {
  .block-container { padding:2.4rem .85rem 2.5rem .85rem; }
  .rd-pill { display:none; } .rd-name { font-size:1.5rem; }
  .rd-headline { font-size:1.15rem; } .rd-steps { grid-template-columns:1fr; }
  .rd-sum b { font-size:1.4rem; } .rd-sum { padding:.5rem .8rem; }
  .rd-row { flex-direction:column; gap:.55rem; }
  .rd-stamp { margin-left:0; }
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
    return (f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
            f'stroke-linecap="round" stroke-linejoin="round">{body}</svg>')


def inject_css():
    st.markdown(f"<style>{CSS}</style>", unsafe_allow_html=True)


def logo_svg(class_name):
    """Return the static ReviewDesk mark for the app's HTML surfaces."""
    return (
        f'<svg class="{class_name}" viewBox="0 0 128 128" role="img" aria-label="ReviewDesk logo">'
        '<rect width="128" height="128" rx="28" fill="#1E5B4F"/>'
        '<rect x="26" y="28" width="76" height="52" rx="14" fill="rgba(246,243,235,.16)"/>'
        '<path d="M46 78v18l20-18z" fill="rgba(246,243,235,.16)"/>'
        '<path d="m48 54 11 11 22-24" fill="none" stroke="#F6F3EB" stroke-linecap="round" stroke-linejoin="round" stroke-width="9"/>'
        '</svg>'
    )


def header(legend=None):
    """Masthead banner. legend: optional list of (label, color) shown as colored dots."""
    logo = logo_svg("rd-logo")
    legend = legend or [("Reply", "#1F7A5C"), ("Check facts", "#9A6A12"), ("Hold", "#B3402E"), ("Report", "#66604D")]
    dots = "".join(f'<span><i style="background:{esc(c)}"></i>{esc(l)}</span>' for l, c in legend)
    st.markdown(
        f'<div class="rd-mast"><div class="rd-mast-in"><div class="rd-mast-left">{logo}'
        '<div><div class="rd-mast-kicker">The owner&#8217;s triage desk</div>'
        '<div class="rd-name">ReviewDesk</div><div class="rd-tag">Know when not to reply.</div></div></div>'
        f'<div class="rd-mast-right"><div class="rd-pill">You decide what gets posted</div><div class="rd-legend">{dots}</div></div></div>'
        '<div class="rd-mast-rule"></div></div>',
        unsafe_allow_html=True,
    )


def sidebar_intro():
    st.markdown(
        f'<div class="rd-side-intro">{logo_svg("rd-side-mark")}'
        '<span class="rd-side-name">ReviewDesk</span>'
        '<p class="rd-side-copy">A calm desk for deciding what deserves a reply.</p></div>',
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
    wash = style.get("wash", "#F3EFE4")
    st.markdown(
        f'<div class="rd-banner" style="--c:{esc(style["color"])};--wash:{esc(wash)}"><span class="rd-ico">{_icon(style["label"])}</span>'
        f'<div><div class="rd-kicker">Triage result</div><div class="rd-headline">{esc(style.get("headline", ""))}</div></div>'
        f'<span class="rd-stamp">{esc(style["label"])}</span></div>'
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
