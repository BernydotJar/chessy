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

## Progress synchronization is a separate phase

Signing in does not automatically upload local progress. A later sync phase must define stable records, conflict resolution, first-login migration, device merge semantics, deletion semantics, retry/idempotency and privacy controls before any on-device progress is sent to a backend.


## PWA Google sign-in transport

Chessy is hosted behind the existing Cloudflare/Caddy edge rather than Firebase Hosting. The PWA therefore uses `signInWithPopup()` for Google instead of `signInWithRedirect()`. This avoids the third-party storage dependency in redirect auth on modern browsers while keeping the provider behind `AuthAdapter`. Android/iOS may replace this transport with their native Google/Firebase SDKs without changing game or learning domains.

Production Firebase project: `chessy-pwa-2026`. Firebase is identity-only in this phase; hosting remains on the existing Chessy edge and progress remains local-only until a separately specified sync contract exists.
