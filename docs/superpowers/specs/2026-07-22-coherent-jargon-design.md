# Coherent Jargon Output — Design

**Date:** 2026-07-22
**Goal:** Fix the jargon assembly engine so output is grammatically clean, and re-curate the word lists toward consistent (and funnier) corporate-buzzword parody.

## Problem

The ported PHP pipeline produces garbled output at heavy density:

- Missing space after inserted adjectives: `Thepregnant`, `isblank`, `aparamount`.
- Cascading substitution: replacement text is re-scanned by later rules, so
  "tarred-and-feathered" → "tarred- in addition to -feathered" and
  "CEO" → "Chief Executive Officer" → "Chief mogul Officer".
- Double spaces throughout, and a leading space at the start of output.
- No a/an agreement: "a important update".
- Adjective inserted after "is" breaks verb phrases: "is blank working".
- Sentence-start capitalization lost when a capitalized word is replaced.
- Word lists contain off-tone entries ("pregnant", "icy") that read as random
  noise rather than corporate parody, plus blank lines that get picked as
  empty insertions.

## Design

### Assembly engine (`src/jargonate.ts`)

Replace the sequential per-word `text.replace` loop (2,300+ regex passes, each
able to corrupt prior output) with a **single left-to-right pass** over the
original input:

- Build one combined case-insensitive matcher from all replacement-table keys
  plus the article rule. Longest match wins at any position ("CEO" before "C").
- Each match is replaced exactly once. Replacement text is emitted verbatim and
  never re-scanned — cascading is structurally impossible.
- **Article rule:** after `a`/`an`/`the` (word boundary), optionally insert an
  adjective with correct single spacing, rewriting `a`/`an` to agree with the
  following word's initial sound. Applies a/an agreement even when no adjective
  is inserted but the article's noun changed via substitution. The `is` case is
  dropped from adjective insertion (the adv table carries verb adverbs).
- **Capitalization:** if the matched word starts uppercase, uppercase the
  replacement's first letter.
- **Whitespace hygiene:** single-space joins; no leading/trailing whitespace
  introduced; the appended closing sentence is separated by exactly one blank
  line.
- `parseWordList` filters blank/whitespace-only lines.
- Random-roll semantics (`level`, slider inversion in `main.ts`) are unchanged.

### Word lists (`src/data/`)

- `adj.txt`: remove off-tone/non-corporate entries; keep and extend the
  buzzword set (mission-critical, best-of-breed, enterprise-grade, scalable,
  synergistic, blockchain-enabled, AI-powered, …). Every entry must read
  naturally in "a/the ___ noun".
- `adv.txt`: fix rows whose replacements are grammatically wrong in context;
  keep the verb→adverb+verb pattern.
- `rep.txt`: drop non-sequitur mappings; keep/extend mildly absurd corporate
  ones (team → cross-functional task force, meeting → alignment ceremony,
  problem → opportunity space, …). Number→word and acronym expansions stay
  (cascade-safe by engine design).
- `sen.txt`: light cleanup; add a handful of new consultant-speak closers.
- **Humor mandate (user-approved):** actively add new funny corporate-parody
  words/phrases across all lists — modern startup/consulting/AI buzzword
  slang welcome — as long as each entry is grammatical in its slot.
- `prep.txt` is dead code (never loaded); left untouched, noted here.

### Density slider labels (`index.html`, `src/style.css`, `src/main.ts`)

The five density labels (Plain English, Light, Moderate, Heavy, Maximum
Synergy) move onto the slider line itself:

- The `level-ticks` row under the track renders all five labels, positioned
  across the track's width at their threshold ranges.
- The label matching the current slider value is highlighted (ink color +
  weight); the rest stay faded. Highlight updates live as the slider moves.
- The separate top-right `level-readout` is removed; the highlighted tick
  label takes over its role. The `aria-live` status flow is unchanged.
- Labels stay legible on narrow screens (smaller type or staggered rows —
  implementation's choice, no horizontal page scroll).

### Testing (`tests/jargonate.test.ts`)

Deterministic tests using forced substitution / seeded picks:

- No glued words or double spaces in output.
- a/an agreement with inserted adjectives.
- No cascading: a replacement containing "and"/other keys survives intact.
- Capitalization preserved for sentence-start replacements.
- Level with zero substitution probability returns input + closing sentence
  only, correctly spaced.
- Data-file lint test: no blank entries; every adj entry fits "a/the ___ noun"
  shape (non-empty, no leading/trailing space); adv/rep rows well-formed CSV.

## Out of scope

- Other UI changes beyond the slider labels, PHP-fidelity preservation of the
  replacement loop, prep.txt removal, sentence-level NLP/POS analysis.
