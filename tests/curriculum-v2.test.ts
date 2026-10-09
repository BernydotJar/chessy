import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { BLOCK1_ROOK } from '../src/utils/exercises/block1';
import { SOURCE_EXERCISE_IDS, SOURCE_EXERCISE_TOTAL, VERIFIED_SOURCE_MAPPINGS, exerciseMappingSummary, sourceExerciseIsRunnable } from '../src/learning/exerciseMapping';
import { MASTERY_PATH, PIECE_SKILLS } from '../src/learning/masteryPath';
import { MINI_GAME_PRESETS } from '../src/learning/minigames';

describe('Learning Architecture v2', () => {
  it('preserves the canonical 624-source index without pretending placeholders are playable', () => {
    expect(SOURCE_EXERCISE_TOTAL).toBe(624);
    expect(SOURCE_EXERCISE_IDS).toHaveLength(624);
    expect(new Set(SOURCE_EXERCISE_IDS).size).toBe(624);
    expect(SOURCE_EXERCISE_IDS[0]).toBe('CCV1-EX-001');
    expect(SOURCE_EXERCISE_IDS.at(-1)).toBe('CCV1-EX-624');
    expect(VERIFIED_SOURCE_MAPPINGS).toHaveLength(0);
    expect(sourceExerciseIsRunnable('CCV1-EX-001')).toBe(false);
    expect(exerciseMappingSummary()).toEqual({ total:624, verified:0, pending:624 });
  });

  it('defines the coach progression as a mastery path rather than a flat module list', () => {
    expect(MASTERY_PATH.map(phase => phase.order)).toEqual([1,2,3,4,5,6,7,8]);
    expect(MASTERY_PATH[0].id).toBe('piece-tools');
    expect(MASTERY_PATH.findIndex(phase => phase.id === 'mini-games')).toBeLessThan(MASTERY_PATH.findIndex(phase => phase.id === 'real-games'));
    expect(new Set(MASTERY_PATH.map(phase => phase.id)).size).toBe(MASTERY_PATH.length);
    expect(PIECE_SKILLS.some(skill => skill.piece === 'rook')).toBe(true);
    expect(PIECE_SKILLS.some(skill => skill.piece === 'coordination')).toBe(true);
  });

  it('ships five constrained mini-games as legal positions with legal decisions available', () => {
    expect(MINI_GAME_PRESETS).toHaveLength(5);
    for (const preset of MINI_GAME_PRESETS) {
      const game = new Chess(preset.fen);
      expect(game.moves().length, preset.id).toBeGreaterThan(0);
      expect(game.get('e1')?.type === 'k' || game.get('e8')?.type === 'k').toBe(true);
    }
  });

  it('keeps the five rook pilot exercises semantically valid without claiming source-book correspondence', () => {
    expect(BLOCK1_ROOK).toHaveLength(5);
    for (const exercise of BLOCK1_ROOK) {
      expect(exercise.exercise_id.startsWith('CCV1-')).toBe(false);
      const game = new Chess(exercise.initial_position.fen);
      expect(game.moves().includes(exercise.solution.best_move), exercise.exercise_id).toBe(true);
    }
  });
});
