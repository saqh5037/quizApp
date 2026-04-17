#!/usr/bin/env bash
#
# check-tenant-isolation.sh
#
# Static check: fail if any raw-SQL query in backend/src touches a tenant-scoped
# table without also referencing tenant_id. Intentionally conservative — flags
# suspects for human review rather than trying to parse SQL.
#
# Run locally: ./scripts/check-tenant-isolation.sh
# Runs in CI via .github/workflows/ci.yml

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ROOT_DIR/backend/src"

if [ ! -d "$SRC_DIR" ]; then
  echo "error: backend/src not found at $SRC_DIR" >&2
  exit 2
fi

# Tables that MUST be filtered by tenant_id when accessed via raw SQL
TENANT_TABLES=(
  "quizzes"
  "videos"
  "manuals"
  "classrooms"
  "training_programs"
  "quiz_sessions"
)

STATUS=0

for table in "${TENANT_TABLES[@]}"; do
  # Find files that reference the table in a FROM/JOIN/UPDATE/INSERT/DELETE
  files=$(grep -rIl -E "(FROM|JOIN|UPDATE|INTO|DELETE FROM)\s+$table(\s|\$|\;)" "$SRC_DIR" 2>/dev/null || true)
  for f in $files; do
    # Skip legitimate places (migrations, seeds, models, tests, sql files, scripts)
    case "$f" in
      *"/migrations/"*|*"/seeders/"*|*"/models/"*|*"/tests/"*|*"/scripts/"*|*.sql)
        continue
        ;;
    esac
    # If the file mentions the table but never mentions tenant_id, flag it
    if ! grep -q "tenant_id" "$f"; then
      echo "tenant-leak-candidate: $f touches '$table' with no tenant_id filter"
      STATUS=1
    fi
  done
done

if [ "$STATUS" -ne 0 ]; then
  echo ""
  echo "One or more raw SQL sites touch a tenant-scoped table without a tenant_id filter."
  echo "Either add 'AND tenant_id = :tenantId' to the query or, if the call is genuinely"
  echo "cross-tenant (super_admin only), add a comment explaining the exemption and"
  echo "include the literal string 'tenant_id' somewhere nearby so this check passes."
  exit 1
fi

echo "tenant isolation check: OK"
