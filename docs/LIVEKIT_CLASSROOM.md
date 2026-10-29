# Chessy LiveKit classroom
Implementation: React/Vite + Firebase callable Functions + LiveKit Cloud. The private learning room and its shared board persist between temporary video classes. This increment admits adult learners only. Existing child-room authorizations do not authorize audio/video.

## Experience
An approved owner starts a class; enrolled adults join with microphone/camera off. Participants see the shared board beside the video on desktop and above it on mobile. The instructor can share a screen, mute/remove learners, and end the class. Leaving the view or signing out disconnects media. Removing a learner blocks new credentials for that session.

## Configuration
Frontend build flags:
- VITE_CHESSY_PRIVATE_ROOMS_ENABLED=true
- VITE_CHESSY_LIVEKIT_ENABLED=true
- Existing Firebase configuration, real production App Check and approved room privacy notice.
Both feature flags default off. Do not enable the public site merely because the code is merged.

Functions runtime:
- CHESSY_LIVEKIT_ENABLED=true
- CHESSY_LIVEKIT_URL=wss://YOUR_CHESSY_PROJECT.livekit.cloud
- CHESSY_LIVEKIT_API_KEY and CHESSY_LIVEKIT_API_SECRET in Firebase Secret Manager. They bind only media endpoints, room closure/withdrawal and reconciliation.
- Existing CHESSY_ROOM_PRIVACY_NOTICE_URL / CHESSY_ROOM_PRIVACY_VERSION.
Use a Chessy-scoped Cloud project/key for production. The existing LUMA QA account is used only for disposable tests with opaque chessy_ room names. Never place provider keys in VITE_ variables.

Deploy the compatible Functions and Firestore rules before enabling the UI. The private live/current document is readable only by eligible room participants; lifecycle and credential ledgers are server-only. Review compatibility, notices and regional requirements in the existing room runbooks.

## Lifecycle guarantees and limits
Each class lasts at most 120 minutes, with 12 distinct issued identities. Join credentials last 90 seconds and allow camera/microphone for learners; only coaches can publish screen tracks. No recording/admin/create/data/self-metadata grants are issued. No persistent chat or recording is implemented.
Token issuance records identities transactionally and rechecks room, class, membership and removal state after signing. Closing first fences new tokens, revokes every issued identity using an explicit Cloud timestamp, and then deletes the media room. A failed provider operation leaves status=closing; retry ending the same session. Room close is retryable even after the learning-room status changed. Withdrawal removes membership first and then revokes its media identity; a failed revocation is retried by reconciliation.
A one-minute reconciler ends expired/closed classes and removes revoked/expired adult memberships. Expiry is therefore enforced at that operational interval, plus provider latency. Monitor errors and scheduler execution. Credential ledger subcollections are recursively purged after their seven-day expiry. Audit records retain the existing 90-day room policy.
LiveKit OSS removal does not have the same token revocation semantics. Production configuration rejects self-hosted URLs. Loopback is permitted only with both FUNCTIONS_EMULATOR=true and CHESSY_LIVEKIT_QA_MODE=local.

## Verification
- npm run typecheck
- npm run lint
- npm test -- --run
- npm --prefix functions run check
- npm audit --omit=dev --audit-level=low
- npm audit --prefix functions --audit-level=low
- node scripts/livekit-qa-run.cjs --existing-qa-project
The last command requires the previously configured, owner-only LiveKit QA CLI configuration. It starts its own demo Firebase emulators on ports 19708/19739/19749 and isolated headless Chromium, creates disposable identities and classes, and removes the test media room. It preserves all other provider rooms/accounts. It never uses personal Chrome/Edge sessions. Java 21 is required; the existing /opt/luma-jre21 runtime is reused when present.
QA uses synthetic camera/audio/screen media through the real Cloud provider. It is not a claim that people held a real lesson, nor a load/device acceptance certificate.

## Graph and release
Use python3 scripts/live-graph.py validate/status. This increment preserves the historical premium graph and uses its own append-only event stream with the shared harness pinned to 168b740045293089720964bdc0d2bda79828b5c8. No independent review is claimed for the implementing agent’s own checks.
Verification artifacts are in progress/evidence/livekit. Production acceptance, independent review, device/network/load checks, backend operational configuration and public activation remain explicit release work. Local/provider PASS never means public deployment PASS.
