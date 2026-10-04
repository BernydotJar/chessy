import source from '../data/chess_camp_vol1_624_exercises_ordered.json';
import manifest from '../data/chess_camp_vol1_verified_mappings.json';
import type { PieceDomain, MasteryPhaseId } from './masteryPath';

export type MappingStatus = 'pending_mapping' | 'verified';
export interface VerifiedExerciseMapping {
  sourceExerciseId: string;
  status: 'verified';
  phase: MasteryPhaseId;
  piece: PieceDomain;
  competencyId: string;
  fen: string;
  sideToMove: 'white' | 'black';
  objective: string;
  solution: readonly string[];
  sourceReference: string;
  evidenceSha256: string;
  verifiedBy: string;
  verifiedAt: string;
}

interface MappingManifest {
  schema_version: 'chessy.exercise-mappings.v1';
  source_index: 'chess_camp_vol1_624_exercises_ordered.json';
  mappings: VerifiedExerciseMapping[];
}

const verifiedManifest = manifest as MappingManifest;

export const SOURCE_EXERCISE_TOTAL = source.metadata.total_exercises;
export const SOURCE_EXERCISE_IDS = source.exercises.map((item) => item.exercise_id);
export const MAPPING_SCHEMA_VERSION = verifiedManifest.schema_version;
export const VERIFIED_SOURCE_MAPPINGS: readonly VerifiedExerciseMapping[] = verifiedManifest.mappings;

/**
 * The 624-source index is ordering metadata only until an entry is explicitly
 * verified. This deliberately prevents a placeholder from becoming a fake
 * learner exercise.
 */
export function sourceExerciseIsRunnable(sourceExerciseId: string): boolean {
  return VERIFIED_SOURCE_MAPPINGS.some((mapping) => mapping.sourceExerciseId === sourceExerciseId);
}

export function exerciseMappingSummary() {
  return {
    total: SOURCE_EXERCISE_TOTAL,
    verified: VERIFIED_SOURCE_MAPPINGS.length,
    pending: SOURCE_EXERCISE_TOTAL - VERIFIED_SOURCE_MAPPINGS.length,
  };
}

export function assertVerifiedMappingShape(mapping: VerifiedExerciseMapping): boolean {
  return Boolean(
    mapping.sourceExerciseId &&
    SOURCE_EXERCISE_IDS.includes(mapping.sourceExerciseId) &&
    mapping.competencyId &&
    mapping.fen &&
    mapping.objective &&
    mapping.solution.length > 0 &&
    mapping.sourceReference &&
    /^[a-f0-9]{64}$/u.test(mapping.evidenceSha256) &&
    mapping.verifiedBy &&
    mapping.verifiedAt
  );
}
