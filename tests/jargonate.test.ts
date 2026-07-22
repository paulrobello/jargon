import { describe, expect, it } from 'vitest';
import { jargonate, parseAdvTable, parseWordList, pickRand } from '../src/jargonate';
import { loadJargonData } from '../src/loadData';

describe('parseWordList', () => {
  it('splits on newlines without trimming, matching the original PHP explode()', () => {
    expect(parseWordList('a\nb\nc')).toEqual(['a', 'b', 'c']);
    expect(parseWordList('a\nb\n')).toEqual(['a', 'b', '']);
  });
});

describe('parseAdvTable', () => {
  it('merges adv and rep rows keyed by the first field', () => {
    const table = parseAdvTable('foo,bar,baz\n', '1,one\n');
    expect(table.get('foo')).toEqual(['bar', 'baz']);
    expect(table.get('1')).toEqual(['one']);
  });

  it('skips blank lines and keeps first-seen key order when a later row overrides it', () => {
    const table = parseAdvTable('foo,bar\n\n', 'foo,qux\n');
    expect([...table.keys()]).toEqual(['foo']);
    expect(table.get('foo')).toEqual(['qux']);
  });
});

describe('pickRand', () => {
  const list = ['x1', 'x2', 'x3'];

  it('never substitutes at level 100 without forcing', () => {
    let substituted = 0;
    for (let i = 0; i < 300; i++) {
      if (pickRand(list, ' ', ' ', '', 100, false) !== '') substituted++;
    }
    expect(substituted).toBe(0);
  });

  it('almost always substitutes at level 0', () => {
    let substituted = 0;
    for (let i = 0; i < 300; i++) {
      if (pickRand(list, ' ', ' ', '', 0, false) !== '') substituted++;
    }
    expect(substituted).toBeGreaterThan(250);
  });

  it('always substitutes when forced, regardless of level', () => {
    expect(pickRand(['only'], '[', ']', 'default', 100, true)).toBe('[only]');
  });
});

describe('jargonate', () => {
  const data = loadJargonData();

  it('produces a non-empty string for simple input', () => {
    expect(jargonate('hello world', data).trim()).not.toBe('');
  });

  it('leaves words unchanged at level 100 and only appends the forced closing sentence', () => {
    const input = 'the cat sat on the mat';
    const result = jargonate(input, data, 100);
    expect(result.startsWith(input)).toBe(true);
    expect(result.length).toBeGreaterThan(input.length);
  });

  it('falls back to the default level when level is 0', () => {
    const result = jargonate('a', data, 0);
    expect(result.length).toBeGreaterThan(0);
  });

  it('truncates input longer than 8192 characters before transforming', () => {
    const longInput = 'a'.repeat(9000);
    const result = jargonate(longInput, data, 100);
    const body = result.slice(0, result.indexOf('\n\n'));
    expect(body.length).toBe(8192);
  });
});
