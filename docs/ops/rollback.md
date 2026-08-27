# Rollback runbook

## When to roll back

- `/health/ready` is down after a deploy and you can't fix it within 5 minutes.
- Users are reporting data loss or permission errors.
- You see a stack trace in Cloud Logging you don't recognize.
- A migration misbehaved and the app won't start.

## Automated rollback

`scripts/deploy.sh` auto-rolls back if the post-deploy health check fails.
In that case you don't need to do anything — the script already restored
the previous backup before exiting with code 4.

Confirm with:

```bash
./scripts/rollback.sh qa          # pick a backup from the list
```

And hit `/health/ready` to verify it's green.

## Manual rollback

```bash
./scripts/rollback.sh qa <backup-tag>
```

Where `<backup-tag>` is `20260410-153000-abc1234` style. If you omit it,
the script lists the latest 20 backups from `~/aristotest-backups/` on the
remote and prompts you.

The script:
1. Snapshots the current state first (saved as `pre-rollback-<timestamp>`).
2. Wipes `$REMOTE_PATH`.
3. Restores the chosen backup.
4. PM2 reload.
5. Health check.

## Database rollback

**Schema changes are not automatically reverted.** If a bad migration is the
problem, you need to:

1. Roll back the code with the script above.
2. Identify the offending migration in `backend/migrations/`.
3. Write a down migration (or manual SQL) to revert the schema.
4. Apply it via `npm run migrate:undo` or psql.
5. Verify with a smoke test.

If the migration corrupted data (dropped a column, truncated a table),
restore from the nightly RDS snapshot (see `docs/ops/restore.md`).

## Emergency escalation

If both rollback attempts fail and `/health/ready` is still 503:

1. SSH to the host.
2. `pm2 logs aristotest-backend-prod --lines 200` — grab the error.
3. `pm2 stop aristotest-backend-prod` — accept downtime.
4. Check disk space: `df -h`.
5. Check the database is up: `pg_isready -h $DB_HOST`.
6. Check MinIO: `curl http://localhost:9000/minio/health/live`.
7. Restart PM2: `pm2 restart all`.
8. If still broken, restore the most recent known-good backup:
   ```bash
   ssh <host> 'ls -1t ~/aristotest-backups/backup-*.tar.gz | head -5'
   ./scripts/rollback.sh prod <tag>
   ```
