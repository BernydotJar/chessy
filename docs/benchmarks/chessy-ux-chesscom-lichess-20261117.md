# Chessy UX benchmark — Chess.com / Lichess (2026-11-17)

## Product decision
**Positioning:** beginner-first chess education, teacher-led lessons, validated tactical practice and local-first progress. Do not copy the interfaces, proprietary assets or source code of competing services. This change does not create cash prizes, an XP shop, or an unverified entitlement mechanism.

## Evidence & scope
- Chess.com official help, [Lessons](https://support.chess.com/en/articles/8609703-how-do-lessons-work-on-chess-com) (2026-07): guided lesson path plus searchable lesson library and a clear next lesson.
- Chess.com official help, [Puzzles](https://support.chess.com/en/articles/8608686-how-do-puzzles-work-on-chess-com) (2026-09): challenge entry and theme/difficulty selection.
- Chess.com official help, [Streaks](https://support.chess.com/en/articles/9714718-what-are-streaks) (2026-03): progress signal visible in home/profile, optional display.
- Lichess official [Puzzle themes](https://lichess.org/training/themes): practice by motifs, stages, lengths and levels.
- Lichess official [Changelog](https://lichess.org/page/changelog): mobile discoverability improvements, including analysis tab indicator, puzzle search and easier-to-find settings in 2026.
- Chessy current main preflight: commit `49ac698`, inspected `src/App.tsx`, `HomeView.tsx`, `AcademyView.tsx`, `ChallengeView.tsx`, `ProgressView.tsx` and mobile CSS. Existing mobile next-puzzle dock, filters, credentials, local progress, classroom controls and achievements are already implemented.

**REA execution transparency:** `morluto/rea` and its website observation guide were inspected. CLI instrumentation of the two sites is *not* certified by this report: Sandbox V3 currently has Node 22.23.2, while REA 6.9.0 requires Node >=22.23.4 / >=24.22.1 / >=26.12.1, and a Node 24 bootstrap was terminated in the workstation. The competitor comparison above is evidence-linked behavioral research, **not** an instrumented REA capture. Never represent it as observed internal implementation, traffic, or binary analysis.

## Prioritized decisions

| Priority | Chessy problem | Change | Expected user outcome |
|---|---|---|---|
| P0 | Classroom buried in mobile sidebar | Always-visible classroom shortcut in standard top bar | A student or teacher can find the classroom from primary views without menu hunting |
| P0 | Next lesson requires scrolling or discovery | Continue Learning in Home hero and featured next lesson at top of Academy | Resume the first unfinished lesson directly |
| P0 | Academy sections put reference content above lessons | Place lessons before optional mastery path and mini-games; progressively disclose extras | Primary learning actions appear first |
| P1 | Progress/rewards perceived as hidden | Move earned/locked achievements before secondary weakness analysis, show lesson completion on Home | Honest, non-monetary feedback without adding an XP shop |
| Preserve | A narrow training board must stay playable | Keep mobile board-focus nav hiding, fixed Next dock and safe-area sizing | No new scrolling after solving a puzzle |

## Product guardrails
1. Screen/state only: existing `setView`, hash routing, learning store. Do not add a new backend or modify room authorizations.
2. Completed lesson count is derived only from actual curriculum IDs; duplicate or unknown completion IDs never increase it.
3. Preserve translations in Spanish, English and Portuguese and keyboard/ARIA semantics.
4. Respect prefers-reduced-motion and 44px minimum mobile classroom touch target.
5. Preserve review queue and chess move legality. Do not add badges unrelated to actual completed exercises.
6. The classroom shortcut is a navigation affordance, not a security role grant.

## Acceptance checklist
- [ ] `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build`
- [ ] Playwright at 375px, 390px, 768px and desktop, all three languages: Home next action visible; classroom shortcut routes to Rooms; Academy next lesson above extra materials; progress achievements appear before review; no horizontal overflow.
- [ ] Existing mobile training Next dock remains functional and has no overlay regression.
- [ ] GitHub PR checks pass, review changes, merge into main only after checks.
- [ ] Official REA browser capture of two targets remains explicitly pending until a supported Node and REA runtime are available.
