# Design system

ReviewDesk uses a small, deliberate visual language. Everything lives in
`src/app/globals.css`, layered on one custom daisyUI theme.

## The rule that shapes everything

**This is a tool for working, not a landing page.** The interface should feel
like a well-organised desk: dense enough to show the state of a queue, calm
enough to read a review, and quiet enough that the reply draft is the
loudest thing on screen.

## Palette

One accent, a neutral ramp, and a small set of semantic colours.

| Token              | Value     | Used for                                  |
| ------------------ | --------- | ----------------------------------------- |
| `--rd-ink`         | `#111827` | Headings, primary text                    |
| `--rd-body`        | `#374151` | Body text                                 |
| `--rd-muted`       | `#6B7280` | Secondary text, mono labels               |
| `--rd-line`        | `#E5E7EB` | Borders, dividers                         |
| `--rd-line-strong` | `#D1D5DB` | Input borders                             |
| `--rd-brand`       | `#1D4ED8` | The single accent: primary actions, links |
| `--rd-reply`       | `#15803D` | The `reply` action                        |
| `--rd-check`       | `#854D0E` | The `reply_needs_owner` action, warnings  |
| `--rd-hold`        | `#DC2626` | The `hold` action, errors                 |
| `--rd-report`      | `#52525B` | The `report` action                       |
| `--rd-star`        | `#F59E0B` | Star ratings                              |

Every text colour clears WCAG AA (4.5:1) on its own background. The muted
grey is the darkest it can be at `#6B7280` and still passes.

## What is deliberately absent

These are rules, not preferences. A pull request that adds one of them will
be declined.

- **No gradients as decoration.** No purple-blue blobs, no glows, no orbs.
- **No glass.** No frosted panels, no backdrop blur on cards, no translucent
  surfaces over imagery.
- **No emoji.** Use a lucide icon or a word.
- **No stock illustrations.** No people photos, no 3D shapes, no mascots.
- **No pill shapes.** Field radius is `0.5rem` everywhere.
- **No invented numbers.** No "10,000 reviews handled". The only statistics
  in the product are the ones the owner generated.
- **No scroll-driven motion.** Effects fire on mount and on hover only.

## Type

| Role    | Face                           | Size                            |
| ------- | ------------------------------ | ------------------------------- |
| Display | Inter 800, `-0.035em` tracking | `clamp(1.75rem, 3.2vw, 2.5rem)` |
| Heading | Inter 700, `-0.03em`           | `1rem` to `1.25rem`             |
| Body    | Inter 400                      | `0.875rem` to `1rem`            |
| Kicker  | Inter 600, uppercase, `0.08em` | `0.75rem`                       |
| Mono    | JetBrains Mono                 | `0.75rem`                       |

Mono is for anything a machine wrote: ids, timestamps, counts, keywords, the
ledger. It is the visual signal that a value is exact rather than decorative.

## Components

Use daisyUI classes for anything daisyUI already covers: `btn`, `card`,
`badge`, `tabs`, `input`, `textarea`, `select`, `alert`, `steps`, `collapse`,
`loading`, `checkbox`, `toggle`, `table`.

The `rd-*` classes are for the ReviewDesk-specific pieces:

| Class           | What it is                                                             |
| --------------- | ---------------------------------------------------------------------- |
| `rd-display`    | The heading face                                                       |
| `rd-kicker`     | The small uppercase label                                              |
| `rd-mono`       | The mono face                                                          |
| `rd-num`        | Tabular numerals for counts                                            |
| `rd-stamp`      | The action badge, with `-reply`, `-check`, `-hold`, `-report` variants |
| `rd-banner`     | The triage banner, same variants                                       |
| `rd-ledger-row` | A label and a number on one line                                       |
| `rd-table`      | The density-controlled triage table                                    |
| `rd-chip`       | A small squared tag                                                    |
| `rd-veto`       | The veto countdown                                                     |
| `rd-grid`       | The masked dot texture                                                 |
| `rd-window-xl`  | The product mockup frame                                               |
| `rd-empty`      | The empty state                                                        |

## Motion

Motion is for orientation, never for decoration.

- **Entrance:** `SkewInText` on page and step headings. One time, on mount.
- **Attention:** `SpotlightText` for a section title the reader is about to
  reach. Hover-driven.
- **Action:** `LabelSlideButton` for the primary call to action. The label
  slides on hover.
- **Numbers:** `CountUp` for a stat that just changed.
- **Reveal:** `Reveal` and `GlowCard` for blocks below the fold.

Every one of them has a reduced-motion path, and every one of them keeps the
text available to a screen reader. Server HTML is always the final, readable
page.

## Layout

- Content is capped at `1120px` on the marketing pages and `1200px` in the
  app.
- The desk is a two-column grid: a `380px` inbox rail and a flexible detail
  column. The rail scrolls independently.
- The triage table is density-controlled: `10px` vertical and `12px` horizontal
  cell padding, a sticky header, and a 12px row hover.
- Every panel is a `card card-border bg-base-100 p-6`.

## Accessibility

- Focus rings are visible: a 2px brand outline with a 2px offset, applied to
  links, buttons, tabs, inputs, and summaries.
- Touch targets are at least 44px on coarse pointers.
- Every icon-only control carries an `aria-label`.
- The triage table keeps a real `<th>` structure and uses `aria-current` for
  the selected row.
- Reduced motion is honoured at the stylesheet level, not per component.

## Adding to the system

1. Check whether daisyUI already has it. If so, use the daisyUI class.
2. If it is ReviewDesk-specific, add an `rd-*` class next to the others in
   `globals.css`, with a comment saying what it is for.
3. Do not introduce a new colour. The palette above is the palette.
4. Check it against the "what is deliberately absent" list first.
