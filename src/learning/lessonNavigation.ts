import { LESSONS } from './curriculum';
import type { Lesson } from './types';

/** A refreshable lesson URL; never trust arbitrary path segments as curriculum IDs. */
export function lessonFromHash(hash: string): Lesson | null {
  const prefix = '#/academy/';
  if (!hash.startsWith(prefix)) return null;
  const id = hash.slice(prefix.length);
  if (!id || id.includes('/') || id.includes('?') || id.includes('#')) return null;
  return LESSONS.find((lesson) => lesson.id === id) ?? null;
}
