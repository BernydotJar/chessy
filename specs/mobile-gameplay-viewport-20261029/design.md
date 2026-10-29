# Design

Replace ancestor-scrolling scrollIntoView with a scrollTop write on the score sheet list. Keep auto-follow state in a ref so manual review does not cause rerenders; reset follow state for a new game. Make the scrollable history keyboard focusable and name it using the existing translated label.

Put game controls first in the match rail to align DOM and visual order. At phone/tablet width compact the status/actions, retain 44 px action targets, and hide the redundant engine setup card only during an AI game. Preserve natural page scrolling and full-width boards; no document scroll locks or compensating window.scrollTo on every move.

Reuse the existing checkout and installed dependencies. Capacity preflight reports about 27 GiB free against the configured 80 GiB heavy-build gate. Do not override that threshold. Run bounded source-served Playwright verification and static checks; mark a new production build BLOCKED unless the configured gate is satisfied.
