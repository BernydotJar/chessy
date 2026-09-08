# CH-043 Drag overlay regression requirements

## Problem

With normal motion preferences, dragging a chess piece can render the drag overlay away from the pointer. The same board behaves correctly when `prefers-reduced-motion: reduce` is active, which allowed the regression to escape the existing browser gate.

## Root-cause contract

`react-chessboard` 5.12.1 uses a `position: fixed` DnD overlay. A transformed ancestor becomes its fixed-position containing block. Chessy's `.view-enter` animation retained `transform: translateY(0)` after completion because it used `animation-fill-mode: both`, so the overlay was positioned in the wrong coordinate space. The existing E2E context forced reduced motion, disabling that transform and masking the production defect.

## Acceptance criteria

1. With `prefers-reduced-motion: no-preference`, the visible drag piece center follows the pointer within 2 CSS pixels on both axes.
2. The source-square piece is hidden during drag and exactly one visible moving piece remains.
3. Normal view entrance styling must not establish a transformed containing block around board DnD overlays.
4. Existing reduced-motion behavior remains valid.
5. Mouse and touch moves still complete legally.
6. The browser suite must include a dedicated normal-motion regression check at a desktop viewport representative of the reported defect (1202x750).
7. No new runtime dependency, application container, or backend is introduced.
