import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { PUZZLES } from '../src/learning/puzzles';
import sample from '../src/data/lichess-sample.json';
import expansion from '../src/data/lichess-training-expansion.json';
import {
  learnerMoveNumber, learnerMovesRequired, orderPracticePuzzles,
  splitPracticeBlocks, TRAINING_BLOCK_SIZE,
} from '../src/learning/trainingBlocks';

describe('audited five-block training bank', () => {
  it('contains 16 original exercises + 96 legacy CC0 + 88 verified CC0 = 200', () => {
    expect(sample).toHaveLength(96);
    expect(expansion).toHaveLength(88);
    expect(PUZZLES).toHaveLength(200);
    expect(new Set(PUZZLES.map(p => p.id)).size).toBe(200);
    expect(new Set(PUZZLES.map(p => p.fen)).size).toBe(200);
  });

  it('groups the real bank into five blocks of forty without losing or repeating exercises', () => {
    const blocks=splitPracticeBlocks(PUZZLES);
    expect(TRAINING_BLOCK_SIZE).toBe(40);
    expect(blocks).toHaveLength(5);
    expect(blocks.map(b => b.length)).toEqual([40,40,40,40,40]);
    const ids=blocks.flat().map(p=>p.id);
    expect(new Set(ids)).toEqual(new Set(PUZZLES.map(p=>p.id)));
    expect(blocks[0].slice(0,2).map(p=>p.id)).toEqual(['rook-file','rook-rank']);
  });

  it('filters skill themes into their own independent capped blocks', () => {
    const forks=PUZZLES.filter(p=>p.category==='fork');
    expect(forks).toHaveLength(37);
    expect(splitPracticeBlocks(forks).map(b=>b.length)).toEqual([37]);
    expect(splitPracticeBlocks([])).toEqual([]);
    expect(() => splitPracticeBlocks(PUZZLES,0)).toThrow('invalid-block-size');
  });

  it('the rook second exercise only permits the intended rook capture on g1', () => {
    const puzzle=PUZZLES.find(p=>p.id==='rook-rank');
    expect(puzzle).toBeDefined();
    const chess=new Chess(puzzle!.fen);
    const moves=chess.moves({verbose:true}).filter(m=>m.to==='g1');
    expect(moves.map(m=>m.from+m.to)).toEqual(['a1g1']);
    expect(chess.isCheck()).toBe(false);
  });

  it('explains only the learner turns; opponent responses are automatic', () => {
    const single=PUZZLES.find(p=>p.id==='rook-file')!;
    const two=PUZZLES.find(p=>p.id==='knight-fork')!;
    expect(learnerMovesRequired(single)).toBe(1);
    expect(learnerMovesRequired(two)).toBe(2);
    expect(learnerMoveNumber(0,two)).toBe(1);
    expect(learnerMoveNumber(2,two)).toBe(2);
    expect(learnerMoveNumber(4,two)).toBe(2);
  });

  it('is reproducibly ordered by pedagogy and keeps the original item IDs immutable', () => {
    const once=orderPracticePuzzles(PUZZLES).map(p=>p.id);
    const twice=orderPracticePuzzles(PUZZLES).map(p=>p.id);
    expect(twice).toEqual(once);
    expect(once[0]).toBe('rook-file');
  });
});
