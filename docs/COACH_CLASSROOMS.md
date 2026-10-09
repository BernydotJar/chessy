# Chessy — Coach-led classrooms: product and architecture

Status: **pilot implementation, not a production release**. Date: 2026-10-09. Owner: Chessy. Branch: `feat/chessy-adversarial-cx-20261009`.

## Product problem and decision

Chessy already has legal chess puzzles, learning tracks, an in-browser chessboard, Stockfish practice, account sign-in and account-scoped progress. The missing bridge is instruction by a real coach.

The learner journey is: **choose a published live or recorded class → understand a concept → follow its linked lesson → practice on the chessboard → review mistakes → observe learning progress**. Lessons link to original curriculum IDs rather than duplicating copyrighted material. A recorded lecture is an input into practice, not a substitute for demonstrated chess ability.

## Built in the feature branch

- **Discover / Clases:** catalog with visible status, language and schedule; preserves the existing five-destination mobile navigation and adds a sidebar destination and home CTA.
- **Coach Studio:** only users holding a **server-provisioned** Firebase Auth custom claim `chessyRole: "coach" | "admin"` **and** a verified email see the editor. A UI check improves UX but is **not** the authorization boundary: Firestore/Storage rules independently enforce permission.
- **Live sessions:** title, short description, ISO time, lesson link and an HTTPS meeting URL for Google Meet, Zoom or Teams stored separately from public catalog metadata. Session initially saved as draft, published explicitly. Video/meeting platform is external; participants are subject to that provider's waiting room and access policies.
- **Recorded sessions:** MP4 upload capped at 100 MiB, written under `coach-recordings/{ownerUid}/{sessionId}/video.mp4`. Upload occurs while the Firestore document is still in **draft**; only once Storage succeeds is the document updated with `videoPath`; publication is a separate action. Supports a retry from a saved draft after upload failure.
- **Playback:** only explicitly enrolled learners and the verified owner can request Storage playback URLs for published lessons. The app never marks an incomplete recording as published through the editor.
- **Three languages:** Spanish, English and Portuguese surfaces.
- **UX hardening:** anonymous-account progress import is opt-in, user data is namespaced locally, cloud sync merges events added while network calls are in flight, lesson URLs are deep-linkable and refresh-safe.

## Cloud contract and authorization

Firestore public catalog: `coachSessions/{sessionId}`. Private meeting credentials: `coachSessionSecrets/{sessionId}`. Trusted enrollment grants: `coachEnrollments/{sessionId}/members/{uid}`.

| Field | Type | Meaning |
|---|---|---|
| `schemaVersion` | literal 1 | Contract version |
| `ownerUid` | Firebase UID | Immutable author, validated in rules |
| `kind` | `live` / `recorded` | Session mode |
| `status` | `draft` / `published` | Explicit release |
| `title`, `description`, `language` | bounded strings | Learner-facing metadata |
| `startsAt`, `meetingUrl` | ISO date / null | Public schedule; catalog `meetingUrl` is always null |
| `videoPath` | Storage path or null | Recording media; must agree with owner and doc ID |
| `relatedLessonId` | curriculum ID or null | Link from teaching into practice |
| `createdAt`, `updatedAt` | server timestamps | Auditable timing |

Firestore queries must be constrained: public catalog `where("status","==","published")`, coach workspace `where("ownerUid","==", auth.uid)`. Firestore Rules are **not** query filters. A malicious client cannot safely be stopped by hiding an editor button; rules check role, ownership and record structure.

Storage Rules require a coach owner to upload a bounded `video/mp4` object to a fixed path in a draft session. Read requires a matching enrollment record or verified owner role, and the published session path and owner must match. A user's authenticated session alone never authorizes playback.

**Access boundary:** Published meeting URLs no longer appear in the public catalog. A verified instructor can save a private link in `coachSessionSecrets/{sessionId}`, and students can only read it when a trusted server grants a document at `coachEnrollments/{sessionId}/members/{uid}`. The frontend cannot create enrollments. A signed-in account without enrollment receives permission denied. The meeting provider must still enforce admission.

**Important limitation:** `getDownloadURL()` returns a shareable, revocation-unaware download-token URL. Firebase Storage rules restrict requesting it, but a previously issued URL can be copied or retained after enrollment revocation. **Do not use these MP4 flows for paid/sensitive content until playback is issued through a trusted entitlement-checking server with short-lived signed URLs or a protected streaming provider.** Even enrollment-gated meeting links may be copied after access; use the provider waiting room and identity verification. Before deploying rules, confirm that no legacy published `coachSessions` documents retain a non-null `meetingUrl`; migrate such records securely or delete them.

## Production activation checklist

1. Create/confirm Firebase Storage bucket, billing limits and cost alerts; verify compatible CORS and permitted domains for Firebase Auth.
2. Provision student access using a trusted backend/Admin SDK, not browser writes, to `coachEnrollments/{sessionId}/members/{uid}`. Verify enrollment withdrawal and the joining experience.
3. Assign the coach's role from a **trusted server/administrative Firebase Auth environment**, never from the frontend: `customClaims.chessyRole = "coach"`. Require a verified email and refresh/re-sign-in to obtain new claims. Maintain an explicit allowlist of appointed coaches.
4. Deploy `firestore.rules` and `storage.rules` **after** live/staging emulator authorization tests including unauthorized writes, draft invisibility, owner mismatch, maximum media size, delete and reauthentication; verify rules and index state in the target project. The presence of rules in a Git branch does not mean they are deployed.
5. Verify browser journeys for coach upload, publish, learner join/playback, revoked coach claim, two accounts sharing a browser and mobile. Use test identities and delete test recordings to control costs.
6. Confirm teacher owns/is licensed to upload all class content. If minors are involved, collect applicable guardian approvals and **default to not recording identifiable participants**.
7. Finalize a real coach account, consent, a small number of original lessons, sample puzzles and instructor readiness review. Add production monitoring for upload failures, token access denial and cost.

## Next architecture increments

**P0 — release controls:** Cloud rules proof against real emulator actors, coach claim provisioning, recording storage/cost policy, independent adversarial model verification once infrastructure memory is available, end-to-end mobile instructor tests.

**P1 — premium paid classes:** Provisioning workflow for server-checked enrollments, session access audit, expiring signed playback, HLS transcoding, time-limited instructor uploads, abuse/revocation workflow, structured cancellation/rescheduling, student progress per coach lesson. A media service or Cloud Run transcoder will be needed before large videos and long classes.

**P2 — interactive chess classroom:** provider adapter for live audio/video (for example Zoom/LiveKit), shared FEN/PGN board state with host-controlled moves, pause-and-solve moments, annotations/arrows, breakout exercises, attendance & teacher feedback, replay from the key chess position and a post-class personalized review queue. Live audio/video provider permission management and server timestamps are separate from the move-authoritative chess classroom event stream.

## Scope boundaries

No embedded videoconference server, no video processing pipeline, no paywall, no DRM, no teacher payout, no automated class transcription, and no learner skill rating inferred from attendance are implemented by this pilot. Do not describe any of those as complete. Current 112 playable positions and original lessons remain the instructional core.
