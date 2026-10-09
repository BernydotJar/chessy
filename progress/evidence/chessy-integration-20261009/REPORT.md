# Chessy integration gate — 2026-10-09

Branch: feat/chessy-adversarial-cx-20261009; merge base: main at defc0c8.

## Merged implementation

- Stacked PR #14 (instructor board kernel, originally b997460) integrated into PR #13 via squash 5e0c845.
- Reconciled upstream Learning Architecture V2, including new mastery-path cards and mini-game launchers, while retaining hash deep links.
- Reconciled browser verifier to test both the original direct lesson links and Academy V2.
- Private join URLs moved to `coachSessionSecrets/{sessionId}` and removed from public `coachSessions` records.
- Instructor coach claim and email verification checked in client and Firebase rules.
- Student access requires trusted `coachEnrollments/{sessionId}/members/{uid}` records. Clients cannot self-enroll.
- Firebase Storage recording metadata access also requires trusted enrollment or owner coach.
- CI now runs independent Firestore+Storage security emulators.
- NPM lockfile patched `source-map-js` to 1.2.2; `npm audit --audit-level=low`: **0 vulnerabilities**.

## Verified

- `npm run verify`: **218/218** unit tests, lint PASS, build PASS; bundler warns on large lazy vendor chunk.
- `firebase emulators:exec ... 'node scripts/coach-rules-verify.mjs'`: **19/19** authorization probes PASS (unauthenticated, unenrolled, coach ownership, invalid meeting link, publishing, recording upload/read/revocation).
- Full browser suite after reconciling Academy V2 and before private-link hardening: **44/44 PASS**.
- Full browser suite after private-link hardening: **40 PASS / 4 FAILED** because Chromium timed out and crashed under 7.7 GiB busy shared workspace, full 1 GiB swap used. Its first 40 checks (including Classes WCAG) passed. This is NOT a clean full-suite pass.
- Isolated accessibility rerun `CHESSY_HEADLESS=1 CHESSY_E2E_FILTER='WCAG 2.1 AA automated scan' npm run test:e2e`: **13/13 PASS**, including all four that were interrupted in the full browser pass; attached `wcag-targeted.json`.
- Combined local browser checks cover all 44 distinct checks, but no post-hardening full uninterrupted pass; GitHub Actions expected to run full suite without a competing shared sandbox workload.

## Explicit open limits

- No backend/admin enrollment provisioning workflow or real teacher activation done.
- Firebase rules and Storage rules have **not** been deployed to the production Firebase project in this integration; do not call classrooms production-live yet.
- Published recording download tokens are shareable and cannot be revoked by Firebase rules alone. Protected paid media requires backend signed playback.
- Joining Meet/Zoom/Teams is external; credentials can be shared after access, and provider admission must be enforced.
- Before rules deployment, verify no legacy published catalog document contains a non-null `meetingUrl`, since Firestore list queries cannot use post-fetch projection rules to hide individual fields.
- Dedicated cross-device real-time classroom service has not yet been shipped; instructor kernel exists only.
- IBM Granite independent adversarial model still blocked by local Ollama memory pressure.
- Preserve preexisting unrelated local changes at `graph/drag-overlay-regression-events.jsonl` and `.dist-prev-683bc6f4-20261004T232827Z/`.
