# Chessy Atlas v2 — Country Expansion & Exclusive Studio

Date: 2026-10-19
Baseline: Country Themes v1 (11 existing themes, `#/themes` from Settings > Appearance).
Branch: `feat/chessy-atlas-premium-themes-20261019`

## Business acceptance and catalog

- Existing 3 classic themes and 8 country themes are preserved, selectable, and **remain free**. No retroactive paywall.
- Free Atlas expands to 11 countries with Peru (Stone & Copper), Costa Rica (Cloud Forest) and Japan (Indigo & Paper).
- Chessy Studio adds 4 premium-only designs: Obsidian & Gold, Porcelain Atelier, Imperial Midnight, Grandmaster Walnut.
- Total catalog: **18 themes: 14 free and 4 premium**.
- Discoverability remains exclusively under Settings > Appearance > Explore Collection; not in Play, Home or primary mobile nav.
- Every card opens a native, keyboard-accessible preview with an illustrative 8x8 board, individual palette, local SVG identity and explicit Apply action.
- Preview does not change the player's current theme; Apply changes chrome and board tokens and saves the choice on this device. Close/Escape leaves the current theme intact.
- ES/EN/PT provide names, descriptions, preview controls and access notices.
- CSS respects `prefers-reduced-motion`; artwork is local and available offline as ordinary PWA assets. The board has priority over decorative elements.

## Entitlement contract

The existing Firebase Authentication adapter exposes a **boolean** `premiumThemes` property *only* from the ID-token custom claim `chessyPremiumThemes === true`. String values, missing claims, failed token reads, unsigned-in sessions or revoked claims never grant premium access. The adapter listens for token refreshes, and ignores stale asynchronous results after a sign-out or account switch.

The ThemeManager checks the claim before storing/applying premium IDs. A saved premium ID alone does not bypass the guard: initial paint is the free Forest theme until entitlement is known. A signed-out player temporarily sees Forest while the premium preference remains device-local for later reauthorization.

**Billing is not implemented**. No prices, checkout, fake purchase or misleading Upgrade button are shown. A trusted Firebase Admin SDK backend could grant the signed claim following an authorized purchase or manually issued license in a *separate* future entitlement workflow. The signed claim must be created, revoked and audited server-side, never by browser code. New claims become effective after token refresh or reauthentication.

Important limitation: because static CSS/SVG assets are shipped to clients for previews, frontend access gating is UX authorization, **not content DRM**. Any eventual sale, subscription, payment webhook, or access to protected downloadable items requires a server-side authoritative entitlement record and enforcement. The claim flow is unit-verified but has **not** been exercised with a live premium account.

## Acceptance evidence from this checkout

- `npm run typecheck`: pass
- `npm run build`: pass (nonblocking existing bundle-size warning)
- `npm test -- --run`: 322/322 tests pass (16 suites), including theme entitlements and offline worker regression
- `tests/themes.test.ts`: theme counts, palettes, offline artwork paths, ES/EN/PT keys, fake premium storage and fallback
- `tests/theme-entitlements.test.ts`: Firebase claim grant/revoke, false values, token failure and sign-out
- `npm run test:pwa`: pass. All 18 theme art assets available in the initial offline installation cache.
- `npm run test:themes`: pass. Automated isolated Chromium browsing, all 14 free apply/reload/Play flows, all four premium dialogs locked for unsigned-in visitors, board colors, WCAG 2.1 AA automated checks, width checks 320/390/760/1024/1440, no page exceptions.
- Evidence: `progress/evidence/browser/theme-verification.json`, `chessy-atlas-v2-desktop.png`, `chessy-atlas-v2-mobile.png`

## Release gate: important incompleteness

- No live premium-account entitlement E2E (Admin SDK claim provisioning, refresh, authorized application, revocation).
- No payment provider, price catalog, invoices or subscription lifecycle.
- No PR/main CI or public deployment verification has been performed as part of this change; the local build **is not public acceptance**.
- Shared checkout contains unrelated concurrent work. Do not stage unrelated files; reconcile the branch with upstream, run full quality gates, and acquire separate public verification before marking production released.
