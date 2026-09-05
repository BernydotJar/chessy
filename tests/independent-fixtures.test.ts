import { it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PUZZLES } from '../src/learning/puzzles';
import en from '../src/locales/en/translation.json';
import es from '../src/locales/es/translation.json';
import pt from '../src/locales/pt/translation.json';
function keys(value: unknown, prefix = ''): string[] {
 if (!value || typeof value !== 'object') return [prefix];
 return Object.entries(value).flatMap(([key, child]) => keys(child, prefix ? `${prefix}.${key}` : key)).sort();
}
it('all three languages have exactly the same translation contract', () => {
 expect(keys(es)).toEqual(keys(en)); expect(keys(pt)).toEqual(keys(en));
});
it('exports the exact shipped puzzle contract for a second implementation', () => {
 expect(PUZZLES).toHaveLength(112);
 if (process.env.EXPORT_CHESS_FIXTURES === '1') {
  mkdirSync('progress/evidence/release', { recursive: true });
  writeFileSync('progress/evidence/release/puzzle-fixtures.json', JSON.stringify(PUZZLES, null, 2) + '\n');
 }
});
