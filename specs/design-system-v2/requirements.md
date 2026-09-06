# Chessy Design System v2 - Requirements

## Scope

Ship an implementation-ready UI Kit and apply it across the existing Chessy product without regressing chess correctness, accessibility, local-first storage or deployment architecture.

## DS-01 Tokens and foundations
- Centralize semantic UI tokens for background, surface, raised surface, border, text, muted text, accent, warm achievement accent, focus, radius, spacing and shadows.
- Provide three coherent visual themes: Forest Classic, Ivory Sage, Tournament Night.
- Persist selected visual theme locally and apply it before/at application boot with no account requirement.

## DS-02 Icon system
- Add a Chessy SVG icon component using a consistent 24x24 grid, rounded 1.7px strokes and optional filled active state.
- Cover core navigation and learning actions: home, play, challenges, academy, progress, library, games, analysis, review, theme, settings, language, profile, streak, XP, achievement, hint, share, import/export, save, engine, timer.
- Replace core sidebar/mobile navigation and home statistics with Chessy icons.

## DS-03 Themes
- Theme selection must change both application chrome and chessboard palette.
- Expose theme selection from the global top bar and the play settings surface.
- Preserve advanced custom board colors.
- Provide visible theme previews and accessible selected state.

## DS-04 Navigation and home
- Retain desktop sidebar but reduce decorative noise and improve active-state hierarchy.
- Add mobile bottom navigation for Home, Play, Challenges, Academy and Progress.
- Recompose Home to read as a product workspace rather than a marketing landing page: daily task, next lesson, practice action and progress should dominate.
- Avoid unrelated accent colors; achievements may use the warm semantic token.

## DS-05 Components and layouts
- Standardize primary/secondary/quiet buttons, chips, segmented controls, icon tiles, stat items, panels, form fields and dialogs through shared CSS contracts.
- Reduce unnecessary card borders and hover translation.
- Maintain responsive behavior at 390, 768, 1000, 1440 and wide desktop widths.

## DS-06 Accessibility and interaction
- Preserve keyboard navigation, focus-visible treatment, reduced-motion behavior, WCAG 2.1 AA automated scans and no horizontal overflow.
- Theme controls have labels, selected state and at least 44px touch targets.
- Existing drag/touch chess interactions remain intact.

## DS-07 Verification/release
- Existing unit and chess-fixture suites remain green.
- Browser suite covers theme persistence, mobile bottom nav, all routes, drag mouse/touch, language persistence and accessibility.
- Independent IBM Granite critic reviews the final diff/verification evidence for visual-system consistency, regression risk and maintainability.
- Publish through existing supervised runtime, Caddy and Cloudflare path; zero new application containers.
