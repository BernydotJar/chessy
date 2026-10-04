# Chess Camp Volume 1: verified mapping workflow

The canonical 624-record file is an ordering index, not a puzzle dataset. A source ID becomes runnable only after a separate verified mapping is added to `src/data/chess_camp_vol1_verified_mappings.json`.

## Required evidence for one mapping

1. Confirm the exact source exercise ID and lawful source reference.
2. Transcribe the complete position, including side to move.
3. Record a concrete learning objective and one curriculum competency.
4. Verify the FEN with `chess.js` and play every move in the proposed solution.
5. Have a named reviewer confirm that the position, objective and solution match the source.
6. Hash the review artifact and store the SHA-256 with the mapping.
7. Run `npm run verify:curriculum` before the mapping can enter a release candidate.

Each verified record requires:

- `sourceExerciseId`
- `status: verified`
- mastery `phase`
- piece or coordination domain
- `competencyId`
- legal `fen`
- `sideToMove`
- learner-facing `objective`
- non-empty legal `solution`
- `sourceReference`
- `evidenceSha256`
- `verifiedBy`
- `verifiedAt`

## Boundaries

- Never infer a position or solution from the source order alone.
- Never assign the five Chessy rook pilot exercises to a `CCV1-EX-*` ID without source evidence.
- Never expose `pending_mapping` records as learner exercises.
- Do not copy protected prose or diagrams into Chessy. Store only the minimum structured facts needed for lawful interoperability and verification.
- ECO opening families are a later-stage study index. They do not provide semantics for the 624 source records.

## Current truthful state

The source index contains 624 ordered IDs. The verified manifest contains zero mappings, so all 624 remain unavailable to learners. The five rook exercises are an original Chessy pilot that demonstrates the target semantic shape without asserting source-book correspondence.
