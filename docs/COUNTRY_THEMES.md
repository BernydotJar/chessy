# Chessy Atlas — Country Themes v1

Chessy Atlas revives an original Chessy capability that existed before UI Kit v2: country-themed boards. The historical implementation included Guatemala, Colombia, México, Brasil and USA as board-only presets. Atlas turns that idea into a maintained visual collection that controls both semantic chrome tokens and board colors.

## Information architecture

Themes remain a preference. The primary game navigation therefore does **not** contain a Themes item. Players enter the collection from **Settings → Appearance → Explore collection**, which deep-links to `#/themes`. This gives visual discovery enough room without adding another decision to Home, Play, Training or the mobile primary nav.

## Collections

### Chessy Classics

- Forest Classic
- Ivory Sage
- Tournament Night

### Chessy Atlas

- Guatemala · Jade & Lake
- Colombia · Gold & Caribbean
- Mexico · Agave & Obsidian
- Brazil · Canopy & Sun
- USA · Navy & Clay
- Argentina · Sky & Silver
- Spain · Garnet & Gold
- Chile · Pacific & Copper

Country themes are not literal flag skins. Each palette is derived from landscape/material cues and uses national colors only as restrained signatures. The chess position must remain visually dominant.

## Theme anatomy

Every theme supplies:

- product color scheme (`light` or `dark`);
- background, sidebar, surface, raised surface and border tokens;
- text, muted and subtle text tokens;
- primary accent, secondary gold, focus and danger tokens;
- board light/dark squares;
- board selected/legal/hint states;
- preview colors and a three-color identity signature;
- a local SVG study illustration used by the Home hero;
- offline-safe local assets only.

The runtime theme catalog is the source of truth in `src/design/themes.ts`. UI Kit v2 CSS remains the first-paint fallback; after the app initializes, `ThemeManager` applies the selected catalog tokens as semantic CSS custom properties.

## Persistence and privacy

The selected theme continues to use `chessy-visual-theme-v2`, preserving the existing local preference contract. Theme changes may emit the existing consent-aware `settings_changed` event when Analytics has explicit consent. No new identity, chess-content or telemetry fields are introduced.

## Asset policy

The Atlas illustrations are deliberately small code-native SVG studies. They do not load remote images, fonts, icons, WebGL, Blender output or runtime design SDKs. This keeps PWA offline behavior deterministic and avoids making visual polish dependent on third-party availability.

## Design-tool / MCP boundary

- Cloud Sandbox MCP V2 and the installed Graph Harness are authoritative for implementation and verification.
- Figma is a useful optional collaborative source-of-truth when connected, but not a production runtime dependency.
- Context7 is useful for current library documentation when connected.
- Blender is intentionally out of scope for v1: 3D decoration does not improve board readability enough to justify the runtime/design cost.
- icons0.dev can be evaluated as a future icon-source MCP, but Chessy v1 keeps its coherent local SVG icon system.

## Product rule

**Identity lives at the edges; the position stays in the center.**
