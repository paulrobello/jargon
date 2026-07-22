# PAR Jargonator

A tiny client-side web toy that turns plain text into filler-laden "corporate jargon" through word substitution — now a static TypeScript app, served entirely from a browser with no backend.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Word List Data Files](#word-list-data-files)
- [Project Structure](#project-structure)
- [Development](#development)
- [Deployment (GitHub Pages)](#deployment-github-pages)
- [License](#license)

## Overview

PAR Jargonator presents a mock interoffice memo: paste a plain sentence into the "Original Draft" panel, hit the **Jargonate** stamp, and the "Approved Copy" panel fills in with the same text padded out with extra adjectives, jargon-flavored word swaps, and a closing filler sentence — the kind of thing that turns "we should finish this" into three clauses of buzzword padding.

There is no server, no database, and no user accounts. All transformation logic runs in the browser; the word-list data is bundled into the app at build time.

> **Note:** An earlier version of this project ran on PHP with a server-side `?action=jargonate` endpoint. It has been fully ported to TypeScript and now runs client-side only, so it can be hosted as a static site (e.g. GitHub Pages). A previous file in this repository's history, a legacy `jive.php`, contained a racial slur and offensive ethnic stereotypes as literal string data; it was dead code, never referenced anywhere, and was permanently deleted before this port.

## Features

- Single-page text transformation, entirely client-side — nothing you type is sent anywhere
- Data-driven vocabulary: substitution words live in plain `.txt` files, bundled at build time rather than hardcoded
- Adjustable substitution frequency via a "Buzzword Density" slider
- Interoffice-memo themed UI: letterhead header, duplicate-form draft/approved-copy layout, and a rubber-stamp submit button
- Zero runtime dependencies — the built site is static HTML/CSS/JS

## Prerequisites

- Node.js 20+ and npm
- No database, no backend runtime

## Installation

```bash
npm install
```

## Quick Start

```bash
make dev
```

Then open `http://localhost:8812/` in a browser. Type a sentence into **Original Draft**, adjust **Buzzword Density** if you like, and click the **Jargonate** stamp.

## How It Works

The word-list `.txt` files are bundled into the JS build as raw text (`src/loadData.ts`) and parsed into an adjective list, a filler-sentence list, and a word&rarr;replacement table (`src/jargonate.ts`). Clicking **Jargonate** runs `jargonate()`:

1. Optionally inserts a random adjective after standalone occurrences of "a", "the", or "is".
2. Walks the word&rarr;replacement table and swaps matching whole words for a randomly chosen jargon replacement (or leaves the word unchanged, depending on the roll).
3. Appends a random closing filler sentence.

The "Buzzword Density" slider (0 = Plain English, 100 = Maximum Synergy) is inverted internally to the original substitution-frequency parameter, where a *lower* internal value means substitutions fire *more* often.

## Word List Data Files

Substitution vocabulary lives entirely in plain-text files under `src/data/` rather than hardcoded in TypeScript, so the jargon vocabulary can be edited without touching code.

| File | Format |
|------|--------|
| `adj.txt` | Plain newline-delimited list — one word or phrase per line. |
| `prep.txt` | Plain newline-delimited list. Present in the repository but not currently loaded by the app. |
| `sen.txt` | Plain newline-delimited list — one full filler sentence per line, appended as the closing line of jargonated output. |
| `adv.txt` | CSV-like rows: `word,replacement1,replacement2,...`. The first field is the word to match; the remaining fields are candidate replacements, one of which is chosen at random. |
| `rep.txt` | Same `word,replacement1,replacement2,...` format as `adv.txt`. Both files are loaded and merged into a single substitution table. |

## Project Structure

- `index.html` — the app shell (memo layout markup)
- `src/main.ts` — DOM wiring: slider, form submit, example chips, copy-to-clipboard
- `src/jargonate.ts` — the ported transformation logic (`jargonate()`, `pickRand()`, word-list parsing)
- `src/loadData.ts` — bundles the `.txt` word lists into the app at build time
- `src/style.css` — the interoffice-memo visual design
- `src/data/` — word-list data files (see [above](#word-list-data-files))
- `tests/jargonate.test.ts` — Vitest unit tests for the transformation logic
- `Makefile` — standard targets: `dev`, `build`, `test`, `lint`, `fmt`, `typecheck`, `checkall`
- `.github/workflows/ci.yml` — lint/typecheck/test/build on every push and PR
- `.github/workflows/deploy.yml` — builds and deploys `dist/` to GitHub Pages on pushes to `main`

## Development

```bash
make dev         # start the Vite dev server on :8812
make test         # run the Vitest suite
make lint         # Biome lint
make fmt          # Biome format (writes)
make typecheck    # tsc --noEmit
make checkall     # fmt:check + lint + typecheck + test + build
```

## Deployment (GitHub Pages)

The `deploy` workflow builds the Vite app and publishes `dist/` via GitHub's official Pages Actions (`actions/upload-pages-artifact` + `actions/deploy-pages`) on every push to `main`. Pages is configured with **Source: GitHub Actions** and a custom domain of **jargon.pardev.net** (see `public/CNAME`, which Vite copies into `dist/` as-is).

Live at <https://jargon.pardev.net>.

The Vite build uses a relative `base: './'` so the site works whether it's served from a custom domain, a user page, or a project page under a subpath.

## License

Released under the MIT License — see [LICENSE](LICENSE) for the full text.
