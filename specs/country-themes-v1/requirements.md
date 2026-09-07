# Chessy Country Themes v1 — Product & Design Contract

Baseline release: `5801622c49924c3e6deeb21b160263bd6bd8c16f`.

## Recovered initiative

Chessy previously shipped country board presets for Guatemala, Colombia, México, Brasil and USA. They were removed when UI Kit v2 centralized the product into the `forest`, `ivory` and `night` visual themes. Country Themes v1 restores the idea as a first-class visual collection rather than restoring the old board-only color presets.

## Product behavior

1. Keep `forest`, `ivory` and `night` as the Chessy Classics collection.
2. Add a Country Collection with Guatemala, Colombia, México, Brasil, USA, Argentina, España and Chile.
3. Add a dedicated hash route `#/themes` for discovering and applying themes.
4. Do not add Themes to the primary sidebar or mobile primary nav. The route is launched from Settings > Appearance so the game loop stays board-first.
5. Settings must show the current theme plus a clear `Explore collection` action, not the full gallery.
6. Selecting a country theme applies both product chrome and chess-board palette immediately and persists in the existing local theme preference.
7. Existing custom board-color controls remain available as an advanced override from Settings.
8. Theme changes may use the existing consent-aware `settings_changed` analytics event only; no new analytics surface or identity data is introduced.

## Visual contract

- Country identity is expressed through material, landscape and restrained national color cues, not full-screen flags or novelty skins.
- Board legibility takes precedence over decoration. Light/dark square separation, selected/legal/hint states and piece silhouettes must remain clear.
- Chrome uses the same semantic tokens already established by UI Kit v2.
- No 3D runtime, WebGL dependency, heavy image library, remote font dependency or remote icon dependency.
- Country cards use code-native CSS/SVG motifs so the collection works offline and inside the existing PWA cache boundary.
- Motion is subtle and entirely disabled under `prefers-reduced-motion`.
- All interactive targets remain at least 44px and all new route content must pass WCAG 2.1 AA automated checks.

## Country art direction

- Guatemala — **Jade & Lago**: volcanic lake blue, jade green, warm limestone.
- Colombia — **Oro & Caribe**: deep Caribbean navy, burnished gold, parchment.
- México — **Agave & Obsidiana**: agave green, obsidian, warm mineral cream.
- Brasil — **Canopia & Sol**: rainforest green, sun-gold, river blue accent.
- USA — **Navy & Clay**: tournament navy, warm clay red, paper white.
- Argentina — **Celeste & Plata**: celeste, silver-mist, ink blue.
- España — **Granate & Oro**: restrained garnet, old gold, stone cream.
- Chile — **Pacífico & Cobre**: Pacific blue, copper, high-altitude snow.

## Acceptance criteria

- `#/themes` deep-link loads directly and is localizable in ES/EN/PT.
- Eight country themes plus three Chessy Classics render and can be selected by keyboard, mouse and touch.
- Theme choice survives reload and navigation into Play and Challenges.
- Country theme changes the chrome semantic tokens and board colors; no hardcoded Forest-only chrome remains on the primary route shell.
- Settings contains a current-theme summary and collection CTA; Play/Home do not expose theme selection.
- No horizontal overflow at 320/390/760/1024/1440 widths.
- Existing drag/click play, touch drag, Stockfish, PWA offline, Auth, Cloud Progress and Analytics privacy contracts remain green.
- Final exact SHA passes independent critic, PR CI, main CI, exact-SHA public acceptance and Graph release gate.
