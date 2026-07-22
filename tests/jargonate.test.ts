import { describe, expect, it } from 'vitest';
import { buildMatcher, jargonate, parseAdvTable, parseWordList, type JargonData } from '../src/jargonate';
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
    const input = 'The team is working on an important update and it will answer the question.';
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

  it('at level 100 leaves untouched articles alone even when acronym/silent-h pronunciation disagrees with spelling', () => {
    const input = 'We will meet in an hour to discuss an MBA and a unicorn.';
    const data = makeData({
      adj: ['synergistic'],
      adv: new Map([['nonexistentword', ['should never fire']]]),
    });
    const result = jargonate(input, data, 100, alwaysRng);
    expect(result).toBe(`${input}\n\nCLOSER.`);
    expect(result).not.toContain('\u0000');
  });

  it('does not inject an adjective inside a hyphenated compound', () => {
    const data: JargonData = { adj: ['synergistic'], sen: ['CLOSER.'], adv: new Map() };
    const input = 'This is a state-of-the-art solution.';
    const result = jargonate(input, data, 0, () => 0);
    expect(result).toContain('state-of-the-art');
    expect(result).not.toContain('\u0000');
  });
});

describe('output-coherence fixes', () => {
  describe('Fix 1 — percent smoothing', () => {
    it('turns a substituted-word-plus-percent into "<word> percent"', () => {
      const data = makeData({ adv: new Map([['50', ['fifty']]]) });
      const result = jargonate('We are at 50% now.', data, 0, alwaysRng);
      expect(result).toContain('fifty percent now');
      expect(result).not.toContain('fifty%');
    });

    it('leaves an untouched numeric percent (no matching key) as-is', () => {
      const data = makeData();
      const result = jargonate('99% pure', data, 0, alwaysRng);
      expect(result).toContain('99% pure');
    });
  });

  describe('Fix 2 — version-number guard', () => {
    it('does not spell out a purely numeric key immediately preceded by a capitalized word', () => {
      const data = makeData({
        adv: new Map([
          ['5', ['five']],
          ['3', ['three']],
        ]),
      });
      const result = jargonate('Fable 5 is here.', data, 0, alwaysRng);
      expect(result).toContain('Fable 5');
    });

    it('still spells out a numeric key not preceded by a capitalized word', () => {
      const data = makeData({
        adv: new Map([
          ['5', ['five']],
          ['3', ['three']],
        ]),
      });
      const result = jargonate('we announced 3 things', data, 0, alwaysRng);
      expect(result).toContain('we announced three things');
    });
  });

  describe('Fix 3 — article-insertion stopwords', () => {
    it('does not insert an adjective between an article and "same"', () => {
      const data: JargonData = { adj: ['synergistic'], sen: ['CLOSER.'], adv: new Map() };
      const result = jargonate('the same way works', data, 0, alwaysRng);
      expect(result).toContain('the same way');
    });

    it('still inserts an adjective before an ordinary noun', () => {
      const data: JargonData = { adj: ['synergistic'], sen: ['CLOSER.'], adv: new Map() };
      const result = jargonate('the plan works', data, 0, alwaysRng);
      expect(result).toContain('the synergistic plan');
    });
  });

  describe('Fix 4 — modal-safe multi-word rows', () => {
    it('prefers the phrase key "have to" over the shorter single-word key "have"', () => {
      const data = makeData({
        adv: new Map([
          ['have', ['have furiously']],
          ['have to', ['must necessarily']],
        ]),
      });
      const result = jargonate('we have to open it', data, 0, alwaysRng);
      expect(result).toContain('we must necessarily open it');
      expect(result).not.toContain('furiously');
    });

    it('never wedges an adverb into "have/has/had ... to" on the real data table', () => {
      const data = loadJargonData();
      for (let i = 0; i < 25; i++) {
        const result = jargonate('We have to open a support ticket.', data, 0);
        expect(result).not.toMatch(/\bha(?:ve|s|d) \w+ly to\b/i);
      }
    });
  });

  describe('Fix 5 — clause-safe and ambiguity fixes (real data)', () => {
    it('"know" replacements are clause-safe, not just object-safe', () => {
      const data = loadJargonData();
      for (let i = 0; i < 25; i++) {
        const result = jargonate('I know there has been much discussion over this.', data, 0);
        expect(result).not.toMatch(/have knowledge of there/i);
      }
    });

    it('drops the noun/verb-ambiguous "use" row ("found use of it")', () => {
      const data = loadJargonData();
      for (let i = 0; i < 25; i++) {
        const result = jargonate('who have found use of it', data, 0);
        expect(result).not.toMatch(/operationalize of it/i);
        expect(result).not.toMatch(/\bleverage of it\b/i);
      }
    });

    it('drops the nonsense "supportance" replacement for the verb "support"', () => {
      const data = loadJargonData();
      for (let i = 0; i < 25; i++) {
        const result = jargonate('we need to support this ticket', data, 0);
        expect(result).not.toMatch(/supportance/i);
      }
    });

    it('drops the "help,empower,enable" row ("need help" breaking to "need empower")', () => {
      const data = loadJargonData();
      for (let i = 0; i < 25; i++) {
        const result = jargonate('we need help with this', data, 0);
        expect(result).not.toMatch(/\b(?:empower|enable)\b/i);
      }
    });

    it('"plan"/"plans" no longer produce a missing-verb sentence for "plan to X"', () => {
      const data = loadJargonData();
      for (let i = 0; i < 25; i++) {
        const result = jargonate('we plan to launch next month', data, 0);
        expect(result).not.toMatch(/\bstrategic framework to\b/i);
        expect(result).not.toMatch(/\broadmap to\b/i);
      }
    });

    it('"think" replacements read naturally before a following clause', () => {
      const data = loadJargonData();
      for (let i = 0; i < 25; i++) {
        const result = jargonate('I think we should proceed', data, 0);
        expect(result).not.toMatch(/\b(?:ideate|strategize) we\b/i);
      }
    });
  });

  describe('Fix 6 — adjacent-substitution cooldown', () => {
    it('skips a table substitution immediately adjacent (whitespace-only gap) to the previous one', () => {
      const data = makeData({
        adv: new Map([
          ['alpha', ['first']],
          ['beta', ['second']],
        ]),
      });
      const result = jargonate('alpha beta gamma', data, 0, alwaysRng);
      expect(result).toContain('first beta gamma');
    });

    it('fires both substitutions when they are not adjacent', () => {
      const data = makeData({
        adv: new Map([
          ['alpha', ['first']],
          ['beta', ['second']],
        ]),
      });
      const result = jargonate('alpha gamma beta', data, 0, alwaysRng);
      expect(result).toContain('first gamma second');
    });

    it('article-branch adjective insertion does not block an adjacent noun substitution', () => {
      const data = makeData({ adj: ['synergistic'], adv: new Map([['plan', ['roadmap']]]) });
      const result = jargonate('the plan works', data, 0, alwaysRng);
      expect(result).toContain('the synergistic roadmap works');
    });

    it('a gap containing punctuation does not count as adjacent', () => {
      const data = makeData({
        adv: new Map([
          ['alpha', ['first']],
          ['beta', ['second']],
        ]),
      });
      const result = jargonate('alpha, beta', data, 0, alwaysRng);
      expect(result).toContain('first, second');
    });
  });
});

describe('recorded engine follow-ups', () => {
  describe('Fix A — preserve untouched input formatting', () => {
    it('round-trips whitespace/indentation the engine never touched, at level 100', () => {
      const data = makeData({
        adj: ['synergistic'],
        adv: new Map([['nonexistentword', ['should never fire']]]),
      });
      const input = 'keep  double  spaces\n    and indentation.';
      const result = jargonate(input, data, 100, alwaysRng);
      expect(result).toBe(`${input}\n\nCLOSER.`);
    });
  });

  describe('Fix B — sentence-position-aware capitalization', () => {
    it('capitalizes the replacement when the match is at a sentence start', () => {
      const data = makeData({ adv: new Map([['friday', ['the fifth day of the week']]]) });
      const result = jargonate('Friday we ship.', data, 0, alwaysRng);
      expect(result).toContain('The fifth day of the week we ship.');
    });

    it('leaves the replacement as authored when the match is mid-sentence', () => {
      const data = makeData({ adv: new Map([['friday', ['the fifth day of the week']]]) });
      const result = jargonate('Ship by Friday now.', data, 0, alwaysRng);
      expect(result).toContain('by the fifth day of the week');
    });

    it('still capitalizes a substitution-introduced sentence start (existing behavior)', () => {
      const data = makeData({ adv: new Map([['we', ['the undersigned']]]) });
      const result = jargonate('We agree.', data, 0, alwaysRng);
      expect(result.startsWith('The undersigned agree.')).toBe(true);
    });

    it('preserves authored capitalization of an acronym replacement mid-sentence', () => {
      const data = makeData({ adv: new Map([['ceo', ['Chief Executive Officer']]]) });
      const result = jargonate('Our CEO spoke.', data, 0, alwaysRng);
      expect(result).toContain('Chief Executive Officer');
    });
  });

  describe('Fix C — cached matcher', () => {
    it('produces consistent results across repeated calls with the same data object', () => {
      const data = makeData({ adv: new Map([['cat', ['tiger team']]]) });
      const first = jargonate('the cat sat', data, 0, alwaysRng);
      const second = jargonate('the cat sat', data, 0, alwaysRng);
      expect(first).toBe(second);
    });

    it('returns the identical compiled matcher for the same data.adv identity, and a new one for a structurally-equal clone', () => {
      const data = makeData({ adv: new Map([['cat', ['tiger team']]]) });
      const first = buildMatcher(data);
      const second = buildMatcher(data);
      expect(second).toBe(first);

      const clone: JargonData = { ...data, adv: new Map(data.adv) };
      const third = buildMatcher(clone);
      expect(third).not.toBe(first);
    });
  });

  describe('Fix D — documented guards', () => {
    it('CAPITALIZED_LEAD_IN suppresses a bare-number substitution after any capitalized token (e.g. an acronym)', () => {
      const data = makeData({ adv: new Map([['5', ['five']]]) });
      const result = jargonate('CI&T 5 rollout', data, 0, alwaysRng);
      expect(result).toContain('CI&T 5');
    });

    it('still spells out a bare number not preceded by a capitalized token', () => {
      const data = makeData({ adv: new Map([['5', ['five']]]) });
      const result = jargonate('in 5 days', data, 0, alwaysRng);
      expect(result).toContain('in five days');
    });
  });
});
