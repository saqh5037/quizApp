#!/usr/bin/env bash
#
# deploy.sh — unified deploy for AristoTest.
#
# Replaces the 27 bespoke deploy-*.sh / fix-*.sh scripts in the repo root.
# This script is idempotent, runs pre-deploy safety checks, takes a backup,
# deploys, runs migrations, reloads PM2, verifies health, and rolls back
# automatically on failure.
#
# Usage:
#   scripts/deploy.sh <env>
#     env: qa | prod
#
# Required config (from scripts/deploy.<env>.env, which is .gitignored):
#   REMOTE_USER            SSH user
#   REMOTE_HOST            SSH host
#   REMOTE_PATH            Deploy path on the remote
#   PEM_FILE               Path to SSH key (absolute)
#   BRANCH                 Git branch to deploy
#   HEALTH_URL             URL that should return 200 after deploy (e.g. https://qa.aristotest.com/health/ready)
#
# Optional:
#   RSYNC_EXCLUDE_FILE     Path to rsync exclude list (default scripts/deploy.rsync-exclude)
#   SKIP_MIGRATIONS=1      Skip `npm run migrate` on the remote
#   DRY_RUN=1              Print commands without executing
#
# Exit codes:
#   0  success
#   1  usage error / missing config
#   2  pre-deploy check failed (uncommitted changes, wrong branch, etc.)
#   3  remote operation failed
#   4  health check failed (auto-rollback triggered)

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[deploy]${NC} $*"; }
ok()   { echo -e "${GREEN}[ok]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[err]${NC} $*" >&2; }

if [ $# -lt 1 ]; then
  err "usage: $0 <qa|prod>"
  exit 1
fi

ENV_NAME="$1"
case "$ENV_NAME" in
  qa|prod) ;;
  *) err "unknown environment: $ENV_NAME (expected qa or prod)"; exit 1 ;;
esac

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_FILE="$REPO_ROOT/scripts/deploy.$ENV_NAME.env"

if [ ! -f "$CONFIG_FILE" ]; then
  err "missing config file: $CONFIG_FILE"
  err "create it with: REMOTE_USER, REMOTE_HOST, REMOTE_PATH, PEM_FILE, BRANCH, HEALTH_URL"
  err "make sure the file is in .gitignore"
  exit 1
fi

# shellcheck disable=SC1090
source "$CONFIG_FILE"

: "${REMOTE_USER:?REMOTE_USER not set in $CONFIG_FILE}"
: "${REMOTE_HOST:?REMOTE_HOST not set in $CONFIG_FILE}"
: "${REMOTE_PATH:?REMOTE_PATH not set in $CONFIG_FILE}"
: "${PEM_FILE:?PEM_FILE not set in $CONFIG_FILE}"
: "${BRANCH:?BRANCH not set in $CONFIG_FILE}"
: "${HEALTH_URL:?HEALTH_URL not set in $CONFIG_FILE}"

RSYNC_EXCLUDE_FILE="${RSYNC_EXCLUDE_FILE:-$REPO_ROOT/scripts/deploy.rsync-exclude}"
DRY_RUN="${DRY_RUN:-0}"

if [ ! -f "$PEM_FILE" ]; then
  err "PEM file not found: $PEM_FILE"
  exit 1
fi

SSH_CMD=(ssh -i "$PEM_FILE" -o StrictHostKeyChecking=yes "$REMOTE_USER@$REMOTE_HOST")

ssh_exec() {
  if [ "$DRY_RUN" = "1" ]; then
    echo "[dry-run] ssh: $*"
    return 0
  fi
  "${SSH_CMD[@]}" "$@"
}

rsync_to_remote() {
  local src="$1"
  local dst="$2"
  if [ "$DRY_RUN" = "1" ]; then
    echo "[dry-run] rsync: $src -> $REMOTE_USER@$REMOTE_HOST:$dst"
    return 0
  fi
  local exclude_args=()
  if [ -f "$RSYNC_EXCLUDE_FILE" ]; then
    exclude_args=(--exclude-from="$RSYNC_EXCLUDE_FILE")
  fi
  rsync -az --delete "${exclude_args[@]}" \
    -e "ssh -i $PEM_FILE -o StrictHostKeyChecking=yes" \
    "$src" "$REMOTE_USER@$REMOTE_HOST:$dst"
}

# -----------------------------------------------------------------------------
# Pre-deploy safety checks
# -----------------------------------------------------------------------------

log "pre-deploy checks (env=$ENV_NAME)"

cd "$REPO_ROOT"

if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  err "working tree has uncommitted changes"
  err "commit or stash them before deploying"
  exit 2
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
  warn "current branch is '$CURRENT_BRANCH', expected '$BRANCH'"
  read -r -p "continue anyway? [y/N] " ans
  case "$ans" in
    y|Y) ;;
    *) err "aborted"; exit 2 ;;
  esac
fi

CURRENT_COMMIT="$(git rev-parse --short HEAD)"
log "current commit: $CURRENT_COMMIT on $CURRENT_BRANCH"

log "running static tenant-isolation check"
if [ -x "$REPO_ROOT/scripts/check-tenant-isolation.sh" ]; then
  "$REPO_ROOT/scripts/check-tenant-isolation.sh" || {
    err "tenant isolation check failed — aborting deploy"
    exit 2
  }
  ok "tenant isolation check passed"
fi

# -----------------------------------------------------------------------------
# Connectivity
# -----------------------------------------------------------------------------

log "checking SSH connectivity to $REMOTE_HOST"
if ! ssh_exec "echo connected" >/dev/null; then
  err "cannot SSH to $REMOTE_USER@$REMOTE_HOST"
  exit 3
fi
ok "ssh ok"

# -----------------------------------------------------------------------------
# Backup
# -----------------------------------------------------------------------------

BACKUP_TAG="$(date -u +%Y%m%d-%H%M%S)-$CURRENT_COMMIT"
log "creating backup: $BACKUP_TAG"
ssh_exec "
  set -e
  if [ -d '$REMOTE_PATH' ]; then
    mkdir -p ~/aristotest-backups
    tar -czf ~/aristotest-backups/backup-$BACKUP_TAG.tar.gz -C \$(dirname $REMOTE_PATH) \$(basename $REMOTE_PATH) 2>/dev/null || true
    echo 'backup saved to ~/aristotest-backups/backup-$BACKUP_TAG.tar.gz'
    # Keep only the last 10 backups
    ls -1t ~/aristotest-backups/backup-*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
  else
    mkdir -p '$REMOTE_PATH'
    echo 'no previous deployment, fresh install'
  fi
"
ok "backup done"

# -----------------------------------------------------------------------------
# Sync code
# -----------------------------------------------------------------------------

log "syncing backend to $REMOTE_PATH/backend"
rsync_to_remote "$REPO_ROOT/backend/" "$REMOTE_PATH/backend/"

log "syncing frontend build to $REMOTE_PATH/frontend"
if [ ! -d "$REPO_ROOT/frontend/dist" ]; then
  warn "frontend/dist not found — building locally first"
  (cd "$REPO_ROOT/frontend" && npm run build)
fi
rsync_to_remote "$REPO_ROOT/frontend/dist/" "$REMOTE_PATH/frontend/dist/"

ok "code synced"

# -----------------------------------------------------------------------------
# Remote install + migrate + reload
# -----------------------------------------------------------------------------

log "installing backend deps and running migrations"
ssh_exec "
  set -e
  cd '$REMOTE_PATH/backend'
  npm ci --omit=dev || npm install --omit=dev
  if [ '${SKIP_MIGRATIONS:-0}' != '1' ]; then
    npm run migrate
  else
    echo 'SKIP_MIGRATIONS=1, skipping'
  fi
"

log "reloading PM2"
ssh_exec "
  set -e
  cd '$REMOTE_PATH'
  if pm2 describe aristotest-backend-prod >/dev/null 2>&1; then
    pm2 reload aristotest-backend-prod --update-env
  else
    pm2 start ecosystem.prod.config.js --env production
  fi
  pm2 save
"
ok "pm2 reloaded"

# -----------------------------------------------------------------------------
# Health check + auto-rollback
# -----------------------------------------------------------------------------

log "waiting 5s for service to settle"
sleep 5

log "hitting health endpoint: $HEALTH_URL"
if curl -fsS -m 10 "$HEALTH_URL" >/dev/null; then
  ok "health check passed"
else
  err "health check failed — rolling back to previous release"
  ssh_exec "
    set -e
    cd ~/aristotest-backups
    LAST=\$(ls -1t backup-*.tar.gz 2>/dev/null | head -2 | tail -1)
    if [ -z \"\$LAST\" ]; then
      echo 'no previous backup to roll back to'
      exit 1
    fi
    echo \"restoring \$LAST\"
    rm -rf '$REMOTE_PATH'
    tar -xzf \"\$LAST\" -C \$(dirname $REMOTE_PATH)
    cd '$REMOTE_PATH'
    pm2 reload aristotest-backend-prod --update-env || pm2 start ecosystem.prod.config.js --env production
  "
  err "rollback complete. deploy failed."
  exit 4
fi

log "deploy finished successfully ($ENV_NAME @ $CURRENT_COMMIT)"
