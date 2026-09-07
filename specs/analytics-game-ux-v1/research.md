# Chessy Analytics + Game UX v1 - research decisions

## Sources
- Laws of UX (Spanish): https://lawsofux.com/es/
- Hick: https://lawsofux.com/es/ley-de-hick/
- Fitts: https://lawsofux.com/es/ley-de-fitts/
- Jakob: https://lawsofux.com/es/ley-de-jakob/
- Aesthetic-usability: https://lawsofux.com/es/efecto-de-estetica-usabilidad/
- Firebase Analytics Web: https://firebase.google.com/docs/analytics/web/get-started
- Firebase Analytics JS API: https://firebase.google.com/docs/reference/js/analytics

## Observed play-view pain points
1. Theme is exposed in the top bar, Home, and Play, creating preference duplication and choice noise.
2. Play presents opponent configuration, sound, status, undo/new game, legal moves, setup, typed move entry, PGN actions, history, analysis/mentor/glossary, and theme at once.
3. The chess board is visually primary but the surrounding controls do not have a single task hierarchy.
4. AI setup exposes five difficulty choices plus color plus sound even when defaults are already usable.
5. File actions and notation entry are specialist actions but visually compete with the primary move loop.
6. Settings are not represented as a conventional destination even though settings-like controls exist throughout the product.

## UX decisions
- Hick: reduce choices in Play; use progressive disclosure for AI configuration and specialist tools.
- Fitts: keep game-state and primary actions close to the board; maintain touch targets >= 44px.
- Jakob: introduce a conventional Settings destination and gear affordance.
- Selective attention / Flow: board + game state + contextual action form the primary Play region.
- Proximity / common region: group opponent setup separately from in-game controls; group advanced tools under one disclosure.
- Aesthetic-usability: preserve the visual system but verify that reduced clutter improves actual task completion, not only appearance.

## Analytics decisions
- Use an AnalyticsAdapter so PWA and future native clients share semantic event names without coupling game code to GA4.
- Analytics must be explicitly user-controlled from Settings. No session replay, heatmaps, move notation, FEN, PGN, email, display name, or puzzle solution payloads.
- High-value events only: screen_view, game_start, game_complete, puzzle_start, puzzle_complete, lesson_complete, auth_success, progress_sync_result, settings_changed.
- User identity is not sent as GA user_id in v1. Firebase Auth and Firestore identity remain separate from behavioral analytics.
- Consent can be withdrawn; collection must be disabled immediately on the device.
