# Chessy Analytics + Game UX v1 requirements

## Scope
### Settings IA
- Add Settings as a first-class desktop route and top-bar gear affordance.
- Move visual theme, board theme customization, language, sound, and analytics consent into Settings.
- Remove Theme Gallery from Home and Theme Customizer from Play and the top bar.
- Preserve theme/language/sound persistence and all existing functionality.

### Play UX
- Board is the primary content region.
- AI opponent defaults remain Medium + White; primary Start action is visible without exposing all configuration.
- Advanced opponent choices use progressive disclosure or a dialog/sheet.
- Sound is a global setting, not an opponent setting.
- Game status and core actions remain near the board/opponent region.
- Typed notation, PGN/file actions, board setup, legal-move visibility, mentor/glossary/history are secondary and grouped by purpose.
- Game-over analysis remains one primary follow-up action.
- Mobile board-first contract, drag/touch, accessibility, PWA offline, Auth and Progress Sync must not regress.

### Product Analytics
- Introduce a provider-neutral AnalyticsAdapter and Settings consent control.
- Default analytics state is off until the user explicitly enables it.
- If Firebase/GA is unavailable, UX remains functional and shows analytics unavailable without errors.
- Never emit FEN, PGN, move notation, email, display name, free-text input or puzzle answers.
- Track only bounded semantic product events.
- Prepare for native reuse of the same event taxonomy.

## Out of scope
- Session replay, heatmaps, ad attribution, personalized ads, marketing audiences, A/B testing, paid analytics products.
- New backend, new application container, or migration from the existing Cloudflare/Caddy runtime.
- Native Android/iOS packaging in this graph.
