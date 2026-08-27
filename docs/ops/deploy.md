# Deploy runbook

## What the unified script does

`scripts/deploy.sh <env>` replaces the 27 bespoke `deploy-*.sh` / `fix-*.sh`
scripts that used to live in the repo root. Those old scripts are kept in the
repo for reference but should NOT be used for new deploys — they each hardcode
secrets, target different directories, and don't roll back on failure.

The unified script does, in order:
1. Pre-deploy safety checks: clean working tree, expected branch, tenant
   isolation static check.
2. SSH connectivity check.
3. Backup of the current remote deployment to `~/aristotest-backups/backup-<tag>.tar.gz`
   (last 10 backups retained).
4. Rsync of `backend/` and `frontend/dist/` to the remote.
5. Remote `npm ci --omit=dev` and `npm run migrate`.
6. PM2 `reload` (zero-downtime when possible).
7. Health check against `/health/ready`.
8. **Automatic rollback** if the health check fails.

## First-time setup

Per environment (`qa`, `prod`), create an env config file:

```
scripts/deploy.qa.env
scripts/deploy.prod.env
```

Both files are in `.gitignore` — they MUST NOT be committed.

Template:

```bash
REMOTE_USER=dynamtek
REMOTE_HOST=ec2-52-55-189-120.compute-1.amazonaws.com
REMOTE_PATH=/home/dynamtek/aristoTEST
PEM_FILE=/Users/samuelquiroz/Desktop/certificados/labsisapp.pem
BRANCH=main
HEALTH_URL=https://qa.aristotest.com/health/ready
```

## Normal deploy

```bash
# from repo root, on the branch you want to deploy
git status                           # must be clean
./scripts/deploy.sh qa               # or prod
```

The script will:
- Refuse to deploy if the working tree is dirty.
- Warn (not abort) if you're on a different branch than the config says.
- Build the frontend locally if `frontend/dist` is missing.
- Print each step with clear log prefixes.

## Dry run

```bash
DRY_RUN=1 ./scripts/deploy.sh qa
```

Prints all SSH / rsync commands without executing them.

## Skip migrations

```bash
SKIP_MIGRATIONS=1 ./scripts/deploy.sh prod
```

Use this only when you're certain the migration step would be a no-op
(e.g. a frontend-only change).

## When the deploy fails

The script automatically rolls back if:
- The health check at `HEALTH_URL` doesn't return 200 within 10 seconds.

If the deploy script itself dies mid-way (network drop, SSH timeout), run
the manual rollback:

```bash
./scripts/rollback.sh qa
```

It will list the available backups on the remote and ask you which one to
restore.

## Post-deploy verification checklist

After the script reports success:

- [ ] `curl -fsS <HEALTH_URL>` returns 200.
- [ ] `ssh <host> 'pm2 status'` shows `aristotest-backend-prod` online with
      no recent restarts.
- [ ] Open the app in a browser and log in.
- [ ] Create a test quiz (validates writes + tenant isolation).
- [ ] Check `ssh <host> 'pm2 logs --lines 50'` for fresh errors.

## Legacy scripts

The old `deploy-qa*.sh`, `deploy-option*.sh`, `fix-*.sh`, `emergency-*.sh`,
`recovery-*.sh` scripts in the repo root are **deprecated**. They should
be moved to `scripts/legacy/` and eventually deleted. Reasons not to use
them:

- Hardcoded DB passwords in the file (e.g. `deploy-qa.sh:32`).
- No rollback strategy.
- Duplicated logic with subtle differences between them.
- Each one targets a slightly different remote layout.

If you need a feature from one of them that the unified script lacks, open
an issue to add the feature to `scripts/deploy.sh` instead of reviving the
legacy script.
