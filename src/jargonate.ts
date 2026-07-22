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

// Cache the compiled matcher per data.adv identity — building it is a ~2,300-alternative
// regex compile, so re-running it on every jargonate() call is wasted work. Sharing one
// RegExp instance across calls is safe despite the /g flag: String.replace always scans
// from index 0 regardless of the RegExp's lastIndex. data is loaded once and treated as
// immutable in this app, so keying on the Map's identity (not a deep hash) is sufficient;
// a mutated same-identity Map would go stale, but nothing in the app does that.
const matcherCache = new WeakMap<Map<string, string[]>, RegExp>();

/**
 * One alternation over the article rule plus every table key, longest key
 * first so e.g. "answers" wins over "answer" at the same position.
 *
 * The article alternative is tried before any table key, so it always wins a
 * tie at the same position — a table row keyed "a", "an", or "the" would be
 * silently unreachable (dead) under this matcher.
 */
export function buildMatcher(data: JargonData): RegExp {
  const cached = matcherCache.get(data.adv);
  if (cached) return cached;
  const keys = [...data.adv.keys()].sort((a, b) => b.length - a.length).map(boundaryWrap);
  const keyAlternation = keys.length > 0 ? `|(${keys.join('|')})` : '';
  const matcher = new RegExp(`(?<![\\w-])(a|an|the)(?![\\w-])${keyAlternation}`, 'gi');
  matcherCache.set(data.adv, matcher);
  return matcher;
}

/** Uppercase the replacement's first letter when the source word had one. */
function matchCase(source: string, replacement: string): string {
  if (/^[A-Z]/.test(source) && replacement.length > 0) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/** True at the very start of the string, or right after sentence-ending punctuation / a line break. */
const SENTENCE_START = /(^|[.!?]["')\]]?[ \t\n]+|\n[ \t]*)$/;
function isSentenceStart(precedingText: string, offset: number): boolean {
  return offset === 0 || SENTENCE_START.test(precedingText);
}

/**
 * Heuristic a/an choice: vowel-initial words take "an" except common
 * consonant-sounding starts (unique, user, one, european, ...).
 */
const CONSONANT_SOUND = /^(uniq|unit|univ|use|user|one|once|eu|utop|ubiq)/i;

/** Words after which inserting an adjective would read wrong (e.g. "the same way"). */
const ARTICLE_INSERTION_STOPWORD = /^\s+(?:same|other|only|own|very|next|last|first|latter|former|aforementioned)\b/i;

/**
 * A capitalized word right before a numeric key marks it as a product/version number, not a count.
 * Intentionally broad: any capitalized token (including one with internal punctuation, e.g. "CI&T")
 * suppresses the following bare-number substitution, not just recognized product-name patterns.
 */
const CAPITALIZED_LEAD_IN = /(?:^|[\s(])[A-Z][\w&.-]*[ \t]+$/;

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

/** A letter glued directly to '%' (e.g. from a spelled-out number) reads as "fifty percent". */
function smoothPercent(text: string): string {
  return text.replace(/([a-zA-Z])%/g, '$1 percent');
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

  // End offset (in the original string) of the last TABLE substitution that
  // fired, so a second table substitution starting right after it (separated
  // by whitespace only, no intervening word) can be suppressed — this is what
  // stops adverbs from stacking on adjacent words ("furiously found delicately").
  // Article-branch adjective insertions never read or write this: they're
  // exempt from the cooldown in both directions.
  let lastTableEnd: number | null = null;

  text = text.replace(buildMatcher(data), (match: string, ...rest: unknown[]) => {
    // Capture-group count varies with whether any table keys exist (the key
    // alternation group is only added when data.adv is non-empty), so pull
    // offset/string from the end rather than assuming a fixed arity.
    const string = rest[rest.length - 1] as string;
    const offset = rest[rest.length - 2] as number;
    const article = rest[0] as string | undefined;
    if (article !== undefined) {
      if (data.adj.length === 0 || !rolls(level, rng)) return match;
      if (ARTICLE_INSERTION_STOPWORD.test(string.slice(offset + match.length))) return match;
      const adjective = randomItem(data.adj, rng);
      const agreed = article.toLowerCase() === 'the' ? article : matchCase(article, articleFor(adjective));
      return `${agreed} ${adjective}`;
    }
    const replacements = data.adv.get(match.toLowerCase());
    if (!replacements || !rolls(level, rng)) return match;
    if (/^\d+$/.test(match) && CAPITALIZED_LEAD_IN.test(string.slice(0, offset))) return match;
    // Cooldown walks left-to-right, so when two keyed words are adjacent, the
    // first one to match deterministically wins and the second is suppressed.
    if (lastTableEnd !== null && /^\s+$/.test(string.slice(lastTableEnd, offset))) return match;
    lastTableEnd = offset + match.length;
    const replacement = randomItem(replacements, rng);
    // Only force replacement casing at a sentence start; mid-sentence a
    // capitalized source (proper noun, acronym) shouldn't force-capitalize
    // the replacement — the replacement is used as authored instead.
    const cased = isSentenceStart(string.slice(0, offset), offset) ? matchCase(match, replacement) : replacement;
    return `${SENTINEL}${cased}`;
  });

  text = smoothPercent(fixArticles(text).split(SENTINEL).join(''));

  if (data.sen.length === 0) return text;
  return `${text}\n\n${randomItem(data.sen, rng)}`;
}
