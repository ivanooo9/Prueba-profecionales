#!/bin/sh
set -eu

require_env() {
  var_name="$1"
  eval "var_value=\${$var_name:-}"
  if [ -z "$var_value" ]; then
    echo "[deploy-entrypoint] Missing required env: $var_name" >&2
    exit 1
  fi
}

require_env DATABASE_URL
require_env JWT_SECRET
require_env JWT_REFRESH_SECRET

if [ "$#" -eq 0 ]; then
  set -- node dist/server.js
fi

exec "$@"