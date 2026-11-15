#!/bin/sh
set -eu
CURRENT=/srv/chessy/current
TARGET=$(readlink -f "$CURRENT")
case "$TARGET" in
  /srv/chessy/releases/*) ;;
  *) echo "Invalid Chessy release symlink" >&2; exit 2 ;;
esac
[ -f "$TARGET/server.mjs" ] && [ -f "$TARGET/dist/aula/index.html" ] || {
  echo "Chessy release is incomplete" >&2; exit 2;
}
export CHESSY_RELEASE_SHA="${TARGET##*/}"
export CHESSY_DIST="$TARGET/dist"
export CHESSY_DEPLOYMENT_CLASS=public-web
export HOST=127.0.0.1 PORT=14176
exec /usr/bin/node "$TARGET/server.mjs"
