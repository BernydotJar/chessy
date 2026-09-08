# CH-043 Drag overlay regression design

Keep the current `react-chessboard` / dnd-kit interaction model. Remove transforms from the shared view-entry animation and retain an opacity-only entrance. This prevents `.view-enter` from becoming a containing block for the library's fixed-position `DragOverlay` while preserving a subtle entrance effect.

The regression test runs in an isolated Playwright context with `reducedMotion: no-preference`, measures the drag overlay and pointer at mid-drag, and asserts less than 2px positional error plus `transform: none` on `.view-enter`. The main deterministic suite may continue using reduced motion for unrelated checks.
