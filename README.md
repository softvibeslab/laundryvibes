# LaundryVibes

LaundryVibes is a React/Vite laundry-order SPA backed by Express, MongoDB/Mongoose and authenticated Socket.IO. The API supports customer registration/login, profiles, orders and complaints, plus server-protected worker order and stock workflows.

## Security model

- JWT Bearer authentication; server-side RBAC (`user`, `worker`, `admin`). UI guards are convenience only.
- Same-origin browser endpoints (`/api` and `/socket.io`); production host Nginx proxies to loopback-only containers.
- Helmet, explicit CORS allowlist, request-size limits, login/reset rate limiting and uniform JSON errors.
- Password-reset tokens are random, stored only as SHA-256 digests, expire consistently and are never returned by the API.
- Socket connections require JWT handshakes and join role/user rooms. Tokens are never event payloads.
- Completion SMS uses the order owner's stored phone and a server-defined message. It is best-effort and idempotent; clients cannot choose destination/content.
- Complaint delivery is first-party through the API; no Web3Forms key is bundled.

## Local development

Requirements: Node 20+ and MongoDB.

```sh
cp BACKEND/.env.example BACKEND/.env
cd BACKEND && npm ci && npm run dev
# another terminal
cd Frontend && npm ci && npm run dev
```

Vite proxies `/api` and `/socket.io` to `VITE_DEV_PROXY_TARGET` (default `127.0.0.1:3000`). The backend validates required configuration and does not listen until Mongo is connected.

## Checks

```sh
(cd BACKEND && npm ci && npm test && npm audit --audit-level=high)
(cd Frontend && npm ci && npm run lint && npm run build && npm audit --audit-level=high)
```

Health endpoints: `/api/health/live` (process) and `/api/health/ready` (Mongo readiness).

## Production

`compose.production.yml` uses project/container/network/volume names prefixed `laundryvibes`, a private unexposed Mongo service, non-root/read-only application containers, health checks and resource/PID limits. Backend binds only to `127.0.0.1:5050`; frontend binds to `127.0.0.1:5080`. It does not modify or install host Nginx.

1. Copy `deploy/production.env.example` to the Git-ignored `secrets/production.env` and replace every placeholder.
2. Validate with `docker compose --env-file secrets/production.env -f compose.production.yml config --quiet`.
3. Follow `docs/production-runbook.md` for release, backup, restore and rollback.
4. Review the separate example `deploy/nginx/laundryvibes.example.conf`; deployment remains a manual, host-specific operation.

No real secret belongs in this repository. Docker execution/deployment is intentionally not part of repository preparation.
