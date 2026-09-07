import { parseProgress, type Progress, type PuzzleReviewRecord } from '../learning/progress';

const sortedUnion = (left: string[], right: string[]) => [...new Set([...left, ...right])].sort();

const mergeReview = (left: PuzzleReviewRecord[], right: PuzzleReviewRecord[]) => {
  const byId = new Map<string, PuzzleReviewRecord>();
  for (const item of [...left, ...right]) {
    const current = byId.get(item.id);
    if (!current) {
      byId.set(item.id, { ...item });
      continue;
    }
    const wrong = Math.max(current.wrong, item.wrong);
    const correct = Math.min(wrong, Math.max(current.correct, item.correct));
    byId.set(item.id, {
      id: item.id,
      wrong,
      correct,
      lastDay: current.lastDay >= item.lastDay ? current.lastDay : item.lastDay,
    });
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
};

export function normalizeProgress(progress: Progress): Progress {
  return parseProgress(JSON.stringify(progress));
}

/**
 * Merge is intentionally monotonic/idempotent. Uploading the same snapshot twice
 * cannot duplicate XP, completions, activity days, or review counters.
 */
export function mergeProgress(local: Progress, remote: Progress): Progress {
  const safeLocal = normalizeProgress(local);
  const safeRemote = normalizeProgress(remote);
  const review = mergeReview(safeLocal.review, safeRemote.review);
  const reviewWrongTotal = review.reduce((total, item) => total + item.wrong, 0);
  return normalizeProgress({
    version: 2,
    solved: sortedUnion(safeLocal.solved, safeRemote.solved),
    lessons: sortedUnion(safeLocal.lessons, safeRemote.lessons),
    days: sortedUnion(safeLocal.days, safeRemote.days),
    mistakes: Math.max(safeLocal.mistakes, safeRemote.mistakes, reviewWrongTotal),
    review,
  });
}

export function progressEqual(left: Progress, right: Progress) {
  return JSON.stringify(normalizeProgress(left)) === JSON.stringify(normalizeProgress(right));
}
