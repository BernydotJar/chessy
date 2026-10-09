# Chessy adversarial quality gate — 2026-10-09

**Method:** Graph Engineering style review (source Producer → adversarial scenarios → Fixer → deterministic Verifier → documented evidence). This report is **not** a Granite approval. Granite via local Ollama `ibm/granite3.3:2b` was requested and attempted twice: the model runtime returned HTTP 500 with `llama-server process has terminated: signal: killed` even for a minimal JSON probe. Observed resource constraints: ~7.7 GiB RAM, ~1.6 GiB available and full 1 GiB swap, alongside other products. No other workloads were killed, models were not swapped silently, and no fabricated Granite output was produced. Automated source-evidence script: `scripts/adversarial-granite.mjs`, baseline data `baseline-source-evidence.json`. **Independent Granite critic remains BLOCKED** pending adequate compute resources.

## Confirmed defects fixed

| Area | Finding | Severity | Resolution | Regression |
|---|---|---|---|---|
| Account isolation | One localStorage key held progress for every account in one browser; an unrelated user could inherit state | P0 | Per-UID storage namespace; legacy key reserved for guest; session switch activates correct local profile | `tests/profile-isolation.test.ts` |
| Consent / CX | Signing in silently merged guest progress | P1 | Opt-in import with distinct action and UI copy in ES/EN/PT | `tests/profile-isolation.test.ts`, live Firebase two-browser |
| Cloud race | Completion during an in-flight Firestore merge could be discarded | P0 | Merge response against current local state and queue follow-up sync | `tests/sync-races.test.ts` |
| Account switch | A's pending request could suppress B's first sync or update stale sync state | P0 | Per-UID/generation sync in-flight isolation and session generation checks | `tests/sync-races.test.ts` |
| Account deletion | Deleting identity could leave associated device progress in the account namespace | P1 | Erase account's device copy after confirmed deletion; restore cloud sync on auth deletion failure | `tests/profile-isolation.test.ts`, live Firebase delete |
| Learning continuity | Home 'continue learning' opened the full Academy catalog rather than the next lesson | P1 | Direct lesson deep links, hash-safe route, refresh and back navigation | Browser e2e deep-link test |
| QA reliability | A CDP endpoint was assumed; `networkidle` blocked SPA navigation with live Firebase traffic | P1 | Isolated headless fallback and `load` + component-ready navigation | 43/43 browser checks |
| Coach workflow | No instructor publication/recording flow or permission boundary | P1 | Pilot coach studio with live schedule, MP4 draft upload, controlled publication, identity claims and Firestore/Storage rules | 8 class-model tests, 10 emulator authorization tests |

## Verified gates

- Baseline: 192/192 existing unit tests PASS.
- Current checkout: **206/206** unit tests PASS, including 14 new tests.
- TypeScript and ESLint PASS (zero lint warnings).
- Vite production build PASS (still warns about one vendor chunk exceeding 500 kB; performance optimization open).
- Real headless Chromium: **43/43** checks PASS; all thirteen routes, direct lesson link, chess play, keyboard/mouse/touch, new coach catalog, mobile overflow and WCAG 2.1 AA automated scans, no uncaught JS errors.
- Firebase **live disposable two-device** journey PASS: consented guest import, cloud upload, login on second device, offline new puzzle, reconnection merge, sync back, cloud removal before account deletion, no page errors. Temporary test account deleted.
- Firebase Firestore/Storage **local emulator**: **10/10** authorization scenarios PASS; guest draft denial, unauthorized and unverified coach write denial, valid instructor publication, wrong-owner denial, MP4 draft upload, unpublished recording denial and published authenticated playback.
- All tests were run on the new feature branch, not on public production. **No Firebase rules or feature build was deployed** by this operation.

## Remaining release blockers / architecture debt

1. Granite independent IBM model review must run with sufficient memory/compute before formal adversarial signoff.
2. No authenticated instructor is provisioned with `chessyRole` in live Firebase; app server-side rules are present in Git **but not deployed**.
3. This pilot **cannot protect premium paid recordings**: Firebase download-token URLs may be copied. Meet links in published catalog are public metadata; conference host controls admission. A backend with enrollments and expiring playback access is required.
4. Uploaded MP4 is not transcoded to HLS/DASH; limit 100 MiB, no video pipeline and no embedded real-time chessboard/video room.
5. Full instructor UI live-upload/publish journey should be tested against a sandbox Firebase bucket before production activation; emulator rules cover authorization but not actual media performance.
6. Current saved games use IndexedDB, distinct from synchronized learning progress; no claim of cross-device saved-game persistence.
7. A large JavaScript chunk remains >500 KiB; deferred splitting optimization.

## Reproduce

```sh
npm ci
npm run typecheck
npm run lint
npm test -- --run
npm run build
CHESSY_HEADLESS=1 npm run test:e2e
npm run test:progress:ui-live
# With Firebase CLI and Java 21+ installed:
firebase emulators:exec --project demo-chessy --config firebase.coach-emulators.json --only firestore,storage 'node scripts/coach-rules-verify.mjs'
```

Live Firebase tests must be authorized for the intended test project and account cleanup. Source project: `chessy-pwa-2026`. No user-provided existing accounts were modified.
