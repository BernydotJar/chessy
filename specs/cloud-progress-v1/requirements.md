# Chessy Cloud Progress Sync v1

## Objective

Fix the Google popup completion failure on the public Chessy PWA and add secure, optional, account-scoped cloud synchronization for learning progress while preserving the existing local-first/offline behavior.

## Scope

### Google popup reliability

- Production responses used by the PWA MUST allow a Firebase/Google authentication popup to retain its opener relationship.
- `Cross-Origin-Opener-Policy` MUST be `same-origin-allow-popups` for Chessy application responses.
- Existing `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, blocked internal routes and HTTPS edge behavior MUST remain intact.
- A regression check MUST prove a cross-origin popup retains `window.opener` under the production server headers.

### Cloud progress data

Sync only the current learning `Progress` model:

- solved challenge identifiers;
- completed lesson identifiers;
- activity days used for streaks;
- total mistakes and per-puzzle review counters.

Do not sync saved games, PGNs, board preferences, themes, language, engine settings, analytics events or arbitrary user files in this phase.

XP MUST remain derived from trusted solved/lesson identifiers and MUST NOT be stored as an authoritative cloud number.

### Local-first contract

- Chessy MUST remain fully usable as a guest and while offline.
- `localStorage` remains the immediate persistence layer for learning progress.
- Cloud sync runs only when Firebase is configured and a Firebase user is authenticated.
- A cloud/network failure MUST NOT erase or block local progress.
- Signing out MUST preserve progress already present on the device.

### Merge semantics

Cloud sync uses a transaction against the account progress document.

- `solved`, `lessons`, and `days`: set union, validated against the existing progress parser.
- Review records are merged per puzzle with monotonic `wrong`/`correct` maxima and latest valid `lastDay`.
- `correct` MUST never exceed `wrong`.
- `mistakes` is the maximum of the validated local total, validated remote total and the merged review wrong-count total.
- The result MUST pass `parseProgress` before it becomes local or cloud state.
- The merge is intentionally conservative: it must never duplicate counters because the same local snapshot was uploaded twice.

### Firestore model

Dedicated Firebase project: `chessy-pwa-2026`.

Document path:

`users/{uid}/progress/current`

The document contains only sanitized progress, schema metadata and timestamps. The authenticated UID is the sole owner. Firestore Security Rules MUST reject unauthenticated access and cross-user reads/writes.

### Account deletion

When a signed-in user confirms account deletion:

1. delete `users/{uid}/progress/current` while the Firebase identity is still authenticated;
2. only after cloud progress deletion succeeds, delete the Firebase Authentication account.

If cloud deletion fails, identity deletion MUST stop and the UI MUST communicate that data cleanup could not be completed.

### User experience

The Account and Progress views MUST expose useful sync state: signed out/local only, syncing, synced, pending/offline, or error, plus last successful sync when available.

ES, EN and PT copy MUST remain aligned.

## Security and limits

- No service-account/private-key material in the repository.
- Firebase Web configuration remains public client configuration only.
- Firestore rules restrict each user to their own progress document and bounded schema/collection sizes.
- No Identity Platform upgrade and no paid-only feature is required.
- No new Chessy application container.

## Verification gates

- static/type/lint/build and existing unit suite;
- independent 112-position chess verifier;
- browser workflows and WCAG;
- PWA offline checks;
- real Email/Password Firebase lifecycle;
- Google provider authUri and popup-opener regression;
- Firestore rules tests for allow-own/deny-other/deny-unauthenticated and invalid schema;
- real cloud progress first-upload, second-device merge, offline-local update, reconnect sync and account-progress deletion;
- public exact-SHA smoke after deploy;
- independent Granite critic before release and on final public SHA.
