# Production operations

All commands run from the repository root. Never put secrets in Git. On the shared Rovi VPS, use `compose.production.atlas.yml`: copy `deploy/production.atlas.env.example` to `secrets/production.env`, set mode 600, insert the dedicated Atlas URI, and generate an independent JWT value. Restrict the Atlas network allowlist to `31.220.63.211/32`. The local-Mongo manifest is optional and must not be used on this VPS without a fresh resource review.

## Preflight and release

1. Record the current image IDs and Git revision for rollback.
2. Run `npm ci && npm test && npm audit --audit-level=high` in `BACKEND`.
3. Run `npm ci && npm run lint && npm run build && npm audit --audit-level=high` in `Frontend`.
4. Validate without starting containers: `docker compose --env-file secrets/production.env -f compose.production.atlas.yml config --quiet`.
5. Build and start during an approved window: `docker compose --env-file secrets/production.env -f compose.production.atlas.yml up -d --build`.
6. Check `/api/health/ready`, application login/RBAC, and container health. Host Nginx configuration is a separate manual concern; the file under `deploy/nginx` is only an example.

## Inicialización controlada (cuentas e inventario)

Ejecutar desde `BACKEND` y apuntar `MONGODB_URL` únicamente al entorno aprobado. Antes de escribir, verificar hostname/base de datos, tomar respaldo y usar siempre primero `--dry-run`. No pasar credenciales como argumentos ni guardarlas en historial, archivos versionados o logs.

Administrador inicial:

1. Cargar `ADMIN_EMAIL` y `ADMIN_PASSWORD` desde el gestor de secretos en el entorno del proceso (contraseña de al menos 8 caracteres).
2. Validar sin cambios: `npm run bootstrap-admin -- --dry-run`.
3. Revisar la salida; no contiene correo ni contraseña. En ventana aprobada ejecutar `npm run bootstrap-admin`.
4. El comando es idempotente: no modifica un administrador existente y rechaza correos pertenecientes a clientes/workers. Confirmar `account.admin_bootstrapped` en `audit_events` sólo cuando se creó la cuenta.

Catálogo inicial de stock:

1. Inspeccionar identidades sin cambios: `npm run migrate-stock-item-key -- --dry-run`.
2. Si `duplicates` no está vacío, detenerse y reconciliar manualmente los documentos indicados; el comando nunca los fusiona ni elimina.
3. Con respaldo y ventana aprobada, ejecutar `npm run migrate-stock-item-key -- --apply`. Este comando crea explícitamente `stock_item_key_unique` (sin `syncIndexes`) y rellena `itemKey` dentro de una transacción junto con `inventory.item_key_migrated`.
4. Validar candidatos/existentes: `npm run seed-stock -- --dry-run`; después ejecutar `npm run seed-stock`.
5. El seed usa upsert por identidad normalizada, no repone ni sobrescribe cantidades existentes, y escribe cambios más auditoría en una transacción.
6. Confirmar los resúmenes y los eventos de migración/seed en `audit_events`.

Los dry-runs consultan la base para validar el estado, pero no crean/modifican documentos, índices ni eventos de auditoría. Las operaciones con auditoría requieren una topología MongoDB que soporte transacciones. Evitar ejecutarlas simultáneamente o contra una base no respaldada.

## Auditoría

`audit_events` es append-only a través del modelo de aplicación: se rechazan update, replace, save de documentos existentes y delete. Las mutaciones auditadas y sus eventos usan la misma transacción MongoDB; un fallo de auditoría revierte la mutación. Restringir además en MongoDB el rol del backend para impedir updates/deletes directos sobre esta colección; el modelo no puede proteger accesos administrativos externos.

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
