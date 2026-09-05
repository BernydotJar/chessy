# CH-002 scoped critic
Assistant source review plus separate Vitest process; not an independent model review.
Adversarial cases executed: illegal move refusal, underpromotion, no moves after resignation, AI state cancellation on load, undo while thinking, queued engine isolation, worker error, cancelled pending work, MultiPV ordering. All pass.
Fixer resolved a bad proposed mate-in-two in curriculum after executable checkmate assertion rejected it. Original corrected ladder-mate line and all 96 CC0 external lines pass legality and terminal mate checks. Final browser review and independent release acceptance remain in CH-005. No fabricated model-review approval.
