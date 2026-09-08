# Premium Match Experience v1 — Design

## UX principle
**The board is the stage; everything else is instrumentation.**

Desktop uses a two-column cockpit: board stage on the left, compact match rail on the right. Player strips sit immediately above/below the board so clock, turn and identity are perceived with minimal eye travel. Mobile collapses the rail below the board and keeps only critical player/clock state around the board.

## Match shell
- `MatchPlayerBar`: identity, side, captured material, active-turn state, clock.
- `MatchClock`: semantic states normal / active / low / flagged / untimed.
- `MatchRail`: result/status, compact move list, time-control selector before the first move, core controls, progressive tools.
- `MatchResult`: end-state summary and next-step actions.

## Clock model
Time controls are catalog values with `initialMs` and `incrementMs`. Store state carries remaining white/black milliseconds, selected control, clock started flag, last tick timestamp and per-ply clock snapshots. `tickClock(now)` is authoritative for elapsed time and may flag a side. `makeMove` settles elapsed time before moving, applies mover increment, then records the new snapshot. Undo restores snapshots.

The first completed legal move starts timing; this deliberately avoids burning time while the user is reading/configuring the initial position.

## Board feedback
Board highlights use semantic CSS tokens only:
- last move: subtle inset wash;
- selected: existing strong outline;
- legal destinations: dot/ring;
- check: restrained danger inset;
- AI thinking: player/rail activity, no opaque board-covering modal.

## Review / analysis
Review replays exact game history and surfaces move number, side and SAN. Analysis uses the reviewed/live FEN as engine input and keeps claims factual. No synthetic accuracy score is introduced.

## Responsive
At <= 760 px the board remains nearly viewport width; player bars stay attached to it. Match rail becomes a stacked surface. Core controls remain reachable without opening the global navigation.
