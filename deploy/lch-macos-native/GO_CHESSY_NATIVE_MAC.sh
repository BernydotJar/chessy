#!/usr/bin/env bash
# Run exactly once from the Mac Terminal, not from a Docker container.
# Chessy-only host migration; never edits LUMA, Caddy or unrelated DNS.
set -Eeuo pipefail
umask 077
SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "ERROR: Run on macOS Terminal, not inside Cloud Sandbox Linux." >&2
  exit 2
fi
echo "[chessy-native] validating CI artifact, classroom codes and teacher registry"
PYTHONDONTWRITEBYTECODE=1 /usr/bin/python3 "$SELF/mac_native_release.py" --dry-run
echo "[chessy-native] installing dedicated launchd service and Chessy-only cloudflared route"
PYTHONDONTWRITEBYTECODE=1 /usr/bin/python3 "$SELF/mac_native_release.py" --go
echo "[chessy-native] public check"
curl --fail --silent --show-error --max-time 10 https://chessy.lch-app.cloud/health
echo
curl --fail --silent --show-error --max-time 10 https://chessy.lch-app.cloud/aula/api/health
echo
echo "[chessy-native] COMPLETE: Chessy's LCH hostname now bypasses Docker."
