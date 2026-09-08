# Premium Match Experience v1 — Requirements

## Goal
Turn Chessy Play into a premium, calm, board-first match experience without changing the product into a simulated online chess service.

## Product requirements
1. The board remains the visual and interaction authority; no decorative surface may compete with position readability.
2. Play presents both players adjacent to the board with name, side, turn state, captured-material summary and a readable clock.
3. Chessy supports honest local time controls: Untimed, 10+0, 5+3 and 3+2. Timers are real session clocks, not decorative labels.
4. Clock behavior is deterministic: the clock starts after the first completed move, switches with the side to move, applies increment after the mover completes a legal move, and ends the game on timeout.
5. Undo restores the clock snapshot associated with the restored position. New game/reset restores the selected time control.
6. Stockfish thinking time counts against the Stockfish side after the clock has started. No fake opponent presence, ratings, latency or online status.
7. Move feedback is contextual but quiet: last move, check, current turn and engine-thinking state remain visible without obscuring the board.
8. Move history is promoted from a hidden legacy card into a compact match rail suitable for desktop and a progressive-disclosure sheet on mobile.
9. Game completion presents result, reason and direct next actions: Review, Analysis, Save/Export and Play again.
10. Review becomes an actual replay surface with board + move timeline + current move context. It must not claim accuracy/blunders unless backed by completed engine evaluation.
11. Analysis presents the current position with evaluation, principal variations and opening explorer in a coherent laboratory layout.
12. Existing Chessy Atlas themes must style the match shell through semantic tokens. No country-specific logic in match components.
13. ES/EN/PT remain complete. Keyboard, screen-reader labels, touch drag, reduced motion, offline PWA and 320–1440 px layouts remain supported.
14. No new app container, backend, account schema, remote runtime visual dependency, WebGL/3D runtime or analytics identity expansion.

## Release guarantees
- Existing challenge/academy/account/progress behavior does not regress.
- `npm run test:themes` still passes all themes.
- Browser verification adds premium-match assertions for clocks, player rails, move rail, timeout, undo clock restore and post-game navigation.
- Public release must pass exact-SHA health, blocked route checks, playable drag/touch and zero new application containers.
