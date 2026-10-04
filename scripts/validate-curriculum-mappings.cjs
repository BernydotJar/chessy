#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src/data/chess_camp_vol1_624_exercises_ordered.json');
const manifestPath = path.join(root, 'src/data/chess_camp_vol1_verified_mappings.json');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const errors = [];
const fail = (message) => errors.push(message);

const phases = new Set(['piece-tools', 'piece-coordination', 'thinking-discipline', 'mini-games', 'middlegame', 'openings', 'endgames', 'real-games']);
const pieces = new Set(['rook', 'bishop', 'queen', 'knight', 'pawn', 'king', 'coordination']);

if (source.metadata?.total_exercises !== 624) fail('Canonical source total must remain 624.');
if (!Array.isArray(source.exercises) || source.exercises.length !== 624) fail('Canonical source must contain 624 ordered records.');

const sourceIds = new Set();
for (const [index, exercise] of (source.exercises || []).entries()) {
  const expectedId = `CCV1-EX-${String(index + 1).padStart(3, '0')}`;
  if (exercise.exercise_id !== expectedId) fail(`Source order mismatch at ${index + 1}: expected ${expectedId}.`);
  if (exercise.global_order !== index + 1) fail(`Global order mismatch for ${exercise.exercise_id || expectedId}.`);
  if (sourceIds.has(exercise.exercise_id)) fail(`Duplicate source ID: ${exercise.exercise_id}.`);
  sourceIds.add(exercise.exercise_id);
}

if (manifest.schema_version !== 'chessy.exercise-mappings.v1') fail('Unsupported mapping schema version.');
if (manifest.source_index !== path.basename(sourcePath)) fail('Mapping manifest points to the wrong source index.');
if (!Array.isArray(manifest.mappings)) fail('Mapping manifest mappings must be an array.');

const mappedIds = new Set();
for (const [index, mapping] of (manifest.mappings || []).entries()) {
  const label = mapping?.sourceExerciseId || `mapping[${index}]`;
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) { fail(`${label}: mapping must be an object.`); continue; }
  if (!sourceIds.has(mapping.sourceExerciseId)) fail(`${label}: unknown source exercise ID.`);
  if (mappedIds.has(mapping.sourceExerciseId)) fail(`${label}: duplicate verified mapping.`);
  mappedIds.add(mapping.sourceExerciseId);
  if (mapping.status !== 'verified') fail(`${label}: status must be verified.`);
  if (!phases.has(mapping.phase)) fail(`${label}: invalid mastery phase.`);
  if (!pieces.has(mapping.piece)) fail(`${label}: invalid piece domain.`);
  for (const field of ['competencyId', 'fen', 'objective', 'sourceReference', 'verifiedBy', 'verifiedAt']) {
    if (typeof mapping[field] !== 'string' || !mapping[field].trim()) fail(`${label}: ${field} is required.`);
  }
  if (!/^[a-f0-9]{64}$/u.test(mapping.evidenceSha256 || '')) fail(`${label}: evidenceSha256 must be a lowercase SHA-256.`);
  if (!['white', 'black'].includes(mapping.sideToMove)) fail(`${label}: sideToMove must be white or black.`);
  if (!Array.isArray(mapping.solution) || mapping.solution.length === 0 || mapping.solution.some((move) => typeof move !== 'string' || !move.trim())) fail(`${label}: solution must contain at least one move.`);
  if (Number.isNaN(Date.parse(mapping.verifiedAt || ''))) fail(`${label}: verifiedAt must be an ISO-compatible date.`);

  try {
    const game = new Chess(mapping.fen);
    const fenSide = game.turn() === 'w' ? 'white' : 'black';
    if (mapping.sideToMove !== fenSide) fail(`${label}: sideToMove does not match FEN.`);
    for (const step of mapping.solution || []) {
      let played;
      try {
        const uci = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/u.exec(step.trim().toLowerCase());
        played = uci ? game.move({ from: uci[1], to: uci[2], promotion: uci[3] }) : game.move(step.trim());
      } catch {
        played = null;
      }
      if (!played) { fail(`${label}: illegal solution move ${step}.`); break; }
    }
  } catch {
    fail(`${label}: invalid FEN.`);
  }
}

const summary = {
  schema: manifest.schema_version,
  total: source.exercises?.length || 0,
  verified: mappedIds.size,
  pending: (source.exercises?.length || 0) - mappedIds.size,
  errors,
};
console.log(JSON.stringify(summary, null, 2));
if (errors.length) process.exitCode = 1;
