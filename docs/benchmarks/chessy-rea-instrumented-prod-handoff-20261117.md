# Chessy — instrumented REA product research and release handoff

**Scope:** PR #33, currently merged at `ae47628ec8b3c58099930f7a9e5917ce7747bfe1`.
**Goal:** Close the earlier documentation-only competitive review with actual REA observations and release evidence while preserving 1-to-1 classroom sessions and teacher credentials.

## What was directly inspected

Research used **REA 6.9.0** (`morluto/rea`) under an isolated Node.js **24.22.1** runtime and isolated Chromium 151 with loopback-only CDP. Commands were `rea list-browser-targets` and `rea inspect-web-page --include-accessibility-text`; each saved summary under `progress/evidence/rea-competitors-20261117/` contains the REA evidence ID, exact target URL, capture interval, DOM/AX/script counts, public UI labels, raw-capture SHA-256, provenance and limitations.

| Product | Public observed page | Direct REA observations | Relevance |
|---|---|---|---|
| Chess.com | https://www.chess.com/lessons | Guest page exposes interactive lessons, videos, challenges and mastery headings; **not** authenticated personalized flows | Organize Chessy around one next lesson and immediately useful practice |
| Chessable | https://www.chessable.com/ | A clear `Select your course → Learn the Moves → Review` path; tabs include Beginners, Tactics, Strategy, Endgame and Openings | Treat review as the natural sequel to learning rather than as a separate economy of points |
| ChessKid (supplement) | https://www.chesskid.com/ | Visible choices for playing kids/bots, lessons and puzzles; public navigation exposes lesson-planning and live-classroom links | Make the teacher/classroom entry discoverable without imitating children's commercial branding |
| Lichess (attempted) | https://lichess.org/training/themes | **Protected:** REA observed a Cloudflare security verification page, not the real puzzle interface | No claims about Lichess's live UX from this instrumented run. Earlier public documentation remains background only |

**Caveats:** These are logged-out *public landing-page* inspections, not authenticated end-to-end task tests or a reconstruction of competitors' private systems. REA reports `policy_filtered`/attach-limited capture completeness and does not capture historical network activity. No challenge or authorization controls were bypassed, and no third-party scripts/assets are reproduced in Chessy.

## PO acceptance decisions

1. **Retain PR #33**: the next unfinished lesson, progress visibility, Aula shortcut and progressively disclosed curriculum were implemented and checked by CI (main run [44231130732](https://github.com/BernydotJar/chessy/actions/runs/44231130732)).
2. **No extra decorative gamification:** keep rewards anchored to actual, validated lessons/puzzles; do not copy a monetization storefront.
3. **Review path:** current mistakes/review queues remain; improve review discovery through measured behavior in a later scoped story, not by adding untested navigation at the point of release.
4. **Accessibility:** preserve responsive chessboard, existing mobile next-puzzle dock, i18n ES/EN/PT and minimum 44px touch target; production E2E should confirm this after release.

## Production handoff, fail-closed gate

- `chessy.lch-app.cloud` and `/aula/api/health` returned HTTP 200 in preflight.
- Live release at preflight: `49ac6982a1a140195584b3b0f22c09a5ed3aabe6`, UI `4e7182daeb75214feb8c1bb7`.
- Latest successful main: `ae47628ec8b3c58099930f7a9e5917ce7747bfe1`, UI `2d1546b03b32f5919e2d84e5`.
- CI artifact `chessy-aula-release-ae47628ec8b3c58099930f7a9e5917ce7747bfe1` (run 44231130732, artifact 14394984168) downloaded using authenticated GitHub CLI and staged into `/workspace/projects/chessy/progress/runtime/releases/ae47628ec8b3c58099930f7a9e5917ce7747bfe1`. Its bundled server and classroom app.js hashes match the existing release; frontend assets differ as expected.
- **Cutover refused correctly:** before promotion, classroom `roomsActive` became **1**. The protection gate forbids stopping the service during an active class. The current supervisor config, service, student sessions and teacher registry were not changed.
- For a later promotion, re-run a fresh active-room check before any supervisor update. Change only Chessy's release path and SHA, preserve all three secret-file references, validate public `/health` SHA, `/version.json`, `/aula/api/health`, `/aula/` and served JS SHA; auto-rollback to the saved config on mismatch.
- This run **does not** prove independent LCH native-host migration, which remains a separate infrastructure objective. It proves only the current public route and deployment staging.

**Graph Engineering:** independent delivery graph `graph/rea-prod-closure-project.json` and append-only `graph/rea-prod-closure-events.jsonl`, validated by pinned shared Harness commit `6a5f201e2bc640ac46cc0b4b6a3d11b788555664`. Production release must remain NO-GO until the room becomes empty and public SHA matches.

## Source trace

- Official REA project: https://github.com/morluto/rea
- Raw captures are retained in the isolated Sandbox V3 execution workspace at `/tmp/chessy-rea-competitor-browser/*-inspect.json`; SHA-256 digests and inspectable selected observations are persisted in the repository. The ephemeral raw files are not equivalent to permanent artifact hosting.
- Chessable, Chess.com and ChessKid pages were read directly through REA. Lichess browser protection was recorded without bypass.

