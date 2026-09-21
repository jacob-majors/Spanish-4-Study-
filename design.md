# Design — SA Spanish 4 Study Tool

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

## Concept

**A language workbook, not a dashboard.** The app is a reference you trust and
mark up daily: warm paper, hairline rules, a roman serif for voice, mono for
every conjugated form and figure. Dense and quiet. Nothing decorative.

The tell it replaces: dark navy + violet gradient, rounded cards nested in
rounded cards, uniform icon-tile grids, Inter everywhere.

## Genre

editorial

## Macrostructure family

- **Index pages** (`/`, `/sets`, `/exams`, `/progress`) — **Index-First**.
  Ruled rows, ordinal numbers in the margin, no cards, no hero, no reveal. The
  page *is* the list. Variation knob: which columns each index shows.
- **Reference pages** (`/sets/[id]`, `/tables`, `/exams/[id]`) — **Catalogue**.
  A masthead block of counts, then the inventory as a ruled table with tabular
  figures. Variation knob: table column set.
- **Task pages** (flashcards · learn · write · match · test · mock · conjugate)
  — **Worksheet**. One column, one task, wide margins, no chrome, no card. The
  prompt is the largest thing on screen; everything else is a hairline away.

## Theme

Almanac — warm paper, oxblood accent, anchor hue 60.

- `--color-paper`    oklch(97% 0.010 75)
- `--color-paper-2`  oklch(94.5% 0.012 72)
- `--color-paper-3`  oklch(91% 0.013 70)
- `--color-rule`     oklch(85% 0.012 70)
- `--color-rule-2`   oklch(72% 0.014 68)
- `--color-muted`    oklch(49% 0.014 62)
- `--color-ink-2`    oklch(34% 0.015 58)
- `--color-ink`      oklch(21% 0.016 55)
- `--color-accent`   oklch(45% 0.150 27)
- `--color-good`     oklch(46% 0.110 148)
- `--color-focus`    oklch(52% 0.170 27)

Night mode keeps every hue and moves only lightness and chroma, per the dark
recipe (paper 15 %, ink 93 %, accent +17 L / −0.01 C).

## Typography

- Display: **Fraunces**, weights 400 / 600 / 700, style normal (roman — never italic)
- Body:    **IBM Plex Sans**, weights 400 / 500 / 600
- Outlier: **JetBrains Mono**, weights 400 / 500

The outlier carries exactly one role: **data**. Conjugated forms, figures,
counts, person labels, small-caps section labels. Never body copy, never a
heading. Scale is a perfect fourth (1.333) anchored at 1rem.

This is a deliberate deviation from Hallmark's two-slot ceiling for an outlier
face (slop-test gate 38). That ceiling assumes a marketing page where mono is a
garnish; here the tabular data *is* the product, so mono is a full register with
one consistent role rather than a decorative accent. Every mono instance must
be data — the moment it carries prose, it has become a third body font.

## Spacing

4-point named scale, nine steps, in `tokens.css`. Pages use named tokens
(`var(--space-md)`), never raw values. Section padding is deliberately uneven —
index rows are tight, worksheet prompts are generous.

## Motion

Motion-cut project. No library, and none is to be added.

- Easings: `--ease-out` `cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-in`, `--ease-in-out`
- Reveal pattern: **none**. No scroll-triggered fades, no card lifts, no
  stagger. The page is printed; print does not animate in.
- The only motion in the app: the flashcard flip (functional — it shows the
  card has two sides), focus rings (instant, never animated), and a 120 ms
  colour shift on hover/press.
- Reduced-motion fallback: opacity-only, ≤ 150 ms; the flip collapses to a cut.

## Microinteractions stance

- Silent success. A correct answer marks itself and moves on; no toast, no
  confetti, no celebratory sound.
- Feedback is a **mark in the margin**, not a coloured banner: `✓` in green,
  `✗` in oxblood, plus the correct form set in mono.
- Hover tooltips delay 800 ms; focus tooltips 0 ms.
- No confirmation dialogs for reversible actions.

## CTA voice

- **Primary** — solid ink fill, square corners, body font at 500, generous
  horizontal padding. Ink, *not* accent: the accent is a highlighter, never a
  button fill.
- **Secondary** — hairline box, square, transparent fill.
- **Tertiary** — C3 typographic link: word + arrow + 1 px underline, no box.
- Copy pattern: bare imperative verb phrase. "Start the drill", not "Get
  started". Never "Learn more".

## Question types

Six: multiple choice, written answer, true/false, matching, conjugation, and
**fill-in-the-blank**. A fill-in-the-blank can only be built from a curriculum
row that carries a third field — the sentence, with `___` where the term goes —
so adding one is a data change, not a code change.

Typed answers (written, fill-in-the-blank) are graded leniently: a leading
article is optional and a one-character slip still counts. Conjugation answers
are graded strictly, accents included.

## Conjugation scope

The app offers four tenses — presente, pretérito, imperfecto, condicional —
because that is what the class covers. The engine still conjugates all 18 and
the test suite still checks them; `ACTIVE_TENSE_KEYS` in
`lib/conjugation/types.ts` is the single list that decides what the drill and
the verb tables show.

## Per-page allowances

- Index pages: typography only. No enrichment, ever.
- Reference pages: typography + tables. No enrichment.
- Task pages: typography only. The flashcard flip is the sole exception.

## What pages MUST share

- The wordmark and its hairline rule.
- The accent colour and its placement (≤ 5 % of any viewport; links, active
  nav, focus ring, incorrect marks, mastery bar).
- Fraunces / IBM Plex Sans / JetBrains Mono, in their declared roles.
- The CTA voice (square, ink-filled primary; hairline secondary).
- Ruled rows over cards. A bordered box inside a bordered box is banned.
- Tabular figures on every number.

## What pages MAY differ on

- Which macrostructure family they belong to.
- Table column sets and index row composition.
- Section padding rhythm — index tight, worksheet generous.

## Exports

See `tokens.css` at the project root — it is the single source of the values
above and is imported by `app/globals.css`.
