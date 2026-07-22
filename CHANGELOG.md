# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `README.md` documenting setup, the `?action=`/`?level=` endpoint contract, the "How It Works" data flow, and the word-list file formats.
- `LICENSE` (MIT).
- This changelog.

### Changed
- Corrected the page's `<meta name="description">` tag, which previously read "PAR Realtime Chat" (leftover from an unrelated project).

### Removed
- `jive.php` — unreferenced dead code containing a racial slur and offensive ethnic stereotypes as literal string data. It was never included or executed by any code path and has been permanently deleted.

### Fixed
- A fatal parse error that prevented the application from running under any standard PHP configuration.
- Reflected, unescaped output on the `?action=jargonate` endpoint; output is now HTML-escaped.
- The `?action=` parameter previously accepted any non-empty value; it now validates against `jargonate` and rejects anything else with `400 Bad Request`.
