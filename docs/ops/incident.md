# Incident response runbook

## Severity levels

- **SEV1**: app is down or data is being lost. Pager-worthy. Drop everything.
- **SEV2**: a feature is broken for most users. Fix within hours.
- **SEV3**: a feature is broken for a few users or a non-critical endpoint
  is slow. Fix in the next sprint.

## First 5 minutes of any incident

1. **Acknowledge**: post in the team chat that you're looking at it, with
   a short description. Stops duplicate work.
2. **Check `/health/ready`**: `curl -i https://qa.aristotest.com/health/ready`
   (or prod URL).
3. **Check PM2**: `ssh <host> 'pm2 status'`. Look for restart loops or
   memory spikes.
4. **Check Cloud Error Reporting**: is there a fresh spike of errors?
5. **Check last deploy**: `ssh <host> 'ls -1t ~/aristotest-backups/ | head -5'`
   — if the latest backup timestamp is minutes old, the incident is
   probably deploy-related. Roll back first, debug second.

## Common incidents

### App returns 503 on `/health/ready`

- `database` probe down → DB is unreachable. Check RDS console, security
  groups, DNS. If the DB was restarted, PM2 will recover on its own once
  the DB is up.
- `minio` probe down → MinIO service is down. Restart it with
  `pm2 restart minio`.
- `redis` probe down → Redis is optional; the app will degrade gracefully.
  This should not cause 503 by itself.

### PM2 restart loop

```bash
ssh <host>
pm2 logs aristotest-backend-prod --lines 200 --err
```

Most common causes:
- Missing required env var → the app throws at startup from `config/environment.ts`.
  Check `.env.production` has all the required keys.
- TypeScript build missing → `dist/server.js` doesn't exist. Re-run the
  deploy or `npm run build` manually.
- Port already in use → something else is listening on 3001. `lsof -i :3001`.

### Cloud Logging spike

- Open Cloud Error Reporting filtered by the last 15 minutes.
- Find the most common error message → it's usually a single bug.
- Check if it's specific to a tenant or affects all. If specific, check
  the tenant's recent activity for trigger.

### Database slow queries

- `pg_stat_activity` shows long-running queries:
  ```sql
  SELECT pid, now() - query_start AS duration, query
  FROM pg_stat_activity
  WHERE state = 'active'
  ORDER BY duration DESC;
  ```
- Kill a runaway query: `SELECT pg_cancel_backend(pid)`.
- If the query is from our app, note the SQL and open an issue to add
  an index or rewrite.

### Socket.io disconnects

- Check if nginx is upgrading `Connection: upgrade` correctly.
- Check `SOCKET_CORS_ORIGIN` matches the frontend origin.
- Multiple PM2 instances without a Redis adapter → sockets from one host
  can't reach clients on another. Fix: run in single-instance mode OR
  configure `@socket.io/redis-adapter`.

## Post-incident

Within 24 hours of any SEV1/SEV2:

1. Write a 1-page postmortem: what happened, impact, root cause, what we
   did to fix, what we'll change to prevent recurrence.
2. Update this runbook with anything new we learned.
3. Open issues for the prevention items.

The postmortem is blameless — the focus is "what in our system allowed
this to happen", not "who made the mistake".
