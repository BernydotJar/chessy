# Chessy LCH — macOS native cutover handoff

**Scope:** move only chessy.lch-app.cloud away from Docker, using the existing native cloud-sandbox-mac tunnel and a dedicated launchd-managed Node.js 22+ process. Keep LUMA and all other tunnel ingress rules unchanged. Keep chessy.textilesdemedellin.com as rollback during the initial period.

Prepared and SHA-256 checked by Sandbox V3 on 2026-11-15:

- chessy-aula-release.zip: GitHub Actions-tested, immutable release 7bd43252d21d6a5d728066b890a475ccac254e13, SHA-256 24b1ac4e3b217c74f604d1f14a13b1e8fbfa49a37adfed7e7c96fbd0226abd50.
- private/ (mode 0700): teacher code, admin code, and teacher registry copied from the current Chessy production process (three files, each mode 0600). Never publish, print or commit this directory.
- lch_route.py + test_lch_route.py: scoped and idempotent Cloudflare tunnel ingress changes; four offline tests passed.
- mac_native_release.py: native Mac installer and fail-closed public readiness gates, including rollback of the Cloudflare tunnel config if external health verification fails.
- GO_CHESSY_NATIVE_MAC.sh: host-side entrypoint.

## Mac-only execution

Sandbox V3 can execute Linux container commands and stage files in the Mac-shared handoff, but **cannot execute Terminal commands on macOS**. A local macOS shell action remains necessary for launchd/sudo configuration. On Mac Terminal (not inside Docker):

    bash "$HOME/.cloud-sandbox-mcp-data/shared-auth/deployment/handoff/chessy/lch-native/GO_CHESSY_NATIVE_MAC.sh"

The command uses the Mac-local Caddy origin (http://127.0.0.1:8080 with Host: chessy.textilesdemedellin.com) to check exact release identity and zero active rooms without relying on an unreliable hairpin request to the public Cloudflare hostname. It validates the immutable CI bundle, installs Node content under ~/Library/Application Support/LCH/Chessy/releases, imports the teacher/admin/registry data into ~/Library/Application Support/LCH/Chessy/private, starts only com.lch.chessy.native on localhost:14178, edits only the chessy.lch-app.cloud tunnel ingress rule in /etc/cloudflared/config.yml after a backup, and validates public HTTPS and the exact classroom JS hash. It requires a native macOS Node.js 22+, the existing cloudflared CLI, and operator sudo authorization for host-managed launchd/tunnel files.

Other LCH hostnames remain on their current routes. The script does not stop Docker, remove the previous Chessy origin, create extra Cloudflare DNS, or touch LUMA's application. The shared cloudflared LaunchDaemon is restarted to apply the single Chessy route, which may briefly interrupt other tunnel traffic; the configuration preserves their routes. If public Chessy health or checksum fails, the script restores the previous tunnel config and re-kickstarts the tunnel.

## Operator verification

After the Mac command, verify:

    curl -fsS https://chessy.lch-app.cloud/health
    curl -fsS https://chessy.lch-app.cloud/aula/api/health
    sudo launchctl print system/com.lch.chessy.native

Perform a teacher+learner E2E against the new LCH hostname from an isolated browser/CI runner (not the shared production workstation) before claiming final migration GO. Teacher cookies are origin-scoped; teachers should reauthenticate on chessy.lch-app.cloud using their existing credentials. Cloudflare WSS must work.

To roll back routing if needed, use the exact prior config.yml.pre-chessy-native-timestamp under /etc/cloudflared, after checking that no other ingress changes were made afterward. Validate before restoration and restart only the existing cloudflared LaunchDaemon. The old Chessy public hostname was deliberately left unchanged.
