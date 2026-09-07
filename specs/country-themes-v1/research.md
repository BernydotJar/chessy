# Chessy Country Themes v1 — Recovery & MCP Audit

## Repository recovery

Historical source at release ancestry `9895043` contains board-only presets named Guatemala, Colombia, México, Brasil and USA. Commit `6145963` (`Apply Chessy UI kit and visual themes`) removed those presets while introducing the current three-theme semantic design system. This program therefore restores a known product idea with a higher-level contract rather than creating an unrelated feature.

## Information architecture decision

Country themes are personalization, not a core chess task. The collection gets its own deep-linkable route for discovery, but the launch point remains Settings > Appearance. It is intentionally absent from the primary sidebar and mobile bottom navigation.

## MCP / design-tool audit

- Cloud Sandbox MCP V2: connected and authoritative for repository inspection, implementation and local verification.
- Graph Engineer / Graph Harness: installed in the workstation and used as the execution/governance graph for this program.
- Figma: present in the plugin directory and offered for connection. It is useful as a future design source-of-truth but is not required to ship this code-native collection.
- Context7: present in the plugin directory but not currently connected. It is useful for fresh library documentation, not required for the current stable theme APIs.
- Pencil: no matching installed design-tool connector was found in the current plugin directory; a similarly named Pencil Spaces integration is unrelated.
- Blender MCP: no matching installed connector was found; 3D is deliberately excluded because it adds runtime/design complexity without improving chess playability.
- icons0.dev MCP: not installed as a current ChatGPT plugin. The service advertises MCP support externally; this implementation does not require a runtime icon dependency because Chessy already has a coherent SVG icon system.
- Canva: available in the current connector set, but production country identities are deliberately code-native for offline/PWA fidelity.

## Design rationale

The premium target is restraint: strong typography, material palettes, clear hierarchy and thematic details at the edges. Flags as dominant backgrounds, saturated gradients, oversized ornamental badges and 3D chess pieces were rejected because they compete with board state and increase the probability of novelty-driven visual noise.
