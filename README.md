# PAR Jargonator

A tiny PHP web toy that turns plain text into filler-laden "corporate jargon" through word substitution.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [API Reference](#api-reference)
- [Word List Data Files](#word-list-data-files)
- [Project Structure](#project-structure)
- [License](#license)

## Overview

PAR Jargonator serves a single page with an input textarea and an output textarea. Paste in a sentence, click **Jargonate**, and the server hands back the same text padded out with extra adjectives, adverb-style phrases, and a closing filler sentence — the kind of thing that turns "we should finish this" into three clauses of buzzword padding.

There is no database, no user accounts, and no build step. The entire application is a handful of PHP files plus plain-text word lists.

> **Note:** An earlier file in this repository, `jargonator.php`'s legacy sibling `jive.php`, has been permanently deleted. It was dead code — never included or referenced anywhere in the codebase — and it contained a racial slur and offensive ethnic stereotypes as literal string data. It is not sample content, not a reference implementation, and not present in any form in this repository going forward.

## Features

- Single-endpoint text transformation with no client-side state
- Data-driven vocabulary: substitution words live in plain `.txt` files, not hardcoded in PHP
- Adjustable substitution frequency via a `level` parameter
- Progressive enhancement: the form works as a normal POST even if JavaScript is disabled
- Zero dependencies beyond a PHP runtime and a single CDN-hosted copy of jQuery

## Prerequisites

- PHP with `short_open_tag` behavior irrelevant (the app uses `<?php` throughout) — any current PHP release works
- No Composer packages, no Node toolchain, no database

## Installation

Clone the repository and serve the directory with any PHP-capable web server. There is no build step and nothing to install.

For local development, PHP's built-in server is the fastest way to run it:

```bash
make run
```

This is equivalent to `php -S localhost:8000`. Then open `http://localhost:8000/` in a browser.

A `make lint` target is also available and runs `php -l` over every PHP file.

For production, point an Apache or PHP-FPM/nginx vhost's document root at this directory. The bundled `.htaccess` (see [Project Structure](#project-structure)) assumes an Apache environment.

## Quick Start

1. Start the server:
   ```bash
   make run
   ```
2. Open `http://localhost:8000/` in a browser.
3. Type a sentence into the **Type Message here** textarea and click **Jargonate**.
4. The jargon-padded result appears in the **Output** textarea.

## How It Works

The page's form POSTs the input text to `?action=jargonate` via a jQuery AJAX call. On the server, `index.php` validates the request and calls `jargonate()`, which loads word lists from the `.txt` data files and runs a series of regex-based substitutions — inserting extra adjectives around common words and swapping matched words for randomly chosen jargon-flavored replacements. The transformed text (plus a closing filler sentence) is escaped and returned as plain text, and the front-end JavaScript writes it straight into the output textarea.

## API Reference

### `GET /?action=jargonate`

**Purpose:** Transform submitted text into jargon-padded output.

**Method:** `POST` (to the same URL as the `GET` query string above; the transform only runs once `action` is present)

**Authentication:** None

#### Request

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `action` | string | Yes | — | Must be exactly `jargonate`. Omitting it (empty string) serves the HTML page instead. Any other non-empty value returns `400 Bad Request`. |
| `level` | integer | No | `85` | Roughly 0–100. Tunes how often optional word substitutions fire: each optional substitution rolls a random number from 0–100 and only replaces the word if that roll exceeds `level`, so **lower values substitute more often** (heavier jargon) and **higher values substitute less often**. Omitting `level` (or passing `0`) falls back to the default of `85`; other out-of-range values (e.g. negative numbers or values above 100) are used as-is and produce near-constant or near-zero substitution rather than an error. |

**Body Parameters (POST):**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `in` | string | Yes | The text to transform. Missing or empty input is treated as an empty string rather than an error. Input longer than 8192 bytes is truncated before processing. |

**Same-origin requirement:** If the request includes an `Origin` header, it must match the request's `Host` header or the server responds `403 Forbidden`. Requests with no `Origin` header (e.g. same-origin form submissions, most non-browser clients) are unaffected.

#### Response

A successful request returns `200 OK` with `Content-Type: text/plain; charset=UTF-8` and the HTML-escaped, jargon-padded text as the body. There is no JSON envelope — the entire response body is the transformed text.

## Word List Data Files

Substitution vocabulary lives entirely in plain-text files at the repository root rather than hardcoded in PHP, so the jargon vocabulary can be edited without touching code.

| File | Format |
|------|--------|
| `adj.txt` | Plain newline-delimited list — one word or phrase per line. |
| `prep.txt` | Plain newline-delimited list — one word or phrase per line. Present in the repository but not currently loaded by `jargonator.php`. |
| `sen.txt` | Plain newline-delimited list — one full filler sentence per line, appended as the closing line of jargonated output. |
| `adv.txt` | CSV-like rows: `word,replacement1,replacement2,...`. The first field is the word to match; the remaining fields are candidate replacements, one of which is chosen at random. |
| `rep.txt` | Same `word,replacement1,replacement2,...` format as `adv.txt`. Both files are loaded and merged into a single substitution table. |

## Project Structure

- `index.php` — routes requests, serves the HTML page, and handles the `?action=jargonate` transform endpoint
- `jargonator.php` — loads the word-list data files and returns them for use by `jargonate()`
- `adj.txt`, `adv.txt`, `prep.txt`, `rep.txt`, `sen.txt` — word-list data files (see [above](#word-list-data-files))
- `css/` — stylesheets (`normalize.css`, `main.css`)
- `.htaccess` — generic [h5bp](https://github.com/h5bp/server-configs-apache) Apache hardening and performance boilerplate; not specific to this application
- `Makefile` — `make run` starts the local dev server; `make lint` runs `php -l` over every PHP file

## License

Released under the MIT License — see [LICENSE](LICENSE) for the full text.
