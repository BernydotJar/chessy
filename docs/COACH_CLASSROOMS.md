# Chessy — Coach-led classrooms: product and architecture

Status: **pilot implementation, not a production release**. Date: 2026-10-09. Owner: Chessy. Branch: `feat/chessy-adversarial-cx-20261009`.

## Product problem and decision

Chessy already has legal chess puzzles, learning tracks, an in-browser chessboard, Stockfish practice, account sign-in and account-scoped progress. The missing bridge is instruction by a real coach.

The learner journey is: **choose a published live or recorded class → understand a concept → follow its linked lesson → practice on the chessboard → review mistakes → observe learning progress**. Lessons link to original curriculum IDs rather than duplicating copyrighted material. A recorded lecture is an input into practice, not a substitute for demonstrated chess ability.

## Built in the feature branch

- **Discover / Clases:** catalog with visible status, language and schedule; preserves the existing five-destination mobile navigation and adds a sidebar destination and home CTA.
- **Coach Studio:** only users holding a **server-provisioned** Firebase Auth custom claim `chessyRole: "coach" | "admin"` **and** a verified email see the editor. A UI check improves UX but is **not** the authorization boundary: Firestore/Storage rules independently enforce permission.
- **Live sessions:** title, short description, ISO time, lesson link and an HTTPS meeting URL for Google Meet, Zoom or Teams. Session initially saved as draft, published explicitly. Video/meeting platform is external; participants are subject to that provider's waiting room and access policies.
- **Recorded sessions:** MP4 upload capped at 100 MiB, written under `coach-recordings/{ownerUid}/{sessionId}/video.mp4`. Upload occurs while the Firestore document is still in **draft**; only once Storage succeeds is the document updated with `videoPath`; publication is a separate action. Supports a retry from a saved draft after upload failure.
- **Playback:** authenticated learners can request a Storage download URL for published lessons. The app never marks an incomplete recording as published through the editor.
- **Three languages:** Spanish, English and Portuguese surfaces.
- **UX hardening:** anonymous-account progress import is opt-in, user data is namespaced locally, cloud sync merges events added while network calls are in flight, lesson URLs are deep-linkable and refresh-safe.

## Cloud contract and authorization

Firestore collection: `coachSessions/{sessionId}`.

| Field | Type | Meaning |
|---|---|---|
| `schemaVersion` | literal 1 | Contract version |
| `ownerUid` | Firebase UID | Immutable author, validated in rules |
| `kind` | `live` / `recorded` | Session mode |
| `status` | `draft` / `published` | Explicit release |
| `title`, `description`, `language` | bounded strings | Learner-facing metadata |
| `startsAt`, `meetingUrl` | ISO date/string or null | Live session details |
| `videoPath` | Storage path or null | Recording media; must agree with owner and doc ID |
| `relatedLessonId` | curriculum ID or null | Link from teaching into practice |
| `createdAt`, `updatedAt` | server timestamps | Auditable timing |

Firestore queries must be constrained: public catalog `where("status","==","published")`, coach workspace `where("ownerUid","==", auth.uid)`. Firestore Rules are **not** query filters. A malicious client cannot safely be stopped by hiding an editor button; rules check role, ownership and record structure.

Storage Rules require a coach owner to upload a bounded `video/mp4` object to a fixed path in a draft session. Authenticated read is granted for a published session using Firestore-backed authorization.

**Important limitation:** `getDownloadURL()` returns a shareable download-token URL. Firebase Storage rules restrict token issuance, but a URL already issued may be copied and shared. Likewise, the public class catalog currently includes the live meeting URL as metadata, even when the UI defers the Join action until sign-in. **Neither is an entitlement boundary**. Use these flows only for free pilot materials whose distribution has been authorized. The meeting provider must enforce admission. No paid courses, sensitive recordings, private youth sessions, or confidential data until these boundaries are replaced.

## Production activation checklist

1. Create/confirm Firebase Storage bucket, billing limits and cost alerts; verify compatible CORS and permitted domains for Firebase Auth.
2. Assign the coach's role from a **trusted server/administrative Firebase Auth environment**, never from the frontend: `customClaims.chessyRole = "coach"`. Require a verified email and refresh/re-sign-in to obtain new claims. Maintain an explicit allowlist of appointed coaches.
3. Deploy `firestore.rules` and `storage.rules` **after** live/staging emulator authorization tests including unauthorized writes, draft invisibility, owner mismatch, maximum media size, delete and reauthentication; verify rules and index state in the target project. The presence of rules in a Git branch does not mean they are deployed.
4. Verify browser journeys for coach upload, publish, learner join/playback, revoked coach claim, two accounts sharing a browser and mobile. Use test identities and delete test recordings to control costs.
5. Confirm teacher owns/is licensed to upload all class content. If minors are involved, collect applicable guardian approvals and **default to not recording identifiable participants**.
6. Finalize a real coach account, consent, a small number of original lessons, sample puzzles and instructor readiness review. Add production monitoring for upload failures, token access denial and cost.

## Next architecture increments

**P0 — release controls:** Cloud rules proof against real emulator actors, coach claim provisioning, recording storage/cost policy, independent adversarial model verification once infrastructure memory is available, end-to-end mobile instructor tests.

**P1 — premium paid classes:** Separate public catalog metadata from private join links, server-checked enrollments, session access audit, expiring signed playback, HLS transcoding, time-limited instructor uploads, abuse/revocation workflow, structured cancellation/rescheduling, student progress per coach lesson. A media service or Cloud Run transcoder will be needed before large videos and long classes.

**P2 — interactive chess classroom:** provider adapter for live audio/video (for example Zoom/LiveKit), shared FEN/PGN board state with host-controlled moves, pause-and-solve moments, annotations/arrows, breakout exercises, attendance & teacher feedback, replay from the key chess position and a post-class personalized review queue. Live audio/video provider permission management and server timestamps are separate from the move-authoritative chess classroom event stream.

## Scope boundaries

No embedded videoconference server, no video processing pipeline, no paywall, no DRM, no teacher payout, no automated class transcription, and no learner skill rating inferred from attendance are implemented by this pilot. Do not describe any of those as complete. Current 112 playable positions and original lessons remain the instructional core.
