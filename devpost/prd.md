---
doc: prd
status: draft
---

# ReviewDesk — Product Requirements

A web app where a local business owner pastes customer reviews and gets a decision for each one, plus an editable draft when a public reply makes sense. It never posts or reports anything itself.
Source: `scope.md > The Unique Kernel`, `scope.md > The Core Loop`.

## The Core Journey

1. Owner opens the app and fills in the business setup once in the sidebar (name, type, owner name, sign-off, optional contact line, allowed offers, default language, default tone, review platform).
2. Owner switches to the **Single review** tab, picks a star rating, pastes the review text, optionally picks a language and tone, and clicks **Analyze**.
3. The result card appears: a colour-coded action badge, sentiment, flag chips, and a one-sentence reason.
4. For `reply` and `reply_needs_owner`, an editable draft appears with a word count, a copy button, an owner checklist, and yellow warnings if the draft breaks a rule. The owner may also switch language/tone and press **Rewrite**.
5. For `hold`, no draft is offered — only an owner checklist. For `report`, a short note the owner pastes into the platform's own report flow.
6. In **Batch** mode the owner pastes reviews one per line, uploads a CSV, or loads the 15 samples, then clicks **Analyze batch**.
7. A progress bar runs, then a summary line and an urgency-sorted table appear (holds first, then check-facts, then reports, then replies), each row expandable for editing with an action-override dropdown.
8. Owner downloads the whole table as CSV and pastes the drafts into each platform by hand.

## Screens and Layout

- **Sidebar** — business setup. Always visible.
- **Tab: Single review** — star rating, review textarea, language/tone, Analyze button, result card.
- **Tab: Batch** — sample-data button, CSV upload, reviews textarea, progress bar, summary line, urgency-sorted result table, CSV download.

## Look and Feel

Calm and legible, not a marketing page. One consistent colour system tied to the four actions (green reply, amber check-facts, red hold, grey report) carried in a single style dict. Readable cards, sensible spacing, clear empty states, and a layout that works on a phone. The urgency sort and summary line are the main visual hooks.

## Features and Behavior

### Single review

Owner picks stars, pastes text, clicks Analyze. The card shows the action badge, sentiment, flags, and reason. Drafts are editable inline; the word count shows against the 30–80 target. A copy button downloads the draft text. A Rewrite control changes language and/or tone while keeping every fact and commitment identical.

### Triage decision

Exactly one of `reply`, `reply_needs_owner`, `hold`, `report`. A genuine complaint is never labelled a report, however harsh. When the model is unsure about risk, it leans toward hold or check-facts.

### Multilingual drafts

Drafts are written in the reviewer's language (or the chosen language), with a faithful translation into the owner's language so the owner can verify before posting. Any language name is accepted; the dropdown offers suggestions only.

### Draft checker

Runs on the edited draft and its owner-language translation. Flags unapproved offers, phone-like numbers not in the contact line, over-length drafts, and stock phrases. An empty problem list means the draft looks clean.

### Owner checklist

Short things to check or do, in the owner's language — e.g. for a health/legal claim: don't reply publicly yet, check kitchen records, contact the customer privately.

### Batch mode

Progress bar, then a summary line (`12 reviews: 7 reply, 2 check facts, 2 hold, 1 report`) and a table sorted by urgency. Rows expand to edit drafts and override the action via a dropdown. Capped at 30 reviews per batch. CSV export of the whole table.

### Sample data

One click loads 15 realistic reviews in English, Urdu script, and Roman Urdu across Google, Yelp, Facebook, and TripAdvisor, including risky and spam cases. Results are cached so the demo never depends on a live API call.

## States and Boundaries

- **No API key** — the app shows a banner and offers mock mode with canned results.
- **Empty review text** — Analyze is blocked with a message rather than calling the model.
- **Unreadable model output** — falls back to `reply_needs_owner` with "review by hand", never a crash.
- **API fails twice** — that row says "could not analyze" and the batch continues.
- **Privacy** — no accounts, no database. Reviews live only in the browser session, except cached sample results. Review text is sent to the model provider.

## Product Decisions

- Owner posts by hand — the app never publishes, which keeps the owner in control and the product safe.
- Hold and report produce no draft — offering one would tempt the owner to post into a worse situation.
- Translations stay visible — the owner needs to check what they are about to post.
- Allow overriding any action — misclassification on a risky review is possible, so the owner can correct it.

## What We're Building

Sidebar setup; single review analysis with editable draft, copy, rewrite, checklist, translations, and warnings; batch analysis with progress, summary, urgency sort, row editing, action override, and CSV export; one-click 15-sample dataset across four platforms; mock mode; prompt-injection-safe parsing.

## Deferred From the POC

Google Business Profile API integration, deployed hosting, scraping, accounts and payments, multi-user teams, analytics dashboards.

## Non-Goals

Auto-posting or auto-reporting; scraping review sites; anything that posts without the owner.

## Open Questions

- Must the model name be locked to one provider, or should the app support both from day one? (Resolved in `spec.md` — both, selected by env var.)