# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Full port from PHP to a client-side TypeScript app (Vite build), so the site can be hosted as static files on GitHub Pages with no backend.
- Redesigned UI: an interoffice-memo aesthetic with a letterhead header, a duplicate-form draft/approved-copy layout, a rubber-stamp submit button, and a "Buzzword Density" slider exposing the substitution-frequency parameter that was previously only reachable via a query string.
- Vitest unit tests (`tests/jargonate.test.ts`) covering `pickRand()`, word-list parsing, and `jargonate()` boundary behavior, replacing the PHPUnit suite.
- `.github/workflows/deploy.yml` — builds and deploys to GitHub Pages via `actions/upload-pages-artifact` + `actions/deploy-pages`.
- Biome for formatting/linting, and a `.pre-commit-config.yaml` with pinned `gitleaks` + `detect-private-key` secret scanning.
- `README.md` documenting setup, the "How It Works" data flow, and the word-list file formats.
- `LICENSE` (MIT).
- This changelog.

### Changed
- `.github/workflows/ci.yml` now runs the Node/TypeScript toolchain (format check, lint, typecheck, test, build) instead of PHP lint + PHPUnit.
- Corrected the page's `<meta name="description">` tag, which previously read "PAR Realtime Chat" (leftover from an unrelated project).

### Removed
- The PHP runtime and its toolchain: `index.php`, `jargonator.php`, `composer.json`/`composer.lock`, `vendor/`, `tests/harness.php`, `tests/JargonatorTest.php`, and `.htaccess` (Apache-specific, not applicable to static hosting).
- `jive.php` — unreferenced dead code containing a racial slur and offensive ethnic stereotypes as literal string data. It was never included or executed by any code path and has been permanently deleted.

### Fixed
- A fatal parse error that prevented the application from running under any standard PHP configuration.
- Reflected, unescaped output on the `?action=jargonate` endpoint; output is now HTML-escaped.
- The `?action=` parameter previously accepted any non-empty value; it now validates against `jargonate` and rejects anything else with `400 Bad Request`.

_The three items above describe fixes made to the PHP implementation before it was retired; they no longer apply to the current client-side app, which has no server endpoint._
