import { describe, expect, it } from 'vitest';
import { mergeProgress, progressEqual } from '../src/sync/progressMerge';
import type { Progress } from '../src/learning/progress';

const progress = (overrides: Partial<Progress> = {}): Progress => ({
  version: 2,
  solved: [],
  lessons: [],
  days: [],
  mistakes: 0,
  review: [],
  ...overrides,
});

describe('cloud progress merge', () => {
  it('unions achievements and keeps review counters monotonic', () => {
    const local = progress({
      solved: ['rook-file'],
      lessons: ['board-vision'],
      days: ['2026-09-06'],
      mistakes: 1,
      review: [{ id: 'rook-rank', wrong: 1, correct: 0, lastDay: '2026-09-06' }],
    });
    const remote = progress({
      solved: ['rook-rank'],
      days: ['2026-09-07'],
      mistakes: 2,
      review: [{ id: 'rook-rank', wrong: 2, correct: 1, lastDay: '2026-09-07' }],
    });
    const merged = mergeProgress(local, remote);
    expect(merged.solved).toEqual(['rook-file', 'rook-rank']);
    expect(merged.lessons).toEqual(['board-vision']);
    expect(merged.days).toEqual(['2026-09-06', '2026-09-07']);
    expect(merged.mistakes).toBe(2);
    expect(merged.review).toEqual([{ id: 'rook-rank', wrong: 2, correct: 1, lastDay: '2026-09-07' }]);
  });

  it('is idempotent when the same snapshot is uploaded repeatedly', () => {
    const first = progress({
      solved: ['rook-file'],
      days: ['2026-09-07'],
      mistakes: 1,
      review: [{ id: 'rook-rank', wrong: 1, correct: 0, lastDay: '2026-09-07' }],
    });
    const merged = mergeProgress(first, first);
    expect(progressEqual(first, merged)).toBe(true);
    expect(mergeProgress(merged, first)).toEqual(merged);
  });

  it('rejects forged identifiers before they reach cloud state', () => {
    const forged = progress({ solved: ['not-a-real-puzzle'] });
    expect(() => mergeProgress(forged, progress())).toThrow(/Invalid identifiers/);
  });
});
