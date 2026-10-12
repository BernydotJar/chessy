import type { Puzzle, Category, Level } from './types';

/** Stable pedagogical order; IDs remain immutable for stored learning progress. */
export const TRAINING_BLOCK_SIZE = 40;
const categories: Category[] = ['basics','mate','fork','tactics','endgame','calculation','mixed'];
const levels: Level[] = ['beginner','easy','intermediate','advanced'];

/** Keep original fundamentals together, then progressively interleave tactical themes. */
export function orderPracticePuzzles(input: readonly Puzzle[]): Puzzle[] {
  const foundations = input.filter(p => p.category === 'basics' && p.source === 'original');
  const visited = new Set(foundations.map(p => p.id));
  const ordered: Puzzle[] = [...foundations];
  for (const level of levels) {
    const slice = input.filter(p => p.level === level && !visited.has(p.id));
    const queues = categories.map(category => slice.filter(p => p.category === category).sort((a,b) =>
      (a.rating ?? 0) - (b.rating ?? 0) || a.id.localeCompare(b.id)));
    let changed = true;
    while(changed) {
      changed = false;
      for(const queue of queues) {
        const next = queue.shift();
        if (next) { ordered.push(next); changed = true; }
      }
    }
  }
  return ordered;
}

export function splitPracticeBlocks(puzzles: readonly Puzzle[], size=TRAINING_BLOCK_SIZE): Puzzle[][] {
  if (!Number.isInteger(size) || size <= 0) throw new Error('invalid-block-size');
  const ordered=orderPracticePuzzles(puzzles);
  const blocks: Puzzle[][] = [];
  for(let start=0;start<ordered.length;start+=size) blocks.push(ordered.slice(start,start+size));
  return blocks;
}

/** Number of times the learner has to act; scripted opponent replies are not counted. */
export const learnerMovesRequired = (puzzle: Puzzle) => Math.ceil(puzzle.solution.length / 2);
export const learnerMoveNumber = (ply: number, puzzle: Puzzle) =>
  Math.min(learnerMovesRequired(puzzle), Math.floor(Math.max(0,ply)/2)+1);
