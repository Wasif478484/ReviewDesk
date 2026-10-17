---
doc: scope
status: draft
---

# ReviewDesk

A web app where a local business owner pastes customer reviews and gets back a **decision** for each one, plus a draft reply when a public reply makes sense.

## The Unique Kernel

**The judgment before the writing.** ReviewDesk decides whether to reply, check facts first, hold, or report *before* it writes anything. Generic AI reply writers already exist (and Google is testing its own), so the distinctive part is the "when not to reply" decision — a health claim, a legal threat, or a named staff member gets held or routed to fact-checking instead of answered with a cheerful paragraph that makes things worse.

Missing a risky review is the costliest mistake, so the model leans toward `hold` / check-facts when unsure.

## Who It's For

A freelancer or agency managing reviews for several local clients — they get the most value from batch mode. A single restaurant, salon, or clinic owner uses it just as well.

Today they leave reviews unanswered, or answer all of them with the same generic template.

## The Core Loop

Open the app → paste a review (and set up the business once) → get an action badge, a one-sentence reason, and where relevant an editable draft with warnings → edit, copy, and paste into the platform by hand.

The app never posts or reports anything itself. The owner stays in control.

## Inspiration & Identity

The triage table is the visual hook: a summary line ("12 reviews: 7 reply, 2 check facts, 2 hold, 1 report") and rows sorted by urgency, holds first. Calm, legible, colour-coded by action. Nothing that looks like a marketing page.

## Why This Matters to the Learner

Unverified — to be captured from the learner in `1-start`.

## What "Working" Looks Like

Paste one Roman Urdu complaint → get a Roman Urdu draft with an English translation beside it so the owner can verify it. Then hit the sample button and watch 15 reviews across Google, Yelp, Facebook, and TripAdvisor land in a table sorted holds-first, with drafts editable and a CSV export.

The "oh, that's cool" beat: switching a review's tone rewrites the draft while keeping the facts and commitments identical.

## The POC Boundary

In: one review and batch mode; the four-action triage; drafts in the reviewer's language with owner-language translations; a draft checker for unapproved offers, invented phone numbers, and stock phrases; tone/language rewrite; action override; CSV export; a one-click sample set of 15 reviews.

## Later

Deploying to a hosted URL. Google Business Profile API integration. More platforms. A better batch queue for large accounts.

## Explicitly Cut

- **Auto-posting or auto-reporting** — the owner posts by hand; this keeps the product safe and keeps platform terms intact.
- **Scraping review sites** — brittle and against most platforms' terms.
- **Logins, payments, multi-user teams, analytics dashboards** — out of time budget for a proof of concept.
- **Structured CSS files / a build step** — Streamlit's `st.markdown` + `unsafe_allow_html` covers the styling for a proof of concept.