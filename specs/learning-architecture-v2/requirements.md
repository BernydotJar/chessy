# Chessy Learning Architecture v2 — product contract

## Source
Coach feedback supplied by the product owner on 2026-10-04 plus the existing Chessy 624-exercise canonical index.

## Problem
A beginner should not learn legal piece movement and then be pushed directly into openings or full games. Legal movement is not mastery. Chessy must teach how each piece functions as a tool, how pieces coordinate, and how those concepts transfer into constrained games before full-game complexity is introduced.

## Pedagogical spine
1. Piece as tool
   - rook: lines, reach, blockers, captures, defended/undefended targets, safe activity
   - bishop: diagonals, color complex, blockers, long-range activity
   - queen: combined rook/bishop geometry and safe use
   - knight: jumps, outposts, forks, edge-vs-center geometry
   - pawn: direction, capture, chains, passed pawns, promotion
   - king: legality, opposition/activity by phase
2. Piece coordination
   - rook + bishop
   - queen + rook/bishop
   - knight integrated with long-range pieces
   - all-piece coordination
3. Tactical/strategic discipline
   - candidate moves, threats, defended pieces, order of operations, tactical motifs, planning
4. Constrained mini-games
   - king + eight pawns vs king + eight pawns
   - rooks + selected pawns
   - bishops vs bishops
   - knights vs knights
   - queen vs queen
5. Middlegame synthesis
   - use previously learned piece roles in realistic positions
6. Opening understanding
   - principles and piece-development purposes before memorized sequences
7. Endgame conversion
   - king activity, pawn play, reduced-material technique
8. Guided real games
   - full-game play and review grounded in the earlier evidence

This is a mastery path, not a module list. A learner should see what skill they are building and what evidence demonstrates it.

## 624 exercise contract
`src/data/chess_camp_vol1_624_exercises_ordered.json` is the canonical source-order index and currently contains 624 placeholders marked `pending_mapping`.

- Preserve all source IDs and ordering.
- Never invent a FEN, solution, semantic tag, or source mapping for an unmapped source exercise.
- An exercise is learner-runnable only after it has verified position, side-to-move, expected objective/solution, and curriculum competency.
- Existing `BLOCK1_ROOK` exercises are a Chessy semantic pilot; they are NOT automatically asserted to correspond to any `CCV1-EX-*` source ID.
- Mapping progress is an internal/coach concern and must not clutter the learner experience.

## Product changes in this phase
- Add a learner-facing mastery-path overview to Academy.
- Add playable constrained mini-game presets using legal FENs and the existing Play surface.
- Keep current lessons/tracks available while reframing them inside the broader mastery path.
- Prevent unmapped 624-source placeholders from masquerading as runnable exercises.
- Add typed curriculum and mapping contracts ready for future import/mapping work.

## Evidence / mastery principles
- Completion alone is not mastery.
- Existing lesson/puzzle evidence may inform recommendations, but do not fabricate a rating or Elo.
- Future exercise mappings must include competency and verification metadata.
- No hard lock is introduced in v2; this phase guides rather than blocks.

## Explicit non-goals
- Do not fabricate the missing semantics for all 624 exercises.
- Do not reproduce copyrighted book text or diagrams not already lawfully present.
- Do not alter authentication, cloud-sync, analytics consent, themes, match UX, or deployment topology.
- Do not add a new backend or container.
