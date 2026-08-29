# Production operations

All commands run from the repository root. Never put secrets in Git. Copy `deploy/production.env.example` to `secrets/production.env`, set mode 600, and generate independent root, application-DB, and JWT values. Keep `MONGO_APP_PASSWORD` and the password embedded in `MONGODB_URL` identical; URL-encode it in the URL when necessary. The application authenticates as the dedicated `readWrite` user, never Mongo root.

## Preflight and release

1. Record the current image IDs and Git revision for rollback.
2. Run `npm ci && npm test && npm audit --audit-level=high` in `BACKEND`.
3. Run `npm ci && npm run lint && npm run build && npm audit --audit-level=high` in `Frontend`.
4. Validate without starting containers: `docker compose --env-file secrets/production.env -f compose.production.yml config --quiet`.
5. Build and start during an approved window: `docker compose --env-file secrets/production.env -f compose.production.yml up -d --build`.
6. Check `/api/health/ready`, application login/RBAC, and container health. Host Nginx configuration is a separate manual concern; the file under `deploy/nginx` is only an example.

## Backup

Use a timestamped, encrypted destination outside the repository. Example (runs `mongodump` inside Mongo and streams it; it does not expose Mongo):

`docker compose --env-file secrets/production.env -f compose.production.yml exec -T mongo sh -c 'mongodump --archive --gzip --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db laundryvibes' > /secure/backups/laundryvibes-$(date -u +%Y%m%dT%H%M%SZ).archive.gz`

Restrict permissions, encrypt/copy off-host, record checksum, retention, and periodically prove restore on an isolated environment.

## Restore

1. Announce downtime and stop backend writes: `docker compose ... stop backend`.
2. Take a final backup.
3. Restore only a verified backup: `docker compose ... exec -T mongo sh -c 'mongorestore --archive --gzip --drop --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin' < /secure/backups/FILE.archive.gz`.
4. Start backend, wait for readiness, perform smoke tests and reconcile order/SMS state. Never restore untrusted archives.

## Rollback

Application rollback: retag the recorded prior immutable frontend/backend image IDs (or check out the prior reviewed revision and rebuild), then run Compose without changing the Mongo volume. Verify readiness and login/RBAC. Do not blindly roll back Mongo data for an application fault.

Data rollback (last resort): stop writers, preserve the failed-state backup, restore the selected verified archive, then smoke test. Document timestamps, operator, image IDs and checksums.
