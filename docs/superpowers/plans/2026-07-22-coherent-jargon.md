# Coherent Jargon Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the jargon assembly as a single-pass cascade-proof engine, re-curate the word lists into consistent (and funnier) corporate-buzzword parody, and move the five density labels onto the slider line.

**Architecture:** `jargonate()` becomes one left-to-right `String.replace` over a combined alternation regex (article rule + all table keys, longest-first), so replacement text is emitted verbatim and never re-scanned. Two small normalization passes (a/an agreement, whitespace) follow. Data files keep their existing formats; parsing gets stricter (trimmed, blank-filtered, lowercased keys). UI ticks render from the existing `DENSITY_LABELS` table.

**Tech Stack:** TypeScript, Vite, Vitest, Biome. No new dependencies.

## Global Constraints

- Verification gate for every task: `make checkall` (runs fmt:check, lint, typecheck, vitest, build) from `/docker/pardev/data/jargon`.
- Data file formats are unchanged: `adj.txt`/`sen.txt` one entry per line; `adv.txt`/`rep.txt` CSV rows `key,replacement1[,replacement2,...]`.
- Roll semantics preserved: lower `level` = more frequent substitution; `main.ts` inverts the slider (`level = 100 - density`).
- Input cap stays `MAX_INPUT_LENGTH = 8192`.
- Every commit message ends with the standard Co-Authored-By / Claude-Session trailer.
- No pushes — commits only.

---

### Task 1: Single-pass cascade-proof engine

**Files:**
- Modify: `src/jargonate.ts` (full rewrite of file body)
- Modify: `src/loadData.ts` (no interface change; re-exports same shape)
- Modify: `tests/jargonate.test.ts` (full rewrite)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `jargonate(content: string, data: JargonData, level?: number, rng?: () => number): string`; `parseWordList(raw: string): string[]` (now trims + drops blanks); `parseAdvTable(advRaw: string, repRaw: string): Map<string, string[]>` (now lowercases keys, trims fields, drops empty fields); `DEFAULT_JARGON_LEVEL`, `MAX_INPUT_LENGTH` unchanged. `pickRand` is **removed** (only tests used it). Task 2's lint test relies on `parseWordList` / `parseAdvTable` exactly as above.

- [ ] **Step 1: Write the failing tests** — replace `tests/jargonate.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { jargonate, parseAdvTable, parseWordList, type JargonData } from '../src/jargonate';
import { loadJargonData } from '../src/loadData';

// rng always < any threshold → every roll substitutes; always picks list[0].
const alwaysRng = () => 0;

function makeData(overrides: Partial<JargonData> = {}): JargonData {
  return { adj: [], sen: ['CLOSER.'], adv: new Map(), ...overrides };
}

describe('parseWordList', () => {
  it('trims entries and drops blank lines', () => {
    expect(parseWordList('a\n b \n\nc\n')).toEqual(['a', 'b', 'c']);
  });
});

describe('parseAdvTable', () => {
  it('lowercases keys, trims fields, and drops empty fields', () => {
    const table = parseAdvTable('Foo,bar , baz\n', 'CEO,Chief Executive Officer,,\n');
    expect(table.get('foo')).toEqual(['bar', 'baz']);
    expect(table.get('ceo')).toEqual(['Chief Executive Officer']);
  });

  it('later rows override earlier ones (rep overrides adv)', () => {
    const table = parseAdvTable('foo,bar\n', 'foo,qux\n');
    expect(table.get('foo')).toEqual(['qux']);
  });
});

describe('jargonate assembly', () => {
  it('inserts an adjective after a/the with single spacing', () => {
    const data = makeData({ adj: ['synergistic'] });
    const result = jargonate('the plan works', data, 0, alwaysRng);
    expect(result).toContain('the synergistic plan');
    expect(result).not.toMatch(/ {2,}/);
  });

  it('does not insert adjectives after "is"', () => {
    const data = makeData({ adj: ['synergistic'] });
    const result = jargonate('it is working', data, 0, alwaysRng);
    expect(result).toContain('it is working');
  });

  it('rewrites a→an to agree with a vowel-initial adjective', () => {
    const data = makeData({ adj: ['agile'] });
    const result = jargonate('a plan', data, 0, alwaysRng);
    expect(result).toContain('an agile plan');
  });

  it('rewrites an→a to agree with a consonant-initial adjective', () => {
    const data = makeData({ adj: ['bold'] });
    const result = jargonate('an update', data, 0, alwaysRng);
    expect(result).toContain('a bold update');
  });

  it('fixes a/an agreement introduced by substitution alone', () => {
    const data = makeData({ adv: new Map([['update', ['initiative']]]) });
    const result = jargonate('a update', data, 0, alwaysRng);
    expect(result).toContain('an initiative');
  });

  it('never re-substitutes inside replacement text (no cascading)', () => {
    const data = makeData({
      adv: new Map([
        ['and', ['in addition to']],
        ['99', ['ninety nine and then some']],
      ]),
    });
    const result = jargonate('99 problems', data, 0, alwaysRng);
    expect(result).toContain('ninety nine and then some problems');
  });

  it('prefers the longest key at a position', () => {
    const data = makeData({
      adv: new Map([
        ['answer', ['reply']],
        ['answers', ['importantly answers']],
      ]),
    });
    const result = jargonate('she answers', data, 0, alwaysRng);
    expect(result).toContain('she importantly answers');
  });

  it('preserves sentence-start capitalization of replaced words', () => {
    const data = makeData({ adv: new Map([['we', ['the undersigned']]]) });
    // capitalized source uppercases the replacement's first letter...
    expect(jargonate('We agree.', data, 0, alwaysRng).startsWith('The undersigned agree.')).toBe(true);
    // ...lowercase source leaves it as authored (never force-lowercased)
    expect(jargonate('we agree.', data, 0, alwaysRng).startsWith('the undersigned agree.')).toBe(true);
  });

  it('at level 100 leaves the body untouched and appends one closer after a blank line', () => {
    const input = 'the cat sat on the mat';
    const data = makeData({ adj: ['synergistic'], adv: new Map([['cat', ['tiger team']]]) });
    const result = jargonate(input, data, 100, alwaysRng);
    expect(result).toBe(`${input}\n\nCLOSER.`);
  });

  it('treats level 0 as maximum substitution, not a fallback to the default', () => {
    const data = makeData({ adj: ['synergistic'] });
    const result = jargonate('the plan', data, 0, alwaysRng);
    expect(result).toContain('the synergistic plan');
  });

  it('produces no glued words or double spaces on real data at heavy density', () => {
    const data = loadJargonData();
    const input = 'The team is working on a important update and it will answer the question.';
    for (let i = 0; i < 25; i++) {
      const result = jargonate(input, data, 5);
      const body = result.slice(0, result.indexOf('\n\n'));
      expect(body).not.toMatch(/ {2,}/);
      expect(body).not.toMatch(/^\s|\s$/);
      // a/an agreement, allowing the consonant-sound exception prefixes
      expect(body).not.toMatch(/\ba (?!(?:uniq|unit|univ|use|user|one|once|eu|utop|ubiq))[aeiou]/i);
    }
  });

  it('truncates input longer than 8192 characters before transforming', () => {
    const longInput = 'z'.repeat(9000);
    const result = jargonate(longInput, makeData(), 100, alwaysRng);
    const body = result.slice(0, result.indexOf('\n\n'));
    expect(body.length).toBe(8192);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test`
Expected: FAIL — `pickRand` import errors and assembly assertions failing against the old implementation.

- [ ] **Step 3: Rewrite `src/jargonate.ts`**

```ts
export const DEFAULT_JARGON_LEVEL = 85;
export const MAX_INPUT_LENGTH = 8192;

export type Rng = () => number;

export interface JargonData {
  adj: string[];
  sen: string[];
  adv: Map<string, string[]>;
}

function escapeRegExp(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function randomItem<T>(list: T[], rng: Rng): T {
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

/** Ported mt_rand(0,100) > level roll: lower level = more frequent substitution. */
function rolls(level: number, rng: Rng): boolean {
  return Math.floor(rng() * 101) > level;
}

export function parseWordList(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * word,replacement1,replacement2,... rows from adv.txt and rep.txt merged into
 * one table. Keys are lowercased for case-insensitive lookup; later rows
 * (rep.txt) override earlier ones (adv.txt).
 */
export function parseAdvTable(advRaw: string, repRaw: string): Map<string, string[]> {
  const table = new Map<string, string[]>();
  for (const rawLine of `${advRaw}\n${repRaw}`.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const fields = line.split(',').map((field) => field.trim());
    const word = fields.shift()?.toLowerCase();
    if (!word) continue;
    const replacements = fields.filter((field) => field.length > 0);
    if (replacements.length > 0) table.set(word, replacements);
  }
  return table;
}

/** Wrap a key in word boundaries only where its edges are word characters. */
function boundaryWrap(key: string): string {
  const lead = /^\w/.test(key) ? '\\b' : '';
  const tail = /\w$/.test(key) ? '\\b' : '';
  return lead + escapeRegExp(key) + tail;
}

/**
 * One alternation over the article rule plus every table key, longest key
 * first so e.g. "answers" wins over "answer" at the same position.
 */
function buildMatcher(data: JargonData): RegExp {
  const keys = [...data.adv.keys()].sort((a, b) => b.length - a.length).map(boundaryWrap);
  const keyAlternation = keys.length > 0 ? `|(${keys.join('|')})` : '';
  return new RegExp(`\\b(a|an|the)\\b${keyAlternation}`, 'gi');
}

/** Uppercase the replacement's first letter when the source word had one. */
function matchCase(source: string, replacement: string): string {
  if (/^[A-Z]/.test(source) && replacement.length > 0) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/**
 * Heuristic a/an choice: vowel-initial words take "an" except common
 * consonant-sounding starts (unique, user, one, european, ...).
 */
const CONSONANT_SOUND = /^(uniq|unit|univ|use|user|one|once|eu|utop|ubiq)/i;

function articleFor(word: string): 'a' | 'an' {
  if (CONSONANT_SOUND.test(word)) return 'a';
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

/** Fix a/an agreement against whatever word now follows the article. */
function fixArticles(text: string): string {
  return text.replace(
    /\b(a|an)([ \t]+)([A-Za-z][\w-]*)/gi,
    (_match, article: string, gap: string, next: string) =>
      `${matchCase(article, articleFor(next))}${gap}${next}`,
  );
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([.,;:!?])/g, '$1')
    .replace(/^[ \t]+|[ \t]+$/gm, '');
}

/**
 * Single left-to-right pass: each match is replaced at most once and the
 * replacement text is emitted verbatim, so substitutions can never cascade.
 */
export function jargonate(
  content: string,
  data: JargonData,
  level: number = DEFAULT_JARGON_LEVEL,
  rng: Rng = Math.random,
): string {
  let text = content.length > MAX_INPUT_LENGTH ? content.slice(0, MAX_INPUT_LENGTH) : content;

  text = text.replace(buildMatcher(data), (match, article: string | undefined) => {
    if (article !== undefined) {
      if (data.adj.length === 0 || !rolls(level, rng)) return match;
      const adjective = randomItem(data.adj, rng);
      const agreed = article.toLowerCase() === 'the' ? article : matchCase(article, articleFor(adjective));
      return `${agreed} ${adjective}`;
    }
    const replacements = data.adv.get(match.toLowerCase());
    if (!replacements || !rolls(level, rng)) return match;
    return matchCase(match, randomItem(replacements, rng));
  });

  text = normalizeWhitespace(fixArticles(text));

  if (data.sen.length === 0) return text;
  return `${text}\n\n${randomItem(data.sen, rng)}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS (all suites).

Note: the "level 0 as maximum" behavior is an intentional bug fix — the old code's `level || DEFAULT_JARGON_LEVEL` made the slider's "Maximum Synergy" position *weaker* than one notch below it.

- [ ] **Step 5: Full gate and commit**

Run: `make checkall`
Expected: all five stages green.

```bash
git add src/jargonate.ts src/loadData.ts tests/jargonate.test.ts
git commit -m "feat: single-pass cascade-proof jargon engine with a/an agreement"
```

---

### Task 2: Curate adj.txt + sen.txt, add data lint test

**Files:**
- Modify: `src/data/adj.txt` (full replacement)
- Modify: `src/data/sen.txt` (append new closers)
- Create: `tests/data.test.ts`

**Interfaces:**
- Consumes: `parseWordList`, `parseAdvTable` from Task 1.
- Produces: curated data files that satisfy `tests/data.test.ts`; Task 3 must keep that test green.

- [ ] **Step 1: Write the data lint test** — create `tests/data.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dataDir = join(__dirname, '..', 'src', 'data');
const read = (name: string) => readFileSync(join(dataDir, name), 'utf8');

describe('word list data files', () => {
  it('adj.txt entries are non-blank, untrimmed-free, lowercase-or-hyphenated phrases', () => {
    const lines = read('adj.txt').split('\n').filter((l) => l.length > 0);
    expect(lines.length).toBeGreaterThan(100);
    for (const line of lines) {
      expect(line).toBe(line.trim());
      expect(line).toMatch(/^[a-zA-Z][a-zA-Z0-9' -]*[a-zA-Z0-9]$/);
    }
  });

  it('adv.txt and rep.txt rows are well-formed CSV with trimmed fields', () => {
    for (const file of ['adv.txt', 'rep.txt']) {
      const lines = read(file).split('\n').filter((l) => l.length > 0);
      for (const line of lines) {
        const fields = line.split(',');
        expect(fields.length, `${file}: ${line}`).toBeGreaterThanOrEqual(2);
        for (const field of fields) {
          expect(field, `${file}: ${line}`).toBe(field.trim());
          expect(field, `${file}: ${line}`).not.toBe('');
        }
      }
    }
  });

  it('sen.txt closers are complete sentences ending with punctuation', () => {
    const lines = read('sen.txt').split('\n').filter((l) => l.length > 0);
    expect(lines.length).toBeGreaterThanOrEqual(29);
    for (const line of lines) {
      expect(line).toBe(line.trim());
      expect(line).toMatch(/[.!?]$/);
    }
  });
});
```

- [ ] **Step 2: Run it to verify current state fails**

Run: `npm run test -- tests/data.test.ts`
Expected: FAIL — adv.txt has trailing-space fields; adj.txt may have blank/dirty lines.

- [ ] **Step 3: Replace `src/data/adj.txt`** with this curated list (one per line, exactly):

```
advanced
agile
AI-powered
alignment-driven
all-the-rage
award-winning
battle-tested
bespoke
best-in-class
best-of-breed
bleeding-edge
blockchain-adjacent
bold
brand-safe
buzzword-compliant
carbon-neutral
category-defining
circle-back-ready
client-centric
cloud-native
comprehensive
consequential
creative
critical
cross-functional
customer-obsessed
cutting-edge
data-driven
deep-dive
digital
disruptive
double-clickable
dynamic
easy-to-use
economical
effective
efficient
elegant
elite
enhanced
enterprise-grade
exciting
exclusive
extraordinary
fast-paced
first-to-market
forward-thinking
frictionless
full-stack
future-proof
futuristic
game-changing
global
globally-scaled
granular
ground-breaking
growth-hacked
high-impact
high-leverage
high-speed
high-tech
holistic
hyper-converged
hyperlocal
impactful
incredible
industry-leading
innovative
insight-driven
interactive
iterative
journey-mapped
key
KPI-driven
laser-focused
lean
low-hanging
machine-learning-adjacent
market-leading
mission-critical
mobile-first
momentum-building
moon-shot
move-the-needle
multifaceted
next-generation
north-star
omnichannel
on-brand
outcome-oriented
outside-the-box
paradigm-shifting
passionate
patent-pending
pivotal
platform-agnostic
plug-and-play
powerful
pre-synergized
proactive
process-oriented
productive
proprietary
purpose-driven
quantum
radical
real-time
responsive
results-driven
revolutionary
robust
scalable
scrappy
seamless
serverless
significant
snackable
solution-oriented
stakeholder-approved
strategic
streamlined
sustainable
synergistic
synergy-forward
thought-leading
transformational
turnkey
ultimate
unique
unprecedented
user-centric
value-added
vertically-integrated
viral-ready
visionary
web-scale
whiteboard-ready
white-glove
world-class
zero-trust
```

- [ ] **Step 4: Append these closers to `src/data/sen.txt`** (keep existing 29 lines; some existing lines may be truncated-looking but are complete — verify each ends with punctuation and fix any that don't):

```
Let's circle back offline to double-click on the low-hanging fruit before it falls outside our wheelhouse.
Going forward, we must leverage our core competencies to move the needle on mission-critical deliverables.
At the end of the day, it is what it is, and what it is, is a paradigm shift.
Per my last memo, the synergies will continue until morale improves.
We are not boiling the ocean here; we are simply future-proofing the boil.
Remember: there is no I in team, but there are three in holistic vertical integration.
Our north star remains unchanged: to disrupt ourselves before someone else is paid to.
This aligns with our strategy of aligning strategies into a single aligned strategy.
Please socialize these learnings with your direct reports at your earliest convenience.
In the spirit of radical transparency, this decision has already been made.
Net-net, the optics of the deliverable are directionally accurate.
Moving forward, all bandwidth should be allocated toward drinking our own champagne.
```

- [ ] **Step 5: Fix the trailing-space fields in `adv.txt` and `rep.txt`** so the lint test's CSV checks pass (Task 3 does the full curation; this step only strips trailing/leading whitespace and removes blank fields):

Run: `sed -i 's/[[:space:]]*$//; s/[[:space:]]*,[[:space:]]*/,/g' src/data/adv.txt src/data/rep.txt`

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS, including `tests/data.test.ts` and the real-data assembly test from Task 1.

- [ ] **Step 7: Full gate and commit**

Run: `make checkall`
Expected: green.

```bash
git add src/data/adj.txt src/data/sen.txt src/data/adv.txt src/data/rep.txt tests/data.test.ts
git commit -m "feat: curate adjective list, add consultant closers and data lint test"
```

---

### Task 3: Curate adv.txt + rep.txt replacements

**Files:**
- Modify: `src/data/adv.txt`
- Modify: `src/data/rep.txt`

**Interfaces:**
- Consumes: data lint test from Task 2 (`npm run test -- tests/data.test.ts` must stay green); engine behavior from Task 1 (replacements are emitted verbatim, capitalization handled by the engine, so rows must be lowercase unless inherently capitalized like acronym expansions).
- Produces: curated CSV files, same format.

**Curation rules — apply to every row in both files:**

1. **Grammar agreement:** each replacement must be substitutable for its key without breaking tense, person, or number. Fix rows like `alleviated,effortlessly alleviates` (past key, present replacement → must become `effortlessly alleviated`) and `alleviating,successfully alleviates` (→ `successfully alleviating`). Sweep every `-ed`/`-ing`/`-s` key in `adv.txt` for this mismatch.
2. **Drop non-sequiturs:** delete replacements that read as random rather than corporate parody. Named examples to remove: `team → paramilitary organization`, any replacement using `pregnant`, `revolting`, `violently`, `tarred-and-feathered`, `parboiled`, `scurvy`, `bawdy`. When a row loses all replacements, delete the row.
3. **Keep and protect:** number→word rows (`1,one` … `100,one hundred`), year rows (`1993,one thousand nine hundred and ninety three by the Gregorian calendar` — the engine is cascade-proof so the embedded "and" and "nine" are now safe), acronym expansions, and mildly absurd but on-tone corporate rows.
4. **No stray whitespace, no empty fields** (lint test enforces).

- [ ] **Step 1: Sweep `adv.txt`** applying rules 1–2 row by row (237 rows).

- [ ] **Step 2: Sweep `rep.txt`** applying rules 2–3 (2126 rows; most are number/year/word rows that pass untouched — focus on rows whose replacements contain the flagged words or clearly clash in register).

- [ ] **Step 3: Add these new funny corporate rows to `rep.txt`** (verbatim; if a key already exists, replace its row):

```
meeting,alignment ceremony,synergy summit,stakeholder convergence
meetings,alignment ceremonies,synergy summits,stakeholder convergences
problem,opportunity space,growth vector,learning moment
problems,opportunity spaces,growth vectors,learning moments
idea,thought-leadership artifact,ideation deliverable
ideas,thought-leadership artifacts,ideation deliverables
talk,sync,align,touch base
talked,synced,aligned,touched base
deadline,success horizon,delivery runway
deadlines,success horizons,delivery runways
budget,resource envelope,investment appetite
money,capital allocation,monetizable value
email,asynchronous touchpoint,inbox deliverable
emails,asynchronous touchpoints,inbox deliverables
lunch,working lunch,offline nourishment sync
coffee,productivity fluid,liquid alignment
boss,people leader,accountability partner
employees,human capital,individual contributors
customers,valued stakeholders,revenue partners
plan,roadmap,strategic framework
plans,roadmaps,strategic frameworks
goal,north-star metric,key result
goals,north-star metrics,key results
soon,within the current sprint,before end of quarter
later,in a fast-follow,post-launch
think,ideate,strategize
thinking,ideating,strategizing
use,leverage,operationalize
using,leveraging,operationalizing
help,empower,enable
improve,optimize,uplevel
improving,optimizing,upleveling
start,kick off,spin up
started,kicked off,spun up
finish,land,ship
finished,landed,shipped
team,cross-functional task force,tiger team,pod
teams,cross-functional task forces,tiger teams,pods
together,in lockstep,cross-functionally
```

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: PASS — lint test green, real-data assembly test green.

- [ ] **Step 5: Manual coherence spot-check**

Node 24 runs `.ts` files natively (type stripping), and `src/jargonate.ts` has no Vite-specific imports. Write this to the session scratchpad as `demo.ts` (NOT inside the repo) and run it:

```ts
import { readFileSync } from 'node:fs';
import {
  jargonate,
  parseAdvTable,
  parseWordList,
} from '/docker/pardev/data/jargon/src/jargonate.ts';

const read = (name: string) => readFileSync(`/docker/pardev/data/jargon/src/data/${name}`, 'utf8');
const data = {
  adj: parseWordList(read('adj.txt')),
  sen: parseWordList(read('sen.txt')),
  adv: parseAdvTable(read('adv.txt'), read('rep.txt')),
};
const input =
  'We should finish this project soon. The team is working on a important update and I think it will answer the question. Our CEO announced 3 new initiatives in 1999.';
for (let i = 0; i < 3; i++) {
  console.log(`=== heavy density run ${i + 1} ===\n${jargonate(input, data, 5)}\n`);
}
```

Run: `node <scratchpad>/demo.ts`
Read the output — it must contain no glued words, no double spaces, no cascaded fragments, and read as coherent (funny) corporate speak.

- [ ] **Step 6: Full gate and commit**

Run: `make checkall`
Expected: green.

```bash
git add src/data/adv.txt src/data/rep.txt
git commit -m "feat: curate replacement tables and add corporate-parody mappings"
```

---

### Task 4: Density labels on the slider line

**Files:**
- Modify: `index.html:34-44` (control row)
- Modify: `src/main.ts` (readout → tick rendering/highlight)
- Modify: `src/style.css:126-173` (readout/ticks styles)

**Interfaces:**
- Consumes: nothing from Tasks 1–3 (independent of engine).
- Produces: `.level-ticks` container populated from `DENSITY_LABELS`; `#level-readout` removed from DOM, TS, and CSS.

- [ ] **Step 1: Update `index.html`** — replace the control row block (lines 34–44) with:

```html
    <div class="control-row">
      <div class="control-row__label">
        <label for="level">Buzzword Density</label>
      </div>
      <input type="range" id="level" min="0" max="100" value="15" step="1" />
      <div class="level-ticks" id="level-ticks" aria-hidden="true"></div>
    </div>
```

- [ ] **Step 2: Update `src/main.ts`** — remove the `densityReadout` lookup and `updateDensityReadout()`; render ticks from `DENSITY_LABELS` and highlight the active one:

```ts
const tickRow = required<HTMLElement>('#level-ticks');

function renderTicks(): void {
  tickRow.replaceChildren(
    ...DENSITY_LABELS.map(([, label]) => {
      const span = document.createElement('span');
      span.className = 'level-tick';
      span.textContent = label;
      return span;
    }),
  );
}

function updateActiveTick(): void {
  const value = Number(densitySlider.value);
  const activeIndex = DENSITY_LABELS.findIndex(([threshold]) => value <= threshold);
  const index = activeIndex === -1 ? DENSITY_LABELS.length - 1 : activeIndex;
  const ticks = Array.from(tickRow.querySelectorAll<HTMLElement>('.level-tick'));
  ticks.forEach((tick, i) => {
    tick.classList.toggle('level-tick--active', i === index);
  });
}
```

Wire-up: replace `densitySlider.addEventListener('input', updateDensityReadout)` with `densitySlider.addEventListener('input', updateActiveTick)`, and replace the bottom-of-file `updateDensityReadout()` call with `renderTicks(); updateActiveTick();`. Delete the `densityLabel()` function and `densityReadout`/`#level-readout` references entirely.

- [ ] **Step 3: Update `src/style.css`** — delete the `.level-readout` rule (lines 130–133) and replace the `.level-ticks` rule (lines 165–173) with:

```css
.level-ticks {
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
  margin-top: 0.4rem;
  gap: 0.5rem;
}

.level-tick {
  transition: color 0.15s ease;
}

.level-tick:first-child {
  text-align: left;
}

.level-tick:last-child {
  text-align: right;
}

.level-tick--active {
  color: var(--stamp-red);
  font-weight: 700;
}

@media (max-width: 560px) {
  .level-ticks {
    font-size: 0.55rem;
    gap: 0.25rem;
  }
}
```

- [ ] **Step 4: Verify visually**

Run: `npm run dev` (port 8812), then use agentchrome to screenshot `http://localhost:8812` — all five labels visible on one line under the slider, active label red/bold, moves as slider moves, no horizontal overflow at 375px width. Shut down agentchrome afterward (`agentchrome connect --disconnect`).

- [ ] **Step 5: Full gate and commit**

Run: `make checkall`
Expected: green (typecheck catches any dangling readout references).

```bash
git add index.html src/main.ts src/style.css
git commit -m "feat: render all five density labels on the slider line with active highlight"
```

---

### Task 5: Docs and final verification

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md` (only if it documents removed APIs — check for `pickRand` / readout mentions)

- [ ] **Step 1: Add a CHANGELOG entry** under a new Unreleased/date heading summarizing: single-pass cascade-proof engine, a/an agreement, capitalization preservation, level-0 maximum-density fix, curated + expanded word lists, slider tick labels.

- [ ] **Step 2: Grep for stale doc references**

Run: `grep -rn "pickRand\|level-readout\|densityLabel" README.md CHANGELOG.md docs/ 2>/dev/null`
Fix any hits in README.md.

- [ ] **Step 3: Final full gate**

Run: `make checkall`
Expected: green.

- [ ] **Step 4: Before/after demo** — generate 3 sample outputs at heavy density with the scratchpad script pattern from the design phase and include one in the final report to the user.

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md README.md
git commit -m "docs: changelog for coherent jargon engine and slider labels"
```
