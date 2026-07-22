import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dataDir = join(__dirname, '..', 'src', 'data');
const read = (name: string) => readFileSync(join(dataDir, name), 'utf8');

describe('word list data files', () => {
  it('adj.txt entries are non-blank, untrimmed-free, lowercase-or-hyphenated phrases', () => {
    const lines = read('adj.txt')
      .split('\n')
      .filter((l) => l.length > 0);
    expect(lines.length).toBeGreaterThan(100);
    for (const line of lines) {
      expect(line).toBe(line.trim());
      expect(line).toMatch(/^[a-zA-Z][a-zA-Z0-9' -]*[a-zA-Z0-9]$/);
    }
  });

  it('adv.txt and rep.txt rows are well-formed CSV with trimmed fields', () => {
    for (const file of ['adv.txt', 'rep.txt']) {
      const lines = read(file)
        .split('\n')
        .filter((l) => l.length > 0);
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
    const content = read('sen.txt');
    const lines = content.split('\n').filter((l) => l.length > 0);
    expect(lines.length).toBe(41);
    expect(content.endsWith('\n')).toBe(true);
    for (const line of lines) {
      expect(line).toBe(line.trim());
      expect(line).toMatch(/[.!?]$/);
    }
  });
});
