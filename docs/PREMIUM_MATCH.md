# Chessy Premium Match Experience v1

Chessy Play is a board-first learning match cockpit. The chess position remains the dominant visual object; clocks, identity, move history and engine state are instrumentation around it rather than decoration over it.

## Match anatomy

- Two player rails stay attached to the board and expose side, turn, captured material, engine state and clock.
- The desktop match rail contains opponent configuration before/while an AI session is active, game status/controls, and a compact scoresheet.
- On mobile the board and player rails remain first; the match rail stacks below them and global navigation is suppressed on board-focused routes.
- Stockfish thinking never obscures the board. A small status chip plus the active player rail communicate engine activity.

## Time controls

Chessy supports four local session controls: Untimed, 10+0, 5+3 and 3+2. The selected control is a local preference in `chessy-time-control-v1`.

A timed clock starts after the first completed legal move. Elapsed time is computed from wall-clock deltas (`Date.now`) rather than interval counts, so browser throttling does not create free time. Increment is credited to the mover after a legal move. Once live, Stockfish thinking consumes the engine side's time. Timeout terminates the active engine request and ends the session. Undo restores the per-ply clock snapshot associated with the restored board position.

Clocks are session state; they are not uploaded as user profile data or added to Cloud Progress.

## Board feedback

The board uses semantic theme tokens for:

- previous move origin/destination;
- selected square;
- legal destinations;
- checked king;
- engine-thinking status.

No feedback surface covers the position. Chessy Atlas themes remain the only visual palette source.

## Post-game flow

A completed game keeps the result and reason visible and exposes Review, Analysis, Play Again, and save/export actions.

Review is an exact replay of the actual game history. Selecting a ply and opening Analysis passes that exact FEN plus its ply index to the analysis surface. Returning to Review preserves that selected point in the game.

Analysis displays the selected/current board, Stockfish evaluation/principal variations, opening explorer data when available, and private local notes. Chessy does **not** invent accuracy, best-move percentages, blunder counts or ratings when those values have not been calculated by an explicit evaluation pipeline.

## Analytics/privacy boundary

Existing consent-aware `game_start` and `game_complete` events may include only the coarse `time_control` identifier (for example `blitz3`). FEN, PGN, moves, clock values and note text remain outside analytics.

## Release contract

Premium Match v1 must preserve:

- mouse/click/touch play and Stockfish;
- all 112 independently verified challenge positions;
- all 11 Chessy Atlas themes;
- ES/EN/PT;
- WCAG 2.1 AA and reduced motion;
- installable/offline PWA behavior;
- Auth, Firestore owner rules and two-device progress sync;
- consent-first Analytics;
- the existing supervised public runtime with zero new application containers.
