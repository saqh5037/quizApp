# Secrets rotation runbook

## What secrets exist

| Secret | Where it lives | Rotation cadence |
|---|---|---|
| `JWT_SECRET` | server env (QA + prod) | every 90 days or on suspicion of leak |
| `JWT_REFRESH_SECRET` | server env | every 90 days |
| `SESSION_SECRET` | server env | every 90 days |
| `DB_PASSWORD` | server env + RDS console | every 180 days |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | server env + MinIO console | every 180 days |
| `GEMINI_API_KEY` | server env + Google AI Studio | on leak |
| `OPENAI_API_KEY` | server env + OpenAI console | on leak |
| `CLAUDE_API_KEY` | server env + Anthropic console | on leak |
| SSH PEM file (`labsisapp.pem`) | local dev machine | on team changes |

## Generate a new secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use one fresh 32-byte hex string per secret. Never reuse.

## JWT / SESSION secret rotation

Rotating `JWT_SECRET` invalidates every active token — users will get a 401
on their next request and have to log in again. Plan the rotation for a
low-traffic window and announce it if this is a paying customer.

1. Generate two new secrets (JWT + refresh).
2. SSH to the server, update `.env.production`:
   ```bash
   ssh <host>
   cd /home/dynamtek/aristoTEST/backend
   nano .env.production   # update JWT_SECRET, JWT_REFRESH_SECRET
   ```
3. `pm2 reload aristotest-backend-prod --update-env`.
4. Verify `/health/ready` is still 200.
5. Log yourself out and back in to confirm the new tokens work.

## DB password rotation

1. In RDS console, modify the master user password. Set "Apply immediately".
2. **Before the change is applied**, update `.env.production` with the new
   password so PM2 can reload as soon as RDS restarts.
3. After RDS reports "available", reload PM2:
   ```bash
   pm2 reload aristotest-backend-prod --update-env
   ```
4. Verify `/health/ready`.

## MinIO credentials rotation

MinIO access/secret keys can't be rotated live — they're baked into the
service. Process:

1. Stop the backend: `pm2 stop aristotest-backend-prod`.
2. SSH into the MinIO host, regenerate credentials via the MinIO console
   or `mc admin user add`.
3. Update `.env.production` with the new keys.
4. `pm2 start aristotest-backend-prod`.
5. Verify `/health/ready` (MinIO probe should pass).

## Third-party API keys (Gemini, OpenAI, Anthropic)

These are safe to rotate live — they're read from `process.env` on each
request, not cached in-process.

1. Generate a new key in the provider console.
2. Update `.env.production`.
3. `pm2 reload aristotest-backend-prod --update-env`.
4. **Revoke** the old key in the provider console (don't skip this).
5. Smoke-test: hit an AI-powered endpoint (e.g. generate a quiz from a manual).

## After any rotation

- [ ] Document the rotation in a shared ops log (date, what was rotated, who did it).
- [ ] Confirm Cloud Error Reporting isn't flooded with 401/500 errors.
- [ ] If a user reports a surprise logout, it's probably JWT rotation — direct
      them to log in again.

## If a secret is leaked

1. **Rotate immediately**, don't wait for the scheduled cadence.
2. If the leak was via git (committed by mistake), see `docs/ops/git-secret-leak.md`.
3. Check Cloud Logging for any unusual activity after the leak timestamp.
4. Notify affected parties if PII or tenant data could have been accessed.
