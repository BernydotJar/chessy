# Chessy Live Board v1 — evidence and release boundary

**Branch:** `feat/chessy-live-board-v1` (based on `7999c74`). **Status:** candidate for a draft PR, not a deployed service. **Date:** 2026-10-09.

## Change summary

- Implemented one instructor-authoritative board document per live session at `coachSessions/{sessionId}/liveBoard/current`.
- Firebase adapter: `runTransaction` create once + expectedRevision moves/lock/reset/position changes, client replay validation and `onSnapshot` subscriptions.
- New lazy-loaded `CoachLiveBoard` in the Classes catalog, reusing existing chessboard with ES/EN/PT copy and mobile responsive treatment.
- Verified instructor controls board; enrolled learners observe read-only; account switch/unmount closes subscription and auth errors discard an old board.
- Fixed bootstrap permission to allow authorized reads of a **not-yet-created** room.

## Validation

- `npm run verify`: **223/223** unit tests across 14 files, TypeScript, ESLint and Vite build **PASS**; vendor chunk size warning remains.
- `firebase emulators:exec ... node scripts/coach-rules-verify.mjs`: **28/28** checks PASS, including 9 classroom-specific scenarios: instructor room initialization, missing-room read, enrolled-only read, learner/other-coach write denial, revision progression, stale write rejection, teacher board lock, live `onSnapshot` delivery, and access revocation. This is actual emulated Firestore authorization/sync, not a purely mocked snapshot.
- Filtered browser `CHESSY_E2E_FILTER='Coach catalog loads'`: 1/1 PASS.
- Filtered browser `CHESSY_E2E_FILTER='WCAG 2.1 AA automated scan: classes'`: 1/1 PASS.
- Parent PR #13's full remote GitHub Actions workflow completed **successfully** after merge (run `37973824431`), independent of this new branch.

## Open release gates

- Not yet visually tested with real Firebase instructor and student accounts, claims and enrollment. Do not call it live production usage.
- Need actual instructor role provisioning and an enrollment management backend; frontend cannot self-enroll.
- Chess legality is validated by the trusted instructor client and replayed by observers, not cryptographically/server-authoritatively verified. Firebase Rules prove field structure, ownership, revision sequencing and authorization, not chess legality.
- A revoked user's previously cached board may be retained by untrusted modified clients; newly issued Firestore reads are denied, and normal Chessy client clears state on subscription authorization errors.
- Paid videos are out of scope: Firebase Storage download URLs can be shared beyond enrollment revocation.
- No Firebase production rules deployed by this branch. No merge of this new branch into main until browser pilot with enrolled student/teacher, real backend provisioning and CI on the draft PR.
- Granite adversarial independent review still blocked by shared workstation memory pressure; do not claim that model's approval.
- Preserve unrelated preexisting `graph/drag-overlay-regression-events.jsonl` changes and `.dist-prev-683bc6f4-20261004T232827Z/` backup.
