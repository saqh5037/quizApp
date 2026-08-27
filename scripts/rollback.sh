#!/usr/bin/env bash
#
# rollback.sh — manual rollback to a specific backup.
#
# Usage:
#   scripts/rollback.sh <env> [backup-tag]
#
#   env:          qa | prod (reads scripts/deploy.<env>.env for SSH config)
#   backup-tag:   optional backup to restore (e.g. 20260410-153000-abc1234).
#                 If omitted, lists available backups and prompts.
#
# Backups live in ~/aristotest-backups/ on the remote host, created by
# scripts/deploy.sh before each deploy.

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${BLUE}[rollback]${NC} $*"; }
ok()   { echo -e "${GREEN}[ok]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[err]${NC} $*" >&2; }

if [ $# -lt 1 ]; then
  err "usage: $0 <qa|prod> [backup-tag]"
  exit 1
fi

ENV_NAME="$1"
BACKUP_TAG="${2:-}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="$REPO_ROOT/scripts/deploy.$ENV_NAME.env"

if [ ! -f "$CONFIG_FILE" ]; then
  err "missing config file: $CONFIG_FILE"
  exit 1
fi

# shellcheck disable=SC1090
source "$CONFIG_FILE"

: "${REMOTE_USER:?REMOTE_USER not set}"
: "${REMOTE_HOST:?REMOTE_HOST not set}"
: "${REMOTE_PATH:?REMOTE_PATH not set}"
: "${PEM_FILE:?PEM_FILE not set}"
: "${HEALTH_URL:?HEALTH_URL not set}"

SSH_CMD=(ssh -i "$PEM_FILE" "$REMOTE_USER@$REMOTE_HOST")

ssh_exec() { "${SSH_CMD[@]}" "$@"; }

if [ -z "$BACKUP_TAG" ]; then
  log "available backups on $REMOTE_HOST:"
  ssh_exec "ls -1t ~/aristotest-backups/backup-*.tar.gz 2>/dev/null | head -20 | sed 's|.*backup-||; s|\.tar\.gz||'"
  echo ""
  read -r -p "backup tag to restore (leave empty to abort): " BACKUP_TAG
  if [ -z "$BACKUP_TAG" ]; then
    err "aborted"
    exit 1
  fi
fi

BACKUP_FILE="~/aristotest-backups/backup-$BACKUP_TAG.tar.gz"

log "verifying backup exists: $BACKUP_FILE"
if ! ssh_exec "test -f $BACKUP_FILE"; then
  err "backup not found on remote: $BACKUP_FILE"
  exit 1
fi

warn "about to restore $BACKUP_TAG over $REMOTE_PATH"
read -r -p "continue? [y/N] " ans
case "$ans" in
  y|Y) ;;
  *) err "aborted"; exit 1 ;;
esac

log "snapshotting current state before rollback"
CURRENT_TAG="pre-rollback-$(date -u +%Y%m%d-%H%M%S)"
ssh_exec "
  set -e
  if [ -d '$REMOTE_PATH' ]; then
    tar -czf ~/aristotest-backups/backup-$CURRENT_TAG.tar.gz -C \$(dirname $REMOTE_PATH) \$(basename $REMOTE_PATH)
    echo 'current state saved as $CURRENT_TAG'
  fi
"

log "restoring $BACKUP_TAG"
ssh_exec "
  set -e
  rm -rf '$REMOTE_PATH'
  tar -xzf $BACKUP_FILE -C \$(dirname $REMOTE_PATH)
  cd '$REMOTE_PATH'
  if pm2 describe aristotest-backend-prod >/dev/null 2>&1; then
    pm2 reload aristotest-backend-prod --update-env
  else
    pm2 start ecosystem.prod.config.js --env production
  fi
  pm2 save
"

log "waiting 5s for service to settle"
sleep 5

log "health check: $HEALTH_URL"
if curl -fsS -m 10 "$HEALTH_URL" >/dev/null; then
  ok "rollback successful"
else
  err "health check still failing after rollback — escalate manually"
  exit 1
fi
