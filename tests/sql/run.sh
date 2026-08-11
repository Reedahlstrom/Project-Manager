#!/usr/bin/env bash
#
# Applies the migrations to a throwaway local Postgres and exercises every RLS
# policy against them. No Docker, no Supabase project, no credentials.
#
# This is the fast check — run it after touching anything in
# supabase/migrations/. It proves the SQL is valid and the policies behave, but
# it runs against a shimmed `auth` schema rather than real Supabase Auth, so it
# is not a substitute for tests/rls.test.ts against the real project.
#
# Requires: brew install postgresql@17
#
# Usage: ./tests/sql/run.sh

set -euo pipefail

PGBIN="${PGBIN:-/opt/homebrew/opt/postgresql@17/bin}"
PORT="${PGPORT:-55432}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PGDATA="${PGDATA:-/tmp/cadence-pgdata}"

if [[ ! -x "$PGBIN/psql" ]]; then
  echo "Postgres not found at $PGBIN. Install it with: brew install postgresql@17" >&2
  exit 1
fi

export PATH="$PGBIN:$PATH"

# Boot a scratch cluster if one isn't already listening.
if ! pg_isready -h 127.0.0.1 -p "$PORT" >/dev/null 2>&1; then
  echo "Starting a throwaway Postgres on :$PORT"
  rm -rf "$PGDATA"
  initdb -D "$PGDATA" -U postgres --auth=trust >/dev/null
  pg_ctl -D "$PGDATA" -o "-p $PORT -h 127.0.0.1" -l "$PGDATA/server.log" start >/dev/null
  sleep 2
fi

PSQL="psql -h 127.0.0.1 -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"

$PSQL -c "drop database if exists cadence_test;" -c "create database cadence_test;" >/dev/null

$PSQL -d cadence_test -f "$ROOT/tests/sql/00-supabase-shim.sql"

for migration in "$ROOT"/supabase/migrations/*.sql; do
  echo "applying $(basename "$migration")"
  $PSQL -d cadence_test -f "$migration"
done

echo
echo "running policy checks"
echo

# Surface only the assertions; psql prefixes every NOTICE with the file path.
if $PSQL -d cadence_test -f "$ROOT/tests/sql/01-rls-checks.sql" 2>&1 | grep -oE "(PASS|FAIL|ERROR):.*"; then
  echo
  echo "All policy checks passed."
else
  echo "Policy checks FAILED." >&2
  exit 1
fi
