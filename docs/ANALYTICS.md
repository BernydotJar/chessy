# Chessy Product Analytics v1

Chessy uses a dedicated GA4 property linked to Firebase project `chessy-pwa-2026`.

- GA4 property: `553107088`
- Web measurement ID: `G-LWQED9BJG6`
- Hosting stays on the existing Chessy Cloudflare/Caddy edge; Analytics does not change deployment architecture.
- Analytics is **off by default**. The Firebase Analytics module is not initialized until the player explicitly enables **Help improve Chessy** in Settings.
- Consent is stored locally under `chessy-analytics-consent-v1` and can be withdrawn at any time.
- Advertising storage, ad user data, ad personalization, and personalization storage are always denied in v1.
- Chessy does not set GA `user_id` and does not bind Firebase Authentication UID to behavioral analytics.

## Event taxonomy

| Event | Purpose | Allowed parameters |
| --- | --- | --- |
| `screen_view` | Understand navigation and high-level feature use | `screen_name` |
| `game_start` | Measure game starts and setup friction | `opponent`, `difficulty`, `player_color` |
| `game_complete` | Understand completion and abandonment | `opponent`, `difficulty`, `result`, `move_count`, `end_reason` |
| `puzzle_start` | Measure training entry | `mode`, `category`, `level` |
| `puzzle_complete` | Measure training completion | `mode`, `category`, `level`, `assisted`, `mistake_count` |
| `lesson_complete` | Measure curriculum completion | `track`, `level` |
| `auth_success` | Measure successful authentication paths | `provider`, `method` |
| `progress_sync_result` | Monitor sync reliability at a product level | `result` |
| `settings_changed` | Understand preference adoption | `setting`, `value` |

## Hard privacy boundary

The analytics sanitizer drops every field outside the allowlist. The product contract forbids FEN, PGN, move notation, individual puzzle IDs/answers, email, display name, free text, Firebase UID, saved game content, and cloud-progress payloads.

No session replay, heatmaps, ad attribution, marketing audiences, or A/B testing are part of v1.

## Product questions this should answer

1. Do players reach `game_start` after opening Play, or does configuration cause abandonment?
2. What fraction of started games reach `game_complete`?
3. Which training modes and broad categories are used and completed?
4. Do players return to lessons and finish them?
5. Are Auth and Progress Sync reliable at the feature level?
6. Which global preferences are useful enough to keep in Settings?

Detailed reports can be viewed in the Firebase/Google Analytics property for Chessy. Analytics reporting latency is provider-controlled; realtime/debug data appears sooner than standard aggregated reports.
