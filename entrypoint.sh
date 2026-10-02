#!/bin/sh
set -eu

require_env() {
  var_name="$1"
  eval "var_value=\${$var_name:-}"
  if [ -z "$var_value" ]; then
    echo "[entrypoint] Missing required env: $var_name" >&2
    exit 1
  fi
}

require_env DATABASE_URL
require_env JWT_SECRET
require_env JWT_REFRESH_SECRET

_prisma_db_push_norm="$(printf '%s' "${PRISMA_DB_PUSH:-}" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

if [ "$_prisma_db_push_norm" = "true" ]; then
  echo "[entrypoint] PRISMA_DB_PUSH=true; running prisma db push..."
  npx prisma db push --accept-data-loss
elif [ -d "/app/prisma/migrations" ] && find /app/prisma/migrations -mindepth 1 -maxdepth 1 -type d | grep -q .; then
  echo "[entrypoint] Running prisma migrate deploy..."
  if ! npx prisma migrate deploy; then
    echo "[entrypoint] WARNING: prisma migrate deploy failed (e.g., P3005 database schema mismatch). Falling back to automatic prisma db push..."
    npx prisma db push --accept-data-loss
  fi
else
  echo "[entrypoint] No versioned migrations found; skipping Prisma sync. Set PRISMA_DB_PUSH=true to run prisma db push explicitly."
fi

_backfill_professional_slugs_norm="$(printf '%s' "${BACKFILL_PROFESSIONAL_SLUGS:-true}" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

if [ "$_backfill_professional_slugs_norm" != "false" ]; then
  echo "[entrypoint] Running professional slug backfill..."
  npm run backfill:professional-slugs
else
  echo "[entrypoint] BACKFILL_PROFESSIONAL_SLUGS=false; skipping professional slug backfill."
fi

echo "[entrypoint] Seeding official Ecuadorian universities..."
npx tsx prisma/seed-full-universities.ts || echo "[entrypoint] WARNING: University seed skipped or encountered error."

exec "$@"
