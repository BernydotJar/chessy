# Chessy Mobile Product v1 - Competitive research

Date: 2026-09-06
Baseline release: `6145963d1bb819cb53ffd29208c31beb0078e57c`

## Objective

Improve Chessy after UI Kit v2 without reopening the closed release. The target is a cleaner mobile product, stronger chess-native iconography, better training loops, and installable/offline-capable delivery.

## Competitive synthesis

### Chess.com
Strengths:
- Broad product surface: play, puzzles, lessons, review, bots, social and stats.
- Mobile bottom navigation has historically kept popular actions close.
- Lessons can be consumed as a guided path or library.
- Puzzle settings support theme/rating targeting.

Observed pain points:
- Recent user feedback reports home clutter, moving controls, harder-to-find basic actions, and analysis/navigation regressions after UI updates.
- Feature/upsell density can compete with the primary chess task.

Implication for Chessy:
- Keep Play, Challenges and Academy one tap away.
- Do not let recommendations or monetization reorder core controls.
- Keep post-game Analysis visible and deterministic.

Sources:
- https://www.chess.com/news/view/chesscom-v4-ios-android
- https://support.chess.com/en/articles/8609703-how-do-lessons-work-on-chess-com
- https://support.chess.com/en/articles/8608686-how-do-puzzles-work-on-chess-com
- https://www.chess.com/forum/view/site-feedback/terrible-mobile-u-i-after-update

### Lichess
Strengths:
- Minimal, fast, board-first product philosophy.
- Strong mobile parity: play, puzzles, analysis, friends, broadcasts and customization.
- 2026 mobile work emphasizes faster game screens, discoverable analysis tabs, offline practice, PGN sharing and move-on-release settings.

Implication for Chessy:
- Treat board interaction latency and usable board area as release gates.
- Provide a distraction-free mobile focus mode.
- Preserve theme/board customization without making settings noisy.
- Make local/offline training a first-class advantage.

Sources:
- https://lichess.org/app
- https://lichess.org/page/changelog
- https://lichess.org/features

### ChessTempo
Strengths:
- Deep training: previous mistakes, tactical motifs, custom sets, spaced repetition, opening/endgame training and post-game analysis.
- Serious learners can target weaknesses instead of consuming a generic feed.

Pain point / opportunity:
- Advanced configuration can feel technical and some mobile workflows still depend on web-created sets.

Implication for Chessy:
- Add a zero-configuration Review Mistakes queue.
- Surface weak motifs automatically from local history.
- Keep advanced controls optional.

Sources:
- https://chesstempo.com/mobile
- https://mobileapp.chesstempo.com/manual/en/manual.html

### Chessable
Strengths:
- Strong concept around structured courses and spaced repetition.

Observed pain points:
- Recent community feedback reports mobile/iPad lag and awkward review/navigation flows.
- Users value exact-line review but dislike losing chapter context or requiring repeated navigation.

Implication for Chessy:
- "Continue" must preserve context.
- Review should advance predictably inside the selected learning context.
- Never make the user reconstruct where they were.

### Duolingo Chess
Strengths:
- Habit loop, approachable onboarding, short daily sessions.

Observed pain points:
- Community reviews criticize weak explanations, repetitive puzzles, uneven difficulty and game review that does not teach enough chess reasoning.

Implication for Chessy:
- Use streak/XP as secondary feedback only.
- Every training mode should explain the chess idea and support review/analysis.
- Adapt difficulty from demonstrated performance instead of a rigid path.

## Chessy product thesis

Chessy should combine:
- Lichess-level directness and board focus,
- ChessTempo-style weakness targeting,
- Chessable-style continuity,
- the approachable habit loop of Duolingo,
- while avoiding Chess.com's current density/upsell clutter and Duolingo's shallow explanation problem.

The differentiator is **calm, local-first chess improvement**: play, understand, review the mistake, and continue learning with minimal navigation.
