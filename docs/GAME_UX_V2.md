# Chessy Game UX v2

Game UX v2 applies the Laws of UX audit to the playable surface without removing chess capabilities.

## Information architecture

**Play primary region**
1. Board.
2. Opponent summary / Start action.
3. Current game status and core Undo / New Game actions.

**Progressive disclosure**
- Opponent difficulty and color live behind the opponent settings affordance.
- Move history, typed notation + PGN/setup, and coach/glossary are three collapsed tool groups below the primary game region.
- Game-over Analysis remains the primary follow-up action.

**Global Settings**
- Visual theme and advanced board colors.
- Language.
- Sound.
- Legal-move highlights.
- Product Analytics consent and privacy state.

Theme controls are intentionally absent from Home and Play. Sound is no longer modeled as an AI-opponent option.

## UX laws applied

- **Hick:** reduce simultaneous choices in the main game flow and disclose configuration progressively.
- **Fitts:** keep large primary actions near the game state and preserve >=44px interactive targets.
- **Jakob:** use a conventional Settings destination and gear affordance for persistent preferences.
- **Proximity / common region:** group opponent setup, in-game controls, and specialist tools by purpose.
- **Selective attention / flow:** keep the board visually and functionally dominant.
- **Aesthetic-usability:** preserve the visual system while testing task hierarchy, not merely appearance.
