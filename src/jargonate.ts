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

/**
 * Roll semantics: lower level = more frequent substitution, linearly from
 * 100% at level 0 to 0% at level 100 (rng is uniform on [0, 1)).
 */
function rolls(level: number, rng: Rng): boolean {
  return rng() < (100 - level) / 100;
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
  return new RegExp(`(?<![\\w-])(a|an|the)(?![\\w-])${keyAlternation}`, 'gi');
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

/**
 * Marks the start of engine-substituted text so a/an agreement (below) can be
 * scoped to only what the engine changed, never to text the user typed as-is.
 */
const SENTINEL = '\u0000';

/**
 * Fix a/an agreement, but only immediately before a sentinel-marked word —
 * i.e. only where the engine itself substituted the following word. Articles
 * preceding untouched input are never rewritten, since acronym/silent-h
 * pronunciation can't be inferred from spelling alone.
 */
function fixArticles(text: string): string {
  return text.replace(
    new RegExp(`(?<![\\w-])(a|an)([ \\t]+)${SENTINEL}([A-Za-z][\\w-]*)`, 'gi'),
    (_match, article: string, gap: string, next: string) =>
      `${matchCase(article, articleFor(next))}${gap}${SENTINEL}${next}`,
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
  text = text.split(SENTINEL).join('');

  text = text.replace(buildMatcher(data), (match, article: string | undefined) => {
    if (article !== undefined) {
      if (data.adj.length === 0 || !rolls(level, rng)) return match;
      const adjective = randomItem(data.adj, rng);
      const agreed = article.toLowerCase() === 'the' ? article : matchCase(article, articleFor(adjective));
      return `${agreed} ${adjective}`;
    }
    const replacements = data.adv.get(match.toLowerCase());
    if (!replacements || !rolls(level, rng)) return match;
    return `${SENTINEL}${matchCase(match, randomItem(replacements, rng))}`;
  });

  text = normalizeWhitespace(fixArticles(text).split(SENTINEL).join(''));

  if (data.sen.length === 0) return text;
  return `${text}\n\n${randomItem(data.sen, rng)}`;
}
