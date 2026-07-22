import { describe, expect, it } from 'vitest';
import { activeTickIndex } from '../src/density';

describe('activeTickIndex', () => {
  it.each([
    [0, 0],
    [20, 0],
    [21, 1],
    [40, 1],
    [41, 2],
    [60, 2],
    [61, 3],
    [80, 3],
    [81, 4],
    [100, 4],
    [101, 4],
  ])('activeTickIndex(%i) === %i', (value, expected) => {
    expect(activeTickIndex(value)).toBe(expected);
  });
});
