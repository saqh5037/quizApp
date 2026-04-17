#!/usr/bin/env bash
#
# backup-to-gcs.sh — weekly offsite DB backup for AristoTest.
#
# Runs a pg_dump of the target environment's database, gzips it, and uploads
# to a Google Cloud Storage bucket. Designed to run from cron on the app host
# (or from any machine with gcloud / gsutil auth).
#
# Usage (cron):
#   0 2 * * 0 /home/dynamtek/aristoTEST/scripts/backup-to-gcs.sh prod
#
# Required env vars (either exported in the crontab or sourced from a file):
#   DB_HOST, DB_PORT, DB_NAME, DB_USER, PGPASSWORD
#   GCS_BUCKET                  (e.g. gs://aristotest-backups)
#   BACKUP_RETENTION_DAYS       (default 35)
#
# The script also prunes local /tmp/backups older than 2 days.
#
# Exit codes:
#   0  backup uploaded
#   1  config error
#   2  pg_dump failed
#   3  upload failed

set -euo pipefail

ENV_NAME="${1:-prod}"

: "${DB_HOST:?DB_HOST not set}"
: "${DB_PORT:=5432}"
: "${DB_NAME:?DB_NAME not set}"
: "${DB_USER:?DB_USER not set}"
: "${PGPASSWORD:?PGPASSWORD not set}"
: "${GCS_BUCKET:?GCS_BUCKET not set (e.g. gs://aristotest-backups)}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-35}"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOCAL_DIR="/tmp/aristotest-backups"
LOCAL_FILE="$LOCAL_DIR/aristotest-$ENV_NAME-$TIMESTAMP.sql.gz"
mkdir -p "$LOCAL_DIR"

echo "[backup] dumping $DB_NAME from $DB_HOST"
if ! pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-privileges --format=plain \
  | gzip -9 > "$LOCAL_FILE"; then
  echo "[backup] pg_dump failed" >&2
  rm -f "$LOCAL_FILE"
  exit 2
fi

SIZE=$(du -h "$LOCAL_FILE" | cut -f1)
echo "[backup] dump ok: $LOCAL_FILE ($SIZE)"

REMOTE_PATH="$GCS_BUCKET/$ENV_NAME/$(date -u +%Y)/$(date -u +%m)/$(basename "$LOCAL_FILE")"
echo "[backup] uploading to $REMOTE_PATH"
if ! gsutil -q cp "$LOCAL_FILE" "$REMOTE_PATH"; then
  echo "[backup] gsutil upload failed" >&2
  exit 3
fi

echo "[backup] upload ok"

# Prune local temp files older than 2 days
find "$LOCAL_DIR" -name 'aristotest-*.sql.gz' -mtime +2 -delete

# Prune remote files older than retention window
echo "[backup] pruning backups older than ${BACKUP_RETENTION_DAYS} days"
CUTOFF=$(date -u -d "$BACKUP_RETENTION_DAYS days ago" +%Y%m%d 2>/dev/null || date -u -v-${BACKUP_RETENTION_DAYS}d +%Y%m%d)
gsutil ls "$GCS_BUCKET/$ENV_NAME/**/*.sql.gz" 2>/dev/null \
  | while read -r obj; do
      fname=$(basename "$obj")
      # filename format: aristotest-<env>-YYYYMMDDTHHMMSSZ.sql.gz
      ts=$(echo "$fname" | grep -oE '[0-9]{8}' | head -1)
      if [ -n "$ts" ] && [ "$ts" -lt "$CUTOFF" ]; then
        echo "[backup] pruning $obj"
        gsutil -q rm "$obj" || true
      fi
    done

echo "[backup] done"
