import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { BLOCK1_ROOK } from '../src/utils/exercises/block1';
import {
  MAPPING_SCHEMA_VERSION,
  SOURCE_EXERCISE_IDS,
  SOURCE_EXERCISE_TOTAL,
  VERIFIED_SOURCE_MAPPINGS,
  exerciseMappingSummary,
  sourceExerciseIsRunnable,
} from '../src/learning/exerciseMapping';
import { MASTERY_PATH, PIECE_DOMAIN_ROUTES, PIECE_SKILLS } from '../src/learning/masteryPath';
import { MINI_GAME_PRESETS } from '../src/learning/minigames';
import { ECO_BANDS } from '../src/learning/openingTaxonomy';

describe('Learning Architecture v2', () => {
  it('preserves the canonical 624-source index without pretending placeholders are playable', () => {
    expect(SOURCE_EXERCISE_TOTAL).toBe(624);
    expect(SOURCE_EXERCISE_IDS).toHaveLength(624);
    expect(new Set(SOURCE_EXERCISE_IDS).size).toBe(624);
    expect(SOURCE_EXERCISE_IDS[0]).toBe('CCV1-EX-001');
    expect(SOURCE_EXERCISE_IDS.at(-1)).toBe('CCV1-EX-624');
    expect(MAPPING_SCHEMA_VERSION).toBe('chessy.exercise-mappings.v1');
    expect(VERIFIED_SOURCE_MAPPINGS).toHaveLength(0);
    expect(sourceExerciseIsRunnable('CCV1-EX-001')).toBe(false);
    expect(exerciseMappingSummary()).toEqual({ total: 624, verified: 0, pending: 624 });
  });

  it('defines the coach progression as a mastery path rather than a flat module list', () => {
    expect(MASTERY_PATH.map((phase) => phase.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(MASTERY_PATH[0].id).toBe('piece-tools');
    expect(MASTERY_PATH.findIndex((phase) => phase.id === 'mini-games')).toBeLessThan(MASTERY_PATH.findIndex((phase) => phase.id === 'real-games'));
    expect(new Set(MASTERY_PATH.map((phase) => phase.id)).size).toBe(MASTERY_PATH.length);
    expect(PIECE_SKILLS.some((skill) => skill.piece === 'rook')).toBe(true);
    expect(PIECE_SKILLS.some((skill) => skill.piece === 'coordination')).toBe(true);
  });

  it('exposes a concrete practice route for every piece domain', () => {
    expect(PIECE_DOMAIN_ROUTES).toHaveLength(7);
    expect(new Set(PIECE_DOMAIN_ROUTES.map((route) => route.piece)).size).toBe(7);
    expect(PIECE_DOMAIN_ROUTES.find((route) => route.piece === 'rook')?.activity).toEqual({ kind: 'piece-exercises', id: 'rook-pilot' });
    expect(PIECE_DOMAIN_ROUTES.filter((route) => route.activity.kind === 'mini-game')).toHaveLength(6);
  });

  it('ships five constrained mini-games as legal positions with explicit goals', () => {
    expect(MINI_GAME_PRESETS).toHaveLength(5);
    for (const preset of MINI_GAME_PRESETS) {
      const game = new Chess(preset.fen);
      expect(game.moves().length, preset.id).toBeGreaterThan(0);
      expect(game.get('e1')?.type === 'k' || game.get('e8')?.type === 'k').toBe(true);
      expect(preset.goal.es.length).toBeGreaterThan(10);
      expect(preset.focus.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps the five rook pilot exercises multilingual and legal without claiming book correspondence', () => {
    expect(BLOCK1_ROOK).toHaveLength(5);
    for (const exercise of BLOCK1_ROOK) {
      expect(exercise.exercise_id.startsWith('CCV1-')).toBe(false);
      expect(Object.keys(exercise.title).sort()).toEqual(['en', 'es', 'pt']);
      expect(Object.keys(exercise.instruction).sort()).toEqual(['en', 'es', 'pt']);
      const game = new Chess(exercise.initial_position.fen);
      expect(game.moves().includes(exercise.solution.best_move), exercise.exercise_id).toBe(true);
    }
  });

  it('keeps ECO as a late-stage opening reference rather than a 624 mapping shortcut', () => {
    expect(ECO_BANDS.map((band) => band.id)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(ECO_BANDS.map((band) => band.range)).toEqual(['A00-A99', 'B00-B99', 'C00-C99', 'D00-D99', 'E00-E99']);
    expect(ECO_BANDS.every((band) => band.examples.length >= 3)).toBe(true);
    expect(VERIFIED_SOURCE_MAPPINGS).toHaveLength(0);
  });
});
