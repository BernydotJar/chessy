import { LESSONS } from './curriculum';
import type { Progress } from './progress';

/** Count only valid curriculum IDs, independent of guest/account storage shape. */
export function lessonJourney(progress: Pick<Progress, 'lessons'>) {
  const finished = new Set(progress.lessons);
  const completed = LESSONS.filter(lesson => finished.has(lesson.id)).length;
  return {
    completed,
    total: LESSONS.length,
    next: LESSONS.find(lesson => !finished.has(lesson.id)) ?? null,
  };
}
