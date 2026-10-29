# Mobile gameplay review — 2026-10-29

Result: implementation and bounded local verification PASS. Production build, independent review and release remain pending. This is same-agent review, not an independent critic.

The published-build baseline at 390×844 moved the document 103 px after e2-e4. The score sheet now changes only its own scrollTop. A reader who scrolls to earlier moves keeps that position; auto-follow resumes after returning to the end. A new game resets following.

The rail follows DOM reading order with game status/actions first. Mobile actions have 44 px touch targets and fit below the full-width board on the tested 390×844 viewport. During an engine game, the redundant setup card is hidden on mobile while the player bar still identifies the engine and shows its turn. New game restores setup. Board coordinates stay inside the board and no longer overlap the player bars. No rule, storage, authentication, rooms or backend change was made.

React review: history subscribes only to the required store field; auto-follow is transient ref state; the effect depends on history length; the history region is named, keyboard-focusable and announced through the existing polite live region. No new dependencies, network requests or global scroll locks were added. Existing reduced-motion support is retained.

Validation: 318 unit tests, lint and TypeScript PASS. Isolated Chromium source-served regression: 16/16 PASS, 41 viewport measurements, maximum document scroll delta 0 px. Coverage includes 320×568, 375×667, 390×844, 430×932, 760×1024, 844×390 and 1440×1000; real tap/drag, intentional scroll offset, reduced/regular motion, long history, real Stockfish as white/black, thinking/reply/undo/reset, and WCAG AA scans in ES/EN/PT. This is Chromium device emulation; physical iOS/Safari was not tested.

The existing GitHub Actions workflow now runs this regression and archives its evidence. Source SHA/digest and measurements are in progress/evidence/mobile-gameplay/verification.json. CI production build and exact-commit results must be reviewed separately.

Capacity preflight blocked a new local production build (26.885 GiB free, configured minimum 80 GiB); existing dependencies and a temporary development cache were reused for source verification. Shared Graph Harness pin drift blocks scripts/graph.py (required 6a5f201, installed 168b740). Existing framework pins and graph events were preserved. No verification/release gate is falsely marked complete.

Checkout: /workspace/projects/chessy-zero-one-rooms-20261023; base 91ef5db. Only this feature branch changed. Other dirty checkouts and the currently published dist were preserved. The node_modules link reuses the existing dependency directory in chessy-zero-one-rooms-publish; it is local and must never be committed. The checked-in dist predates this fix and was not rebuilt or used as proof of the corrected behavior. The temporary Vite server and isolated browser close in the runner's finally block; no service was restarted. Source/evidence remain active feature work; do not remove these files.
