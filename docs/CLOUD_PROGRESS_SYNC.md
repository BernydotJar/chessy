# Chessy Cloud Progress Sync v1

Chessy remains local-first. Learning actions are written to the existing local progress store immediately and are usable offline. When a Firebase user is authenticated, a background sync transaction merges that local snapshot with `users/{uid}/progress/current` in the dedicated `chessy-pwa-2026` Firestore database.

The synced schema is intentionally narrow: solved challenge IDs, completed lesson IDs, activity days, total mistakes, and per-puzzle review counters. XP is derived from validated completions. Saved games, PGNs, board/theme preferences, language, Stockfish settings, and analytics are not part of v1.

Merge semantics are idempotent: completion and day lists use set union; review `wrong`/`correct` counters use monotonic maxima and the latest valid activity day; the merged result is passed through `parseProgress` before it can replace local state or be written back to Firestore. Re-uploading the same device snapshot therefore cannot duplicate XP or counters.

Firestore Security Rules allow only an authenticated user to read/write/delete their own `users/{uid}/progress/current` document. Other paths default to deny. Account deletion first deletes the progress document and only then deletes the Firebase Authentication identity.

The UI exposes `local-only`, `syncing`, `synced`, `pending`, and `error` states. An offline change remains local and is retried when connectivity returns. A cloud failure does not block local learning.
