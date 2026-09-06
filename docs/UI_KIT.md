# Chessy UI Kit v2

This is the implementation contract for Chessy's product interface. It is not a screenshot spec: the source of truth is the code under `src/design/` plus the semantic tokens in `src/styles/design-system.css`.

## Product principles

1. **Board first.** During play, training and review, the chess position owns the visual hierarchy.
2. **Quiet chrome.** Navigation is legible but does not compete with the board or learning task.
3. **One accent at a time.** The active theme supplies the main action/focus color. Warm gold is reserved for achievements, streak moments and meaningful reward.
4. **Direct learning.** Challenges, Academy, Progress, Analysis and Review are reachable without hidden multi-step navigation.
5. **Local-first personalization.** Visual theme is stored on-device and requires no account.
6. **No decorative metrics.** XP, streak and solved counts are tied to real stored learning events.
7. **No arbitrary UI color.** Purple/blue/green utility accents are not used for product meaning; semantic tokens are used instead.

## Foundations

### Typography

- UI and body: `Inter`, then native system sans fallbacks.
- Display: same family with tighter tracking and 600-ish weight; no decorative display font in transactional UI.
- Recommended scale: 10/12 captions, 13/14 controls, 15/16 body, 20/24 section titles, 32-60 display depending on viewport.
- Line length: reading content targets roughly 65-75 characters.

### Spacing

Base rhythm: 4px with primary layout steps at 8, 12, 16, 24, 32, 44/48 and 64px. Components should prefer those steps rather than one-off values.

### Radius

- Small/control: 8-9px
- Card/panel: 12-14px
- Large/modal: 18-20px
- Pills are used only for compact tags/status, not as the default button shape.

### Elevation

Borders communicate most hierarchy. Shadows are intentionally rare and are reserved for floating surfaces such as the theme dialog, mobile nav and selected hero content.

## Semantic color tokens

Defined per theme in `src/styles/design-system.css`:

- `--bg`
- `--sidebar`
- `--surface`
- `--surface-2`
- `--raised`
- `--line`, `--line-strong`
- `--text`, `--muted`, `--subtle`
- `--accent`, `--accent-strong`, `--accent-soft`, `--accent-ink`
- `--gold`, `--gold-soft`
- `--focus`, `--danger`
- board interaction tokens: `--board-selected`, `--board-legal`, `--board-hint`

## Visual themes

Implementation: `src/design/themes.ts` + `ThemeManager.tsx`.

### Forest Classic (`forest`)
Default. Deep forest chrome, sage accent, ivory/green board. Intended for long learning sessions and brand recognition.

### Ivory Sage (`ivory`)
Light, warm neutral chrome with subdued sage. Intended for daylight/reading-heavy sessions.

### Tournament Night (`night`)
Dark navy chrome with cool blue accent and tournament-like board palette. Intended for low-light sessions.

A theme changes both application tokens and the board palette. Selection persists under `chessy-visual-theme-v2`.

## Icon system

Implementation: `src/design/icons.tsx`.

- 24x24 coordinate system
- 1.7px rounded stroke
- outline default state
- optional filled state for selected navigation
- all functional icons inherit `currentColor`; they are never exported as raster images
- primary branded concepts: Home, Play, Challenges, Academy, Progress, Library, Games, Analysis, Review, Theme, Settings, Language, Profile, Streak, XP, Achievement, Hint, Share, Save, Import, Export, Sound, Engine, Timer
- utility icons from Lucide remain acceptable for low-brand actions such as Undo, Back/Forward, Lock and Filter.

## Components

### Buttons
- `.btn.primary`: one dominant action per local task.
- `.btn.secondary`: normal alternative action.
- `.btn.quiet`: low-emphasis utility action.
- destructive actions use `.danger-action`; do not use arbitrary red Tailwind color classes.

### Panels
- `.panel`: default grouped surface.
- Nested panels should be avoided unless they represent a real task boundary.
- Hover should primarily change border/surface, not move cards vertically.

### Theme selector
- `ThemeCustomizer`: global entry point from the top bar and optional Play settings entry.
- `ThemeGallery`: visible theme previews with `aria-pressed` selection state.
- Advanced board colors remain available without becoming the primary choice.

### Navigation
- Desktop: persistent sidebar with Chessy icons and minimal active state.
- Mobile: five-item bottom navigation for Home, Play, Challenges, Academy and Progress.
- Lower-frequency tools remain in the mobile drawer.

### Chessboard
- Theme palette comes from the global game store.
- Selected, legal and hint states use semantic board tokens.
- Drag source disappears during drag; floating piece remains centered under pointer/touch interaction.

## Asset policy

Decorative vector studies live in `public/art/`. Functional UI icons remain SVG components so they are accessible, theme-aware and crisp at all display densities. Generated or illustrative imagery may be used for editorial/background moments but must never contain functional labels or replace semantic UI controls.

## Accessibility contract

- WCAG 2.1 AA automated scan on all product routes.
- Minimum 44px touch targets on principal mobile controls.
- Visible focus state through `--focus`.
- `prefers-reduced-motion` disables nonessential movement.
- Theme choice has explicit labels and `aria-pressed` state.
- Mobile sidebar uses `inert` while closed.
- Board pieces retain accessible text labels.

## Adding a component

1. Use semantic tokens, not a raw color, unless the color is content (for example a book cover or chess piece).
2. Reuse the spacing/radius rules above.
3. Use `ChessyIcon` for a branded/product concept.
4. Verify the component in all three visual themes and at 390, 768 and desktop widths.
5. Add an automated browser assertion for any stateful interaction.
