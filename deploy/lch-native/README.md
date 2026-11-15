# Chessy on LCH — independent, Docker-free runtime

Target: https://chessy.lch-app.cloud/ and https://chessy.lch-app.cloud/aula/

**Status: deployment preparation, not a completed migration.** This repository does not change live Cloudflare DNS, Caddy, credentials, or Docker. The old production address remains a fallback until public acceptance.

## Topology

Use the same LCH subdomain and Cloudflare edge pattern as LUMA, with a dedicated persistent backend appropriate for Chessy's WebSockets and teacher state:

    HTTPS / WSS browser
      → Cloudflare DNS → a native Cloudflare Tunnel on independent LCH hosting
      → Caddy on the LCH application host (Host: chessy.lch-app.cloud)
      → 127.0.0.1:14176 → chessy-lch.service (Node.js 22)
      → /srv/chessy/current/server.mjs and dist/
      → /var/lib/chessy/secrets/ (writable teacher registry and credentials)

The LCH runtime MUST be independent of the old Sandbox/Docker origin. Merely pointing a new hostname at that container does not resolve a Docker outage. LUMA itself must remain unchanged. Firebase App Hosting is not a drop-in replacement for the current in-memory WebSocket rooms and atomically updated on-disk teacher registry.

## Preflight, without touching production

1. Select an LCH-managed Linux host with Node.js 22, Python 3, systemd, Caddy and cloudflared. Create a non-login chessy account and /srv/chessy/releases readable by that account. The host must remain available when the old Mac Docker instance is offline.
2. Download the exact GitHub Actions artifact produced by a green Chessy release (name chessy-aula-release-<run-SHA>). This artifact contains dist/ and progress/runtime/aula-server.mjs. Verify the source commit and the two CI jobs, not simply that the ZIP opens.
3. Recover from the existing protected runtime and copy, using authenticated host access, the *original* aula teacher code, separate admin code and teacher-registry.json to /var/lib/chessy/secrets/. All three files must be owned by chessy with mode 0600. Never put their values in GitHub, logs or the public frontend. Do not regenerate codes; that would revoke teacher access.
4. Install run.sh as /usr/local/libexec/chessy-lch-run (0755) and chessy-lch.service as /etc/systemd/system/chessy-lch.service, then use systemctl daemon-reload. The service only restarts Chessy. It has no permission to change LUMA or shared services.
5. Create /etc/chessy/chessy.env (0600, root-owned), containing FILE PATHS only:

    CHESSY_AULA_TEACHER_SECRET_FILE=/var/lib/chessy/secrets/aula-teacher-code
    CHESSY_AULA_ADMIN_SECRET_FILE=/var/lib/chessy/secrets/aula-admin-code
    CHESSY_AULA_TEACHERS_FILE=/var/lib/chessy/secrets/aula-teacher-registry.json

The registry must be readable and writable by the chessy process. Connected rooms cannot be migrated from process memory.

## Stage a verified CI artifact

From a controlled admin shell on the new host:

    export ZIP=/tmp/chessy-aula-approved-ci.zip
    export RELEASE=MERGED_MAIN_40_CHAR_SHA
    export ZIP_SHA=$(sha256sum "$ZIP" | cut -d ' ' -f 1)
    sudo python3 deploy/lch-native/manager.py stage \
      --artifact "$ZIP" --artifact-sha256 "$ZIP_SHA" --release "$RELEASE"

Staging is non-disruptive: it rejects path-traversal ZIP entries, verifies the expected hash, validates Node.js syntax, and writes an immutable release directory. It does not change the running symlink or DNS.

## Activate and validate locally

    sudo python3 deploy/lch-native/manager.py activate --release "$RELEASE"
    systemctl status chessy-lch --no-pager
    python3 deploy/lch-native/manager.py smoke \
      --release "$RELEASE" --origin http://127.0.0.1:14176

Activation holds a lock, requires the original three credential/registry files, and stops if existing active rooms are nonzero or their health is unavailable. Only chessy-lch.service can be restarted. Failed readiness triggers automatic service/symlink rollback. A first installation with no existing symlink does not interrupt sessions on another host.

## Route the dedicated LCH hostname

On the **independent** LCH host, append the provided chessy.caddy site to Caddy, preserving the existing host rules. Validate Caddy before reload. Configure the new native Cloudflare Tunnel ingress for chessy.lch-app.cloud to http://127.0.0.1:80, keeping the original Host header. Set only Chessy's Cloudflare DNS/tunnel hostname. Do not change the LUMA or portfolio entries.

Before changing the public route, check old Chessy's /aula/api/health and confirm 0 active rooms. If old Docker is down, explicitly accept that its in-memory sessions cannot be recovered; do not claim they migrated.

After DNS routing has propagated, validate:

    python3 deploy/lch-native/manager.py smoke \
      --release "$RELEASE" --origin https://chessy.lch-app.cloud

This verifies public /health SHA, /aula/api/health readiness, /aula/ HTML, and the served JavaScript SHA-256 against the staged CI artifact. Then run the existing teacher+learner browser E2E from an isolated CI runner, including WSS, board editor, annotations, invite/teacher roles, phone width and undo/redo. Do NOT launch Chromium on the shared production host.

Keep chessy.textilesdemedellin.com as a temporary fallback. Once the new site has passed E2E, the LCH product catalog can link to the new location.

## Rollback and security

For service-only regression: activate a previously staged SHA, subject to the same room-occupancy gate. For an ingress/DNS regression: restore only chessy.lch-app.cloud to the prior target. Preserve original secret and registry backups without exposing them.

A production GO needs the dedicated independent host, both app and classroom endpoints, WSS functionality, valid teacher credentials, zero active rooms at cutover, correct release SHA, passing CI, and a tested rollback.

Do not enable minors, billed Firebase/LiveKit features, or production room recording as a side effect of this migration. Because the Sandbox V3/V2 connection was unavailable during preparation, this change is NOT evidence of successful deployment or DNS cutover.
