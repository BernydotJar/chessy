# Chessy LiveKit — adversarial review, 2026-10-29
Scope: Eduardo requested adversarial testing and merge of PR #19 so the instructor can begin using classrooms. The review covers code integration; production activation remains a separate operational release. Tests and source review were performed by the implementing agent, not an independent human/model reviewer.

## Findings and fixes
| Finding | Evidence | Resolution |
| --- | --- | --- |
| P1 — learners could fill all 12 seats before the instructor joined | Before-fix Firestore test admitted 12 learners; baseline-capacity-failure.json preserves the failure | Reserve one seat for the owning instructor; concurrent admissions remain transactionally bounded to 11 learners + 1 instructor |
| P2 — JSON array identifiers were coerced into strings | Before-fix probe reached the database with roomId=[validId] | Require strict string IDs and reject malformed request/participant types before database/provider access |
| P2 — late events from a retired class/connection could cancel a new connection | Lifecycle source review plus deterministic delayed-state tests | Bind lifecycle cancellation to the joined class; ignore retired SDK instances and late previous-class snapshots |
| P2 — malformed expiry snapshots could throw inside a realtime listener | Timestamp parsing tests and actual browser snapshot fault injection | Validate the full snapshot and disconnect gracefully, with successful recovery |
| P3 — startup retry and localized participant presentation | Instructor-path source review | Expose idempotent retry while starting; prioritize instructor video and localize participant labels |

## Verification
Candidate source: 4b0bf6a1304015293f569edf2b2ab66e75978769, integrated by a normal merge with current main a8736b3 (mobile viewport fix #18).
- TypeScript, ESLint, 328 frontend tests and 21 backend tests PASS.
- 28 integration scenarios PASS: 16 real Cloud/browser scenarios with synthetic media/adult identities, plus 12 Firestore lifecycle/adversarial scenarios with an injected provider for fault/concurrency control.
- Validated foreign-coach escalation, cross-room IDs, missing/expired/minor memberships, concurrent capacity, pending-token withdrawal/removal, rate limits, startup retry, late HTTP response after navigation, malformed realtime state, screen permissions, media reception, shared board, moderation, cached JWT rejection and cleanup.
- Both GitHub Actions jobs PASS, including normal and opt-in video builds, existing browser suites, child-safety controls and the mobile gameplay regression. CI run: https://github.com/BernydotJar/chessy/actions/runs/40934440828.
- Temporary demo emulators/browser contexts were stopped and the temporary provider secret file removed.
Actual provider QA is not a real-device, load/cost, teacher UAT or independent review certificate.

## Merge and activation
The user explicitly authorized the merge. This review supports integration of the guarded code after exact-head CI checks; default flags remain OFF.
Observed production health remains a8736b3. The current production build configuration identifies chessy-pwa-2026 with private rooms/video OFF, no App Check site key and no configured room privacy notice. Function inventory could not be verified with the current Firebase CLI identity. No production secrets, Firebase rules/functions or public feature flags were changed.
The instructor's public classroom still needs Chessy-scoped provider configuration, deployed/verified room backend and rules, real App Check, the approved privacy notice, and adult pilot acceptance. Minor video access remains denied.
