# Chessy Mobile Product Strategy v1

Baseline: UI Kit v2 release `6145963d1bb819cb53ffd29208c31beb0078e57c` is closed.
This document controls only CH-011 through CH-016.

## Positioning

**Calm, local-first chess improvement.**

Chessy should make the shortest useful loop:

> Play or practice -> understand the idea -> review the mistake -> continue from context.

The product should feel more focused than Chess.com, more instructional than Lichess, easier to configure than ChessTempo, more context-preserving than Chessable, and more chess-rigorous than Duolingo Chess.

## Competitive decision matrix

| Product | Keep / learn from | Explicitly avoid | Chessy response |
| --- | --- | --- | --- |
| Chess.com | broad learning surface, guided lesson path, post-game review, familiar bottom nav | home clutter, control relocation, upsell competing with primary actions | stable primary nav; no dynamic primary-action ordering; direct Analysis |
| Lichess | speed, board-first layouts, deep customization, offline practice, fast analysis access | expert-first density in some tool surfaces | focus mode; offline-first local training; simple defaults with advanced options secondary |
| ChessTempo | mistake sets, motif targeting, spaced repetition, serious progress data | configuration complexity and web-only setup dependencies | automatic Review Mistakes and weak-theme summary with zero setup |
| Chessable | course continuity and repeated retrieval | mobile friction, losing review/chapter context | deterministic Continue and in-context next/review behavior |
| Duolingo Chess | approachable daily loop and habit cues | shallow explanations, repetitive one-sided drills, opaque "best move" tasks | explanation-first feedback; both sides; analysis/review access; XP remains secondary |

## Phase 3 product priorities

### P0 - ship in this phase
1. Icon System v3 with a recognizable Chessy mark and optically balanced mobile icons.
2. Stable mobile navigation and board-focused mobile shell.
3. Home hierarchy: Continue, Daily, Play; secondary stats later in the scroll.
4. Review Mistakes queue built from real failed puzzle IDs.
5. Weak-theme summary only from recorded attempts; no invented coaching claim.
6. Installable PWA and offline reload after first successful load.
7. Safe-area support and 320px minimum portrait layout.
8. One-tap Analysis from saved/recent games and post-game state where context exists.

### P1 - architect for, do not overbuild
- adaptive difficulty based on a larger attempt history,
- optional spaced-repetition scheduling,
- haptics and native share integrations,
- tablet split-view analysis.

### Deferred / separate product phase
- real-time multiplayer infrastructure,
- accounts/cloud sync,
- social graph/chat,
- push notifications,
- App Store / Play Store commercial submission,
- paid subscriptions.

## Mobile navigation contract

Primary destinations never reorder:

1. Home
2. Play
3. Challenges
4. Academy
5. Progress

On board-centric routes, bottom navigation may collapse to maximize board area, but a stable compact route affordance must remain. Primary chess actions never move because of recommendation content.

## Mobile visual contract

- Board gets the largest practical square area.
- Chrome uses safe-area variables.
- Functional icon geometry must read at 18px without relying on color.
- Text labels remain for primary navigation; icon-only is limited to universally understood utilities.
- No floating promotional cards over board routes.
- Motion is feedback, not decoration, and honors reduced motion.

## Learning contract

- A wrong attempt records the puzzle ID and theme locally.
- A correct later solve resolves or lowers that puzzle's review priority; it never mints duplicate XP.
- "Weak theme" means a theme with observed mistakes; it is not an Elo or skill diagnosis.
- Reveal/hint-assisted solutions remain excluded from normal earned XP.
- Review flow preserves the same explanation and source provenance as standard challenges.

## Delivery contract

The web product remains the source of truth. Mobile v1 is an installable responsive PWA delivered through the existing supervised runtime, Caddy and Cloudflare path. Native wrappers can follow after UX telemetry/real-device validation. No new application container is required.

## Execution boundaries by Graph node

This phase is intentionally split so no node may expand into adjacent product work:

- **CH-011 Research/decision only.** Produces this matrix and acceptance contract. No application behavior changes.
- **CH-012 Icon System v3 only.** May change vector geometry, brand mark, icon sizing/active states and icon QA. It may not restructure navigation or learning data.
- **CH-013 Mobile IA only.** May change shell, mobile navigation, Home ordering, board-route focus chrome and direct analysis affordances. It may not change puzzle scoring/storage schema beyond navigation needs.
- **CH-014 Learning review only.** May extend local progress to record puzzle attempt history, Review Mistakes and weak-theme summaries. It may not add remote accounts, opaque recommendation models or new content feeds.
- **CH-015 PWA/offline + interaction only.** May add manifest/service worker/install metadata, safe-area/layout hardening and offline shell behavior. It may not add native wrappers, push notifications, analytics SDKs or app-store submission code.
- **CH-016 Verification/release only.** May repair defects discovered by gates, but may not add net-new product features.

### Change budget

The phase must remain within the existing React/Vite/local-first architecture and use bundled/local data. No backend, database, authentication provider, analytics vendor, remote AI inference, real-time service, native SDK or new application container may be introduced. Any need for those capabilities becomes a future Graph phase rather than scope expansion.
