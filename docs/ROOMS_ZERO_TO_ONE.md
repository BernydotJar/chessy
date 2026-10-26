# Chessy · Private rooms and the Level 0 → 1 learning path

**Implementation branch:** feat/chessy-zero-one-rooms-20261023
**Baseline:** origin/main (c996680)
**Scope:** Chessy, Firebase Auth, Firestore rules, coach rooms, invitations, diagnostics, instructor board and beginner milestones.

## User journeys

### Adult learner / parent or guardian
1. Create or use an adult-owned account. Direct signup is disabled when the visitor identifies as a minor. Google login does not establish a legally verified adult identity.
2. Verify the email. Resend and refresh-verification actions are available.
3. Follow an invitation link: #/rooms/{opaqueInviteId}. If login is required, the invitation is retained in session storage and can be resumed.
4. Choose one age band: 6–9, 10–12, 13–17, or 18+. A responsible adult must explicitly attest to supervision for a child.
5. Join an eligible private room. Membership and the per-user membership index are written atomically.
6. Complete five original questions appropriate to age. Scores are placement guidance only, NOT ELO or a certified assessment.
7. See the instructor board live. Only the learner and coach may read that learner's diagnostic.
8. Withdraw from the room. Membership, index and diagnostic are deleted atomically.
9. Account deletion checks for any remaining room data first and blocks deletion to avoid orphaned minor diagnostics.

### Approved coach
1. Sign in with verified email and a trusted, server-issued custom claim chessyRole=coach or admin.
2. Create a private room for children/teens, adults, or mixed ages.
3. Generate an unpredictable 20-character invitation valid for seven days, and deliver via native share sheet, copy, or prepared email. The email client sends only after the user confirms; there is no server-side mail delivery.
4. See member count and anonymized diagnostic scores update live. No learner birth dates or names are collected.
5. Move, lock or reset the board. The chess.js reducer rejects illegal moves and stale revisions. Firestore enforces owner role and monotonically increasing revisions; learners cannot move the board.
6. Revoke individual invitations or close the room to disable new joins.

### Level 0 → Level 1 learning experience

The beginner path works even for anonymous local learners. The diagnostic does not grant mastery. Completion is based on existing Chessy progress, not an official skill certificate:

| Milestone | Activity evidence |
| --- | --- |
| Identify the board | Complete board-vision lesson |
| Move rook and bishop | Solve rook-file and bishop-diagonal unaided |
| Move knight and pawn | Solve knight-jump and pawn-capture unaided |
| Protect the king | Complete king-safety lesson |
| First checkmate | Solve back-rank unaided |

Each milestone opens the next unfinished activity using an exact training deep link. Imported progress is not independently certified.

## Firestore trust boundaries

| Collection | Write access | Read access |
| --- | --- | --- |
| learningRooms/{roomId} | Approved coach only (create, close) | Owner and members; owner-only queries |
| learningRooms/{roomId}/board/current | Owner coach; validated revision | Owner and members |
| roomInvites/{inviteId} | Owner coach (create, revoke) | Opaque token holder while room is active and token unexpired; owner-only queries |
| learningRooms/{roomId}/members/{uid} | Verified learner at invite redemption | That learner or coach |
| userRooms/{uid}/rooms/{roomId} | Same learner, atomic mirror | Only that learner |
| learningRooms/{roomId}/diagnostics/{uid} | Same learner, once per active room | Same learner or coach |

Membership uses a Firestore batch and security-rule getAfter checks to validate the invitation expiry, matching room/owner, age band and supervision attestation. Only trusted admin code can grant coach role.

## Reproducible verification

Run from a checkout with dependencies installed:

    npm run verify
    node scripts/rooms-browser-verify.cjs
    CHESSY_HEADLESS=1 node scripts/browser-verify.cjs

Run the local Firebase rules and authenticated browser tests (Firebase CLI and Java 21 or newer required):

    firebase emulators:exec --project demo-chessy-rooms --config firebase.rooms-emulators.json --only firestore,auth "node scripts/rooms-auth-fixtures.mjs && node scripts/rooms-auth-browser-e2e.cjs"
    firebase emulators:exec --project demo-chessy-rooms --config firebase.coach-emulators.json --only firestore "node scripts/room-rules-verify.mjs"
    firebase emulators:exec --project demo-chessy --config firebase.coach-emulators.json --only firestore,storage "node scripts/coach-rules-verify.mjs"

All browser tests use isolated Playwright Chromium and demo Firebase accounts, never the operator's authenticated Chrome or production credentials. Evidence is stored in progress/evidence/rooms.

## Production rollout gate — NOT automatically deployed

Before deploying, the release owner must:
- Review minor-safety policies, privacy notice, retention and parental-consent requirements for each jurisdiction. Guardian consent is self-attested and must NOT be represented as legal compliance.
- Provision coach role only with trusted server/admin custom claims and verify existing coach-class permissions.
- Deploy and validate firestore.rules before releasing the frontend route. Execute controlled rules smoke tests.
- Confirm email-password/Google providers, verification templates, authorized domains, Firestore indexes and App Check.
- Establish Firestore usage budgets, invite-generation rate limits, invitation-expiry cleanup, audit logs, and retention/deletion for rooms owned by departing coaches.
- Check account deletion with and without classroom data, including the earlier coach-class enrollment model.
- Pilot with actual teachers and responsible adults on mobile and desktop with approved safeguarding procedures.

**Deliberate limitations:** Only approved coaches create rooms; one learner profile per account and room (no sibling subprofiles); no native A/V/chat; no automatic outbound email; no Elo or server-certified skill levels; no owner-room purge backend; no legally verified parental identity.

**Rollback:** Coordinate restoring previously reviewed Firestore rules with a migration plan; never introduce policies that expose room documents. Revert frontend route and revoke affected tokens. Preserve private records until retention owner confirms lawful deletion.

## Integration

Chess.com can inform a UX comparison, but this implementation neither scrapes Chess.com nor requires its private APIs. The existing coach class catalog and its meeting/recording access remain separate. The premium themes and ECO analysis worktrees are not modified.
