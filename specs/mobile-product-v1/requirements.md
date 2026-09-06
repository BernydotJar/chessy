# Chessy Mobile Product v1 + Icon System v3 - Requirements

## Scope boundary

UI Kit v2 / CH-001 through CH-010 are closed baseline and must not be reopened. New work starts at CH-011 and must remain compatible with public release `6145963d1bb819cb53ffd29208c31beb0078e57c`.

## MP-01 Competitive product contract
- Keep Play, Challenges and Academy directly reachable.
- Preserve board-first hierarchy in Play, Challenges, Analysis and Review.
- Avoid dynamic relocation of primary actions.
- Define a mobile product decision matrix from competitor strengths and pain points.

## MP-02 Icon System v3
- Refine primary Chessy icons for optical balance at 18, 20, 22 and 24px.
- Use chess-native metaphors for Play, Training, Academy, Analysis, Review and Progress.
- Add a dedicated Chessy brand mark distinct from a generic crown/trophy.
- Selected navigation icons may use restrained fill/accent, but remain recognizable without color.
- Maintain currentColor theming and accessible labels on interactive controls.
- Add a deterministic icon gallery verification surface for visual QA.

## MP-03 Mobile information architecture
- Mobile primary navigation stays stable and thumb-reachable.
- Board routes hide nonessential chrome while retaining an explicit path back.
- Home prioritizes Continue / Daily / Play before secondary metrics or settings.
- Analysis is one tap from a completed game and one tap from recent games.
- Use safe-area insets for devices with notches/home indicators.
- Support portrait widths from 320px through tablet landscape.

## MP-04 Learning feedback and review
- Track failed puzzle IDs locally, not only aggregate mistake count.
- Add a Review Mistakes queue with deterministic ordering and no duplicate XP farming.
- Show weak themes from actual local attempts when enough evidence exists.
- Preserve explanation/reveal and direct analysis after solving/reviewing.
- Avoid invented Elo, accuracy or AI-generated claims.

## MP-05 Installable/offline mobile delivery
- Add standards-based PWA manifest and install metadata.
- Add versioned service worker caching for the app shell and immutable assets.
- Offline mode must support Home, Academy, Challenges, local Play and locally bundled Stockfish after first successful load.
- Network failures must not corrupt local progress.
- Preserve existing supervised runtime and public-web deployment; zero new application containers.

## MP-06 Mobile interaction quality
- Board must retain maximum practical width and no horizontal overflow at 320/360/390/430/768 widths.
- Mouse and touch drag remain correct; source-piece ghost stays suppressed.
- Primary touch targets are at least 44px.
- Respect reduced-motion and WCAG 2.1 AA.
- Theme customizer must remain usable as a mobile sheet/dialog without covering critical board gestures.

## MP-07 Release gates
- Existing unit/chess fixture suite remains green.
- New deterministic tests cover mistake review, weak-theme summaries and PWA metadata.
- Browser suite covers 320/360/390/430/768 mobile widths, safe area simulation, icon visibility, mobile navigation, install metadata, offline reload, touch drag, themes and accessibility.
- Independent IBM Granite critic reviews the final exact SHA.
- Publish to the existing Chessy public runtime only after exact-SHA CI success.

## MP-08 Scope containment
- CH-012 changes iconography only; it does not redesign information architecture.
- CH-013 changes mobile shell/navigation/home hierarchy only; it does not change learning storage semantics.
- CH-014 changes local learning attempt/review semantics only; it does not introduce remote recommendation systems.
- CH-015 changes installability/offline/safe-area behavior only; it does not add native wrappers, push, telemetry SDKs or store submission assets beyond standards-based web install metadata.
- CH-016 is a release/repair node and cannot add net-new features.
- The phase cannot add a backend, database, authentication provider, remote AI service, analytics vendor or new application container.
