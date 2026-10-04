# Chessy Learning Architecture v2 — Release Verification

Date: 2026-10-04
Branch: `feat/curriculum-learning-architecture-v2`

## Scope verified

- Canonical 624-item source index remains evidence-gated: `0 verified / 624 pending`.
- Five rook exercises remain original Chessy semantic pilots, with no CCV1 source correspondence claim.
- Eight-phase mastery path is piece-first and progresses through constrained play before full-game transfer.
- Five constrained mini-game presets are legal, playable positions and run through the existing Play board.
- Academy exposes piece-domain practice routes, mini-games, existing lessons, and late-stage ECO reference.
- Curriculum sessions are untimed and excluded from normal-game analytics/save flows.
- Auth, sync, themes, and deployment topology were not changed by this curriculum scope.

## Deterministic verification

- `npm run verify`: PASS.
  - mapping validator: 624 total, 0 verified, 624 pending, 0 errors
  - ESLint: PASS
  - Vitest: 9 files / 198 tests PASS
  - TypeScript + Vite production build: PASS
- `npm run test:e2e`: PASS, 41/41 browser checks, 0 page errors.
  - includes Academy -> constrained mini-game flow
  - mobile board geometry
  - reduced motion
  - responsive overflow
  - WCAG 2.1 AA automated scans on product routes
- `npm audit --omit=dev`: PASS, 0 vulnerabilities.

## Independent critic

IBM Granite 3.3 2B was run locally as an independent critic after implementation.

- Data/mapping/pedagogy review: `VERDICT: PASS`, `BLOCKERS: none`.
- UI/state integration review: `VERDICT: PASS`, `BLOCKERS: none`.

Raw critic outputs are retained beside this file as `granite-data-critic.txt` and `granite-ui-critic.txt`.

## Release boundary

This evidence establishes the feature branch as a release candidate. It does not claim a public deployment or fabricate completion of the 624 source mappings. Those mappings remain a separate evidence-backed content workflow.
