# Verification and delivery

1. Record baseline measurements/screenshot from the published 91ef5db build.
2. Repair score-sheet scrolling and mobile action hierarchy.
3. Run npm run typecheck; npm run lint; npm test -- --run; node scripts/mobile-gameplay-verify.cjs (isolated Chromium, source server, serialized cases).
4. Compare against the unchanged baseline and exercise real Stockfish replies. Record assertions, viewports, source SHA/diff hash, screenshots and accessibility.
5. Validate the pinned Graph Harness, record same-agent review accurately, commit changes on fix/mobile-gameplay-viewport-20261029. Do not claim independent approval or published behavior.
