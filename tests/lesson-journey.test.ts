import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/learning/curriculum';
import { lessonJourney } from '../src/learning/lessonJourney';

describe('curriculum continuity', () => {
  it('starts beginners on the first available lesson', () => {
    const journey = lessonJourney({ lessons: [] });
    expect(journey).toMatchObject({
      completed: 0,
      total: LESSONS.length,
      next: LESSONS[0],
    });
  });

  it('ignores duplicate and unknown completion identifiers', () => {
    const id = LESSONS[0].id;
    const journey = lessonJourney({ lessons: [id, id, 'not-a-real-lesson'] });
    expect(journey.completed).toBe(1);
    expect(journey.next?.id).toBe(LESSONS[1].id);
  });

  it('does not recommend an already completed lesson', () => {
    const journey = lessonJourney({ lessons: LESSONS.map(lesson => lesson.id) });
    expect(journey.completed).toBe(LESSONS.length);
    expect(journey.next).toBeNull();
  });
});
