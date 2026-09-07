# Chessy Auth + Native Readiness v1

Baseline: Chessy Mobile Product v1 is released at commit `4ed964387a520092baef8323513a227e69687ea1`. This is a new phase and does not reopen Mobile v1.

## Product objective

Add a real account boundary to the PWA without making an account mandatory for chess play, and shape that boundary so future Android/iOS clients can reuse the same domain model while replacing the web-specific authentication transport.

## P0 scope

1. Keep Chessy fully usable as a local-first guest, including offline play, Academy, Challenges, Progress and Stockfish.
2. Add a dedicated account destination reachable from desktop and mobile chrome without reordering the five primary mobile destinations.
3. Define an authentication domain that is independent from the chess/game stores.
4. Add a Firebase Authentication web adapter supporting:
   - email/password sign in;
   - email/password account creation;
   - Google sign in;
   - password reset;
   - sign out;
   - deletion of the currently authenticated Firebase account.
5. Persist Firebase auth state using browser IndexedDB when configured.
6. Treat Firebase web configuration as public client configuration; do not commit service-account keys, private keys, admin credentials or refresh tokens.
7. When Firebase is not configured, Chessy must remain functional and the account surface must state that cloud sign-in is not connected rather than pretending authentication succeeded.
8. Do not sync, merge or overwrite local chess progress in this phase. Authentication and progress synchronization are separate concerns.
9. Preserve installability and offline behavior of the PWA.
10. Document the adapter contract required for future native Android/iOS clients.

## Native readiness contract

The UI consumes a provider-neutral `AuthUser` and auth actions. The browser implementation may use Firebase Web SDK; Android/iOS may later use native Firebase SDKs or another adapter without changing chess domain state.

Identity fields exposed to Chessy are limited to stable user id, email, display name, photo URL, provider and email-verification state. Provider-specific token objects must not enter game or learning stores.

The recommended future application identifier is documented, not registered by this phase. Deep links, Apple Sign In, push notifications, app-store submission and cloud progress sync are intentionally deferred.

## Security and privacy constraints

- Never place privileged Firebase Admin credentials in the PWA bundle.
- Never store passwords in Chessy code, localStorage or IndexedDB directly; credentials are handled by Firebase SDK APIs only.
- Never log passwords or auth tokens.
- Authentication errors shown to users must be normalized and must not expose provider internals unnecessarily.
- Account deletion must be available from the account surface when signed in. If Firebase requires recent re-authentication, show a safe actionable error instead of bypassing that control.
- Local progress remains on-device after sign-out or account deletion unless the user explicitly removes it in a future data-management flow.

## Offline semantics

- An unauthenticated user can use all current local chess functionality offline.
- A previously authenticated Firebase session may be restored from provider persistence when available.
- Signing in or creating an account requires connectivity.
- Offline mode must never block access to local chess content because auth cannot reach its provider.

## Provider configuration

The web adapter reads Vite client variables:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- optional `VITE_FIREBASE_MESSAGING_SENDER_ID`
- optional `VITE_FIREBASE_STORAGE_BUCKET`
- optional `VITE_FIREBASE_AUTH_EMULATOR_URL` for local verification only

If the four required values are absent, auth state is `unconfigured`.

## Acceptance criteria

- Existing Mobile v1 quality gates remain green.
- Auth configuration parsing has deterministic tests.
- Unconfigured production behavior has browser coverage and no broken sign-in controls.
- Auth account route has automated WCAG 2.1 AA coverage at desktop and mobile widths.
- PWA offline verification still passes with auth code present.
- Firebase code is loaded only by the auth boundary; chess modules do not import provider SDK types.
- No new application container is created.
