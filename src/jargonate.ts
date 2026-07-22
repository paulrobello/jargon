export const DEFAULT_JARGON_LEVEL = 85;
export const MAX_INPUT_LENGTH = 8192;

export interface JargonData {
  adj: string[];
  sen: string[];
  adv: Map<string, string[]>;
}

function escapeRegExp(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function randomInt(maxInclusive: number): number {
  return Math.floor(Math.random() * (maxInclusive + 1));
}

/**
 * Mirrors the PHP original's mt_rand(0,100)>level roll: lower level = more
 * frequent substitution. forceSubstitute bypasses the roll entirely.
 */
export function pickRand(
  list: string[],
  prepend = ' ',
  append = ' ',
  fallback = '',
  level: number = DEFAULT_JARGON_LEVEL,
  forceSubstitute = false,
): string {
  if (list.length === 0) return fallback;
  if (forceSubstitute || randomInt(100) > level) {
    return prepend + list[randomInt(list.length - 1)] + append;
  }
  return fallback;
}

export function parseWordList(raw: string): string[] {
  return raw.split('\n');
}

/**
 * word,replacement1,replacement2,... rows from adv.txt and rep.txt, merged
 * into one table keyed by first-appearance order (matches PHP array semantics
 * where re-assigning an existing key updates its value but not its position).
 */
export function parseAdvTable(advRaw: string, repRaw: string): Map<string, string[]> {
  const table = new Map<string, string[]>();
  for (const rawLine of `${advRaw}\n${repRaw}`.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const fields = line.split(',');
    const word = fields.shift();
    if (word === undefined) continue;
    table.set(word, fields);
  }
  return table;
}

export function jargonate(content: string, data: JargonData, level: number = DEFAULT_JARGON_LEVEL): string {
  const effectiveLevel = level || DEFAULT_JARGON_LEVEL;
  let text = content.length > MAX_INPUT_LENGTH ? content.slice(0, MAX_INPUT_LENGTH) : content;

  text = text.replace(/\b(a|the|is)\b/gi, (match) => match + pickRand(data.adj, '', ' ', '', effectiveLevel));

  for (const [word, replacements] of data.adv) {
    const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
    text = text.replace(pattern, (match) => pickRand(replacements, ' ', ' ', match, effectiveLevel));
  }

  text += `\n\n${pickRand(data.sen, '', '', '', DEFAULT_JARGON_LEVEL, true)}`;
  return text;
}
