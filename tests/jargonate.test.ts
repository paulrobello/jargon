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
