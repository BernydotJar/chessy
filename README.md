# Chessy

A local-first chess learning studio: thoughtful design, original lessons, legal challenges and Stockfish practice. English, Spanish and Portuguese.

## What is included

- Responsive learning dashboard, daily challenge, theme/difficulty filters and five-position practice sessions.
- **112 playable positions:** 16 original teaching positions and 96 puzzles from the official Lichess CC0 database. Legal opponent replies, hints, underpromotion, solution review and explanations for original exercises.
- **12 original lessons across six paths:** fundamentals, tactics, strategy, openings, endgames and calculation. Each lesson has a knowledge check and related practice. All lesson text is available in three languages.
- Device-local progress, idempotent learning points, activity streaks, achievements and validated JSON backup/restore. Hints and revealed solutions do not award completion points. Learning points are not Elo ratings or qualifications.
- Local two-player chess and five Stockfish difficulty settings. Actual saved games, PGN import/export, move replay and an analysis laboratory. No invented opponents, accuracy percentages or seeded user statistics.
- Keyboard move entry, a native accessible promotion dialog, visible focus states, reduced-motion support and responsive layouts.
- A bibliographic reading shelf. Referenced books are not included, copied or available as PDF downloads.

## Scope and privacy

This release does not include accounts, cloud sync, payments, online matchmaking, live tournaments or a backend. Progress is stored in this browser's localStorage; saved games use IndexedDB. Clearing browser data removes it. Export a backup to transfer progress. No application analytics or third-party AI API is required. Book/source links open external websites only when selected.

Stockfish runs locally in a Web Worker. Its bundled version is retained from the original project; it is not claimed to be the latest engine. Engine failure is visible and retryable; it is never silently replaced with random moves.

## Run and verify

Requires Node.js 22.12 or newer; the release was checked on Node 22.23.2.

```sh
npm ci
npm run dev
```

```sh
npm run lint
EXPORT_CHESS_FIXTURES=1 npm test -- --run
npm run build
npm run test:e2e
```

The browser verifier uses the existing Chrome bridge through `CHROME_CDP_URL` outside GitHub Actions. It opens and closes its own isolated browser context; it does not inspect user tabs or close the user's browser. Its localhost route is an isolated QA origin, **not evidence of public deployment**. In GitHub Actions it uses a dedicated headless Chromium installed by the workflow.

The second chess-rules implementation is optional locally and mandatory in CI:

```sh
uv run --no-project --with python-chess==1.999 python scripts/verify-independent.py
```

This validates exported FENs, every solution move and claimed terminal mates using python-chess instead of the application's chess.js. It is not a human or LLM review and does not certify every alternative line as strategically optimal.

## Graph Engineering

The recovered baseline had no Chessy graph. `graph/project.json` defines the new typed execution graph; `graph/events.jsonl` is append-only evidence. Recovery did not invent earlier approvals or checkpoints.

```sh
GRAPH_HARNESS_PATH=/path/to/Graph-harness-sdlc python3 scripts/graph.py validate
GRAPH_HARNESS_PATH=/path/to/Graph-harness-sdlc python3 scripts/graph.py status --pretty
```

The shared harness revision is pinned in `graph/framework.lock.json`. Source review, deterministic verification and external model review are distinguished in the evidence. No new local container is needed.

## Build and deployment

```sh
npm run build                         # root-hosted artifact in dist/
GITHUB_PAGES=true npm run build       # GitHub Pages /chessy/ artifact
```

The GitHub workflow gates release on lint, unit tests, independent rules validation, build, real browser workflows and a dependency audit. It deploys only from `main` to the repository's GitHub Pages environment. A successful local build is not reported as a live site; publication and host recovery status are recorded separately under `progress/`.

The shared Mac/Cloudflare host reconciler currently implements a different product's multi-container runtime. It must not be invoked for Chessy without a compatible static-site/reused-runtime adapter. The user explicitly prohibited creating additional local containers.

## Content and licenses

Project source retains its MIT license. Third-party engine and libraries keep their own licenses. See `THIRD_PARTY_NOTICES.md` and `public/legal/stockfish-gpl-3.0.txt`.

Lichess sample provenance, selection criteria and source hash are recorded in `progress/evidence/baseline/puzzle-provenance.json`. Import is bounded and build-time only; the application does not download the full database at runtime. Original lesson text and teaching positions were authored for this project rather than copied from the referenced books.
