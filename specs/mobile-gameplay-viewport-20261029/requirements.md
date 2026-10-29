# Stable mobile gameplay

Mode: SHIP. Authorization: Eduardo, 2026-10-29, requests correction of automatic page scrolling after moves and improvement of the mobile layout.

Baseline: main 91ef5db; isolated Chromium at 390×844 reproduced a 103 px document scroll after e2-e4. MoveHistory calls scrollIntoView on every ply and scrolls the document to the offscreen score sheet.

Acceptance:
- Legal tap and drag moves, engine thinking/replies, undo, and a long score sheet preserve the document scroll position and board geometry (tolerance 2 px once layout settles).
- Only the score sheet scrolls to new moves. Scrolling back to inspect older moves suspends auto-follow until the reader returns to its end.
- Mobile game actions appear directly below the player bars; ongoing engine details remain available through the player bar, with the redundant setup card hidden on mobile. Setup is available before a game and after New game.
- Phone widths 320, 375, 390, 430 and 760, landscape 844×390, desktop 1440×1000, regular/reduced motion, board interaction, keyboard-accessible history, and ES/EN/PT must remain usable without horizontal overflow.
- Board coordinates fit inside the board instead of clipping at the screen edge or overlapping player bars.
- No game rules, persisted data, auth/rooms release controls, dependencies, services or production artifacts change.

Read: current Chessy source/tests/specs and pinned Graph Harness contract. Touch: src/components/MoveHistory.tsx, src/components/studio/PlayView.tsx, src/styles/design-system.css, scripts/mobile-gameplay-verify.cjs, package.json, .github/workflows/github-pages.yml, this spec and dedicated graph/progress evidence. Do not touch other projects, existing unrelated work, infrastructure, personal browsers or dist.
