# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2026-07-22]

### Added
- Full port from PHP to a client-side TypeScript app (Vite build), so the site can be hosted as static files on GitHub Pages with no backend.
- Redesigned UI: an interoffice-memo aesthetic with a letterhead header, a duplicate-form draft/approved-copy layout, a rubber-stamp submit button, and a "Buzzword Density" slider exposing the substitution-frequency parameter that was previously only reachable via a query string.
- Vitest unit tests (`tests/jargonate.test.ts`) covering word-list parsing and `jargonate()` boundary behavior, replacing the PHPUnit suite.
- `.github/workflows/deploy.yml` — builds and deploys to GitHub Pages via `actions/upload-pages-artifact` + `actions/deploy-pages`.
- Biome for formatting/linting, and a `.pre-commit-config.yaml` with pinned `gitleaks` + `detect-private-key` secret scanning.
- `README.md` documenting setup, the "How It Works" data flow, and the word-list file formats.
- `LICENSE` (MIT).
- This changelog.
- Single-pass cascade-proof jargon engine that prevents re-substitution of already-replaced text, ensuring replacements do not compound unpredictably.
- Grammatical refinements: automatic a/an agreement based on following word's first letter, and capitalization preservation when replacing capitalized words.
- Five-label density slider with inline tick labels (Plain English, Light, Moderate, Heavy, Maximum Synergy) on the slider line, with the active density label highlighted, replacing the top-right numerical readout.

### Changed
- `.github/workflows/ci.yml` now runs the Node/TypeScript toolchain (format check, lint, typecheck, test, build) instead of PHP lint + PHPUnit.
- Corrected the page's `<meta name="description">` tag, which previously read "PAR Realtime Chat" (leftover from an unrelated project).

### Removed
- The PHP runtime and its toolchain: `index.php`, `jargonator.php`, `composer.json`/`composer.lock`, `vendor/`, `tests/harness.php`, `tests/JargonatorTest.php`, and `.htaccess` (Apache-specific, not applicable to static hosting).
- `jive.php` — unreferenced dead code containing a racial slur and offensive ethnic stereotypes as literal string data. It was never included or executed by any code path and has been permanently deleted.
- `pickRand()` helper function (internal only; not part of public API).
- Top-right density level readout UI element.

### Fixed
- A fatal parse error that prevented the application from running under any standard PHP configuration.
- Reflected, unescaped output on the `?action=jargonate` endpoint; output is now HTML-escaped.
- The `?action=` parameter previously accepted any non-empty value; it now validates against `jargonate` and rejects anything else with `400 Bad Request`.
- Level 0 maximum-density setting now correctly applies maximum substitution frequency; previously fell back to default level.
- Curated and expanded word lists: `adj.txt` rebuilt as 140 corporate-buzzword entries; 12 new consultant closers in `sen.txt`; `adv.txt` and `rep.txt` grammar-fixed with non-sequiturs removed and 39 new corporate-parody rows added with clause-safe conjunction replacements.
- Output-coherence: percent smoothing (`50%` → `fifty percent`, not `fifty%`), a version-number guard so product/version numbers like "Fable 5" no longer get spelled out, and an article-insertion stopword list so no adjective gets wedged before words like "same".
- Modal-safe phrase rows for "have to"/"has to"/"had to" so an adverb no longer splits the modal (e.g. "have furiously to"), and clause-safe replacements for "know"/"think"; removed noun/verb-ambiguous or nonsense rows (`use`, `support`, `help`, `plan`/`plans`) that broke on verb usage or clause objects.
- Output-rhythm at maximum density: an adjacent-substitution cooldown skips a second table replacement immediately after another (whitespace-only gap), preventing stacked adverb runs like "furiously found delicately" and "dashingly immediately"; and 162 `adv.txt` main-verb rows were reordered from post-verb to pre-verb adverb placement (`found,found delicately` → `found,delicately found`) so an adverb no longer lands between a verb and its direct object, while auxiliary/copula/modal rows (`is`, `has`, `will`, etc.) keep their post-verb order.

_The three items in the "Fixed" section preceding the Level 0 fix describe issues with the PHP implementation before it was retired; they no longer apply to the current client-side app, which has no server endpoint._
