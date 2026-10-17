# ReviewDesk — PLAN.md

Goal: Replace the generic Streamlit styling with a distinctive, production-grade review-desk interface while keeping all existing functionality and the demo path intact.

Step being planned: interface redesign (part of 5-build implementation). No AGENTS.md existed; contract created above.

Files:

- `app.py` — Restyle with custom CSS (distinctive typography via Google Fonts, dark-slate + sharp-accent color system, motion/micro-interactions, intentional card layout), redesigned single-review result card, redesigned batch results table with urgency sorting and per-row design. No logic changes; only styling and layout.
- `PLAN.md` — this file.
- `prompts.py` — FROZEN (no changes).

Tasks (each ends runnable, ~45 min or less):

1. Audit current CSS; strip generic Streamlit defaults; implement design-system CSS (typography, color variables, layout, motion) and verify app still starts.
2. Redesign single-review result card: badge prominence, action color blocking, draft editor emphasis, translation/checklist grouping.
3. Redesign batch results table: urgency-sorted rows with per-row action color, expanded draft view, override dropdown styling, summary-line emphasis.
4. Verify: compile, app starts, Roman Urdu complaint + tone switch, CSV export, copy-by-hand all work.
5. Commit (user to push).

Acceptance criteria:

1. [auto] `python -m py_compile app.py` passes with no errors.
2. [auto] `streamlit run app.py` starts and serves on localhost without traceback.
3. [human] Interface does not look like default Streamlit (custom fonts, dark slate, sharp accents).
4. [human] Badge colors match ACTION_STYLE dict keyed by prompts.ACTIONS.
5. [human] Paste Roman Urdu complaint, switch tone, see draft change; translations visible beside draft.
6. [human] CSV export downloads and opens with Urdu/Arabic intact.
7. [human] Phone-width (390px) layout is usable; no horizontal scroll.

Traps:

- Do not touch prompts.py (frozen). Any needed prompt rule/schema change → raise as Question, not a task.
- Do not add logins, database, payments, scraping, Google API, auto-posting, or app-interface translation.
- Protect demo path: urgency sort, Roman Urdu + tone switch, CSV export, copy-by-hand must all keep working.
- html.escape all untrusted content (review text, draft, translations, reason, flags, checklist, report note) before unsafe_allow_html.
- Do not claim anything was posted/sent/reported.

Questions (max 3, with defaults so user can say "yes"):

1. Aesthetic direction: I propose "industrial review desk" — dark slate background, paper-white cards, sharp action-color accents, monospace + display font pairing. Default: yes.
2. Which Google Fonts to pair? Default: "IBM Plex Mono" (monospace, data/terminal feel) + "Plus Jakarta Sans" (display/headings). Default: yes.
3. Keep the two-tab structure (Single review / Batch) or merge into one page? Default: keep two tabs. Default: yes.

Stop point: App runs with the new interface; user can paste a Roman Urdu complaint, switch tone, see the draft change with translation visible, export CSV, and copy the draft by hand. Nothing is committed until the user asks.
