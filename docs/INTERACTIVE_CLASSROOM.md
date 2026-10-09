# Chessy Interactive Classroom — Firestore real-time pilot

**Scope:** branch `feat/chessy-live-board-v1`, based on `main` release `7999c74`. Not yet activated in the production Firebase project.

## What is implemented

- Existing deterministic chess.js domain reducer `src/coach/classroomBoard.ts` validates UCI chess moves, SAN history, reset, lock and custom FEN positions. Every teacher command includes an `expectedRevision` to prevent stale tabs from overwriting one another.
- Firebase adapter `src/coach/liveBoardCloud.ts` stores one current board per live coach session under `coachSessions/{sessionId}/liveBoard/current`. Instructors initialize it once and submit commands through a Firestore transaction. Students receive position changes via `onSnapshot`, with no optimistic source-of-truth modification.
- The existing **Clases** screen loads `CoachLiveBoard` only when a class board is opened (React lazy), without creating another app or replacing the normal challenge board. A verified teacher can move by drag or UCI, lock/unlock, reset, set a legal FEN position, and review recent SAN moves. Students have a read-only board.
- All UI strings are localized for Spanish, English and Portuguese. The layout is responsive and leverages Chessy's existing board and color tokens.
- On account change or unmount the subscription is closed; an authorization error clears the existing displayed snapshot.

## Firestore authorization contract

- Only verified-email users with **trusted** `chessyRole=coach|admin` who **own** the parent session can initialize or update the classroom board.
- Learners need a trusted server-admin-provisioned enrollment document at `coachEnrollments/{sessionId}/members/{uid}`, and the parent session must be **published + live** to read the board.
- Owner UID and schema are immutable. The board revision must increase by exactly one on each write; operations constrain move counts and lock/reset shapes. Learners cannot write, list or delete the board.
- A nonexistent room is readable to authorized users so a teacher can start it; unapproved accounts cannot even read a nonexistent room.
- Firestore rules **cannot prove chess move legality**; the authenticated trusted instructor's transaction uses the chess.js reducer and clients replay snapshots to reject impossible SAN/FEN combinations. For an adversarial *instructor* or monetized room, move legality requires an authoritative server endpoint, not just client checks.

## Verification

- `npm run verify`: lint, unit and production build gates.
- Unit tests `tests/classroom-board.test.ts` and `tests/live-classroom.test.ts` cover legal moves, stale revisions, lock/reset, trusted snapshot replay and forged remote state.
- `firebase emulators:exec --project demo-chessy --config firebase.coach-emulators.json --only firestore,storage 'node scripts/coach-rules-verify.mjs'`: adversarial roles and a two-client `onSnapshot` propagation check.
- The existing `github-pages.yml` CI workflow runs these emulator rules tests with Java 21.
- **Not verified yet:** an instructor signed in with production custom claims, a real student enrollment workflow, the two-browser instructor/student visual journey, mobile board behavior in a populated course, network failure/reconnect and revocation of an already issued video URL.

## Operational / commercial boundaries

This is a **free instructor pilot**, not a paid video platform. The Firebase production rules must be deployed separately following a migration audit; a merged Git branch does not change backend permissions. Server-side enrollment provisioning, role assignment, instructor confirmation and real-device smoke tests are release prerequisites. Students who are not enrolled cannot join a class simply by signing in.

Meet/Zoom/Teams admission is managed by the meeting provider. Storage `getDownloadURL()` tokens remain shareable and potentially useful after student enrollment is revoked, so do **not** publish confidential, paid or sensitive recordings until playback is delivered through time-limited server-checked entitlements.

## Remaining experience increments

1. Teacher onboarding and trusted enrollment issuing/revocation; two real Firebase accounts to test coach and student.
2. Independent legally authoritative moves in a Cloud Function or Cloud Run API if instructor trust is insufficient, plus move analytics and durable append-only notation.
3. Pause-and-solve moments, arrows/annotations, PGN export, follow-up homework linked to original lessons, attendance with privacy protections, and observable learning gains rather than watch-time metrics.
4. Premium lesson delivery through secure playback and commercial subscription entitlements.

Granite model adversarial sign-off remains blocked by limited local Ollama resources. Do not represent deterministic verification as a Granite pass.
