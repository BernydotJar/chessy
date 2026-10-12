# Chessy — Mobile training QA and 5 × 40 bank

**Date:** 2026-10-12
**Branch:** `fix/chessy-mobile-training-blocks-20261012`, based on `origin/main` commit `7999c74`.
**Gate:** local PASS; remote CI / merge not yet claimed by this report.

## Reproduced customer findings and fixes

1. **Double attacks require too much vertical scrolling to advance on mobile.** Reproduced in a 390 × 844 Chromium mobile viewport. A first attempt at a fixed Next dock obscured the rook at a1 (screen element hit test returned the dock). Resolved by rendering the fixed navigation only when a puzzle is **solved or its solution revealed**. Unsolved puzzles never have the overlay; the button appears immediately when advancement is allowed. Added a hit-testing assertion on a1 plus a mobile next-button visibility and scroll-stability test.
2. **One vs two moves unclear.** Existing `solution` arrays alternate student/opponent UCI moves, with automated opponent answers. The interface now reports **Tu jugada X de Y** and an explanatory message. After expansion the distribution of learner turns is 38 one-move, 75 two-move, 57 three-move, 29 four-move and 1 six-move puzzle.
3. **Rook and rank second exercise marked a correct alternative capture wrong.** Old `rook-rank` FEN allowed **Rxg1** and **Kxg1**, but only the rook move was accepted. Moved white king from h1 to c3, preserving legal **a1g1** and removing the unintended king capture. Three translations updated. Regression tests assert only the rook can capture g1.
4. **Structured, bounded training.** Expanded verified bank from **112 → 200**, organized into 5 complete blocks of 40. A theme/difficulty filter receives its own blocks (at most 40 each), instead of a single oversized puzzle dropdown. Puzzles are ordered by difficulty and interleaved motifs; stable puzzle IDs preserve prior completions and review.
5. **Content provenance.** Added **88 source-attributed Lichess CC0** puzzles from an official bounded zstd CSV extract. SHA-256 of `lichess-training-expansion.json`: `a8a72ebfb7e66ab746e9d3ed4ebd88fbb438c6438dc7f81b77fbf7001e268e19`. Filtered 6,762 validated candidate records from the 1 MiB compressed extract, preserving original official IDs, ratings, themes and links. See `docs/TRAINING_BLOCKS.md`.

## Exact bank inventory

| Category | Count |
|---|---:|
| fundamentals | 8 |
| mates | 36 |
| double attacks / forks | 37 |
| tactics | 36 |
| endgames | 33 |
| calculation | 26 |
| mixed | 24 |
| **Total** | **200** |

## Verification completed locally

- **312 / 312** unit tests across 14 files; TypeScript typecheck, lint and Vite production build PASS.
- **47 / 47** browser E2E checks, responsive mobile layouts, real drag gestures, mobile keyboard/next access, direct lesson navigation and automated WCAG 2.1 AA scans PASS, with zero uncaught JS page errors. Evidence `browser-47-checks.json`.
- **200 / 200** full chess lines independently verified by `python-chess 1.11.2`, including FEN validity, every legal turn, tagged forced checkmates. Evidence `independent-chess.json`.
- `npm audit --audit-level=low` -> **0 vulnerabilities**.
- Mobile capture `training-mobile-next.png` shows the completed double-attack journey with the bottom Next control.
- All previously working Chessy activities, auth, theme and sync tests preserved.

## Release boundaries

- The original GitHub repo contains unrelated, preexisting local edits at `graph/drag-overlay-regression-events.jsonl` and `deploy/`, and an untracked release backup. These were excluded from the branch.
- No manual alteration of production Firebase rules, Cloudflare, Caddy or public URL from this fix.
- Passing automated accessibility is not a substitute for device QA on iPhone Safari and Android Chrome; request feedback from the same learners after publishing.
- Independent IBM Granite red-team inference is still unavailable due to the shared workstation's memory pressure. Deterministic QA and Python chess validation are documented separately.
