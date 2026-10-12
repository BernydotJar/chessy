# Chessy — Mobile training and 5 × 40 exercise blocks

**Date:** 2026-10-12. **Branch:** `fix/chessy-mobile-training-blocks-20261012`. **Status:** validated release candidate.

## Actual puzzle bank

Chessy previously shipped **112** playable puzzles (16 instructor-created originals + 96 Lichess CC0 positions). This increment adds **88 new Lichess CC0 positions**, producing **200 unique, legally replayable puzzles** grouped into **five 40-exercise blocks**.

| Theme / category | Puzzles |
|---|---:|
| First moves / fundamentals | 8 |
| Checkmates | 36 |
| Double attacks / forks | 37 |
| Tactical vision | 36 |
| Endgames | 33 |
| Calculation | 26 |
| Mixed ideas | 24 |
| **All** | **200** |

Puzzle completion is still keyed by the **unchanged ID**, not by array index. Existing guest and authenticated progress, review mistakes and cloud sync remain compatible. A theme or difficulty filter partitions only its eligible puzzles into blocks of at most 40; the unfiltered journey is exactly five full blocks.

### Curriculum and move counts

The default practice order starts with original fundamentals and interleaves tactics by category as difficulty rises, avoiding a 200-item selector on mobile. Each block has a short dropdown listing only its 40 puzzles; the user can jump between blocks. Daily challenges, five-question sprints and review queues retain their own modes.

After expansion, the learner-turn breakdown is:
- 38 exercises with 1 learner move;
- 75 with 2 learner moves;
- 57 with 3 learner moves;
- 29 with 4 learner moves;
- 1 with 6 learner moves.

The opponent's scripted turns **do not count** as the learner's moves. The board explicitly shows "Tu jugada X de Y" and explains that the opponent answers automatically between learner moves. Different move lengths are intentional and now transparent.

### Official source provenance and QA

- Original puzzle source: <https://database.lichess.org/#puzzles>. Lichess puzzle data is CC0; this project uses no Chess.com exercises or licensed course content.
- Public official compressed CSV `lichess_db_puzzle.csv.zst`, HTTP Last-Modified **2026-10-02 08:51:45 GMT**.
- Bounded import: only the first **1,048,576 compressed bytes** downloaded using HTTP Range; 19,827 CSV rows exposed by partial zstd decompression (last incomplete line ignored). Source was held in temporary workspace, not shipped.
- Curator script: `scripts/curate-lichess-expansion.mjs`; validated 6,762 candidate positions, ranked on popularity, play count and rating deviation, and selected 88 new IDs with category quotas. Curation gates include legal FEN, legal UCI line, post-setup opposing king validity, no immediate game-over, bounded solution length, and verified checkmate for `mateInN` themes.
- Added dataset: `src/data/lichess-training-expansion.json`; SHA-256 **a8a72ebfb7e66ab746e9d3ed4ebd88fbb438c6438dc7f81b77fbf7001e268e19**.
- Each Lichess puzzle retains original PuzzleId, rating, themes and a direct source link. There is no runtime dataset download.
- All 200 puzzles are independently replayable with **python-chess** (not only chess.js).

## Specific bug: second rook exercise

`rook-rank` ("Captura con la torre") previously had FEN `4k3/8/8/8/8/8/8/R5nK w - - 0 1`. Both `Rxg1` (a1g1) and `Kxg1` (h1g1) were legal captures of the knight, but the app accepted only the rook capture. This mislabeled a legitimate king capture as wrong.

Fix: move the white king to c3; now `4k3/8/8/8/8/2K5/8/R5n1 w - - 0 1` allows exactly one capture of the knight on g1: `a1g1`. Instructional copy explicitly identifies the tower from a1, destination g1, and checks path safety in ES/EN/PT.

## Specific mobile UX change

Previously, **Next** was buried at the bottom of the vertically stacked right-hand panel, far below the board at 390 × 844 px. The new navigation dock is fixed at the bottom **only after a correct solution or revealing the solution**. While the user is solving a puzzle, the dock is absent so it cannot cover a1 or other board squares. It respects mobile safe-area padding, provides a 48px minimum touch target and navigates to the next exercise or the next 40-exercise block, scrolling back to the board.

Tested **Touch** and **Mouse** board interactions, legal one/two/multi-move lines, block navigation, all responsive routes and WCAG 2.1 AA automated scans. Original content progress remains associated with stable IDs.

## Scope still not claimed

A deterministic, source-backed chess puzzle validator is not a guarantee that every player will find every instructional explanation satisfying. Coach-based pedagogical review, real Android/iOS acceptance, and an independent Granite adversarial signoff are follow-up gates; Granite still cannot fit in the shared Ollama workstation without impacting other services.
