# Chessy authentication and native readiness

## Boundary

Chessy treats authentication as an identity service, not as the owner of game state. The UI talks to a provider-neutral auth store. The PWA adapter uses Firebase Authentication when configured. A future Android/iOS client can provide a native adapter with the same operations.

## Why this matters for native apps

The chess engine, learning progress, game history and review logic remain independent of Firebase SDK objects. This avoids coupling PWA code to Android/iOS implementation details and keeps future migration to native SDKs bounded.

## PWA provider set

Initial web target:

- email/password;
- Google;
- password reset;
- sign out;
- account deletion.

Apple Sign In is deferred until the Apple developer identifiers, domain verification and native entitlement plan are available. It should be added through the same adapter contract, not directly inside Chessy views.

## Future Android/iOS adapter

A native adapter must expose the same normalized user shape and actions while using platform SDKs for provider flows. Recommended package/bundle identifier for planning: `app.chessy.mobile` (not registered by this phase).

Native work should also add:

- secure platform credential/session persistence supplied by the provider SDK;
- app links / universal links where provider redirects require them;
- Google configuration files kept out of public source when appropriate;
- Apple Sign In on iOS when required by product/provider policy;
- account deletion and privacy disclosures before store submission;
- real-device lifecycle tests for background/foreground and expired sessions.

## Cloud Progress Sync v1

Authenticated PWA users now receive account-scoped learning-progress synchronization through Cloud Firestore while Chessy remains local-first. The immediate write target is still `localStorage`; the cloud layer synchronizes only the validated learning `Progress` model (solved challenges, completed lessons, activity days/streak data, and review/mistake state). Saved games, PGNs, themes, language and engine preferences remain device-local in this phase.

The cloud record lives at `users/{uid}/progress/current`. First login and later device joins use an idempotent merge: completion/day sets are unioned, review counters use monotonic maxima, and every merged payload is revalidated through the same `parseProgress` boundary used for imports. XP stays derived from trusted identifiers rather than becoming a writable cloud counter.

Account deletion removes the cloud progress document before deleting the Firebase Authentication identity. If that cleanup cannot complete, Chessy does not proceed with identity deletion.


## PWA Google sign-in transport

Chessy is hosted behind the existing Cloudflare/Caddy edge rather than Firebase Hosting. The PWA therefore uses `signInWithPopup()` for Google instead of `signInWithRedirect()`. This avoids the third-party storage dependency in redirect auth on modern browsers while keeping the provider behind `AuthAdapter`. Android/iOS may replace this transport with their native Google/Firebase SDKs without changing game or learning domains.

Production Firebase project: `chessy-pwa-2026`. Firebase Authentication provides identity and Cloud Firestore stores only the bounded learning-progress document described above. Hosting remains on the existing Chessy Cloudflare/Caddy edge. The PWA server uses `Cross-Origin-Opener-Policy: same-origin-allow-popups` so the Google popup can return control to Chessy without weakening the existing frame, referrer, content-type or blocked-route protections.
