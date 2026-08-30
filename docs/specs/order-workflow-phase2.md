# SPEC — Flujo operativo de pedidos (Fase 2)

Estado: implementado en backend y frontend.

El frontend consume exclusivamente los listados y detalles canónicos para el flujo:
colas por estado, filtros/paginación server-side, timeline, asignación, transiciones,
cancelación, reapertura administrativa y refresco autenticado mediante Socket.IO.
`NotifyAndComplete` permanece sólo como adaptador compatible hacia la transición
canónica; el modal maqueta `NewOrder` está retirado de la operación.

## 1. Máquina de estados

Estados canónicos (el texto y mayúsculas son parte del contrato):

- `Pending`: creado y por recibir.
- `In Progress`: recibido y en proceso.
- `Completed`: terminado y listo para entregar.
- `Delivered`: entregado y cerrado.
- `Cancelled`: cancelado.

Transiciones ordinarias:

```
Pending     -> In Progress | Cancelled
In Progress -> Completed   | Cancelled
Completed   -> Delivered
```

No se permiten saltos, retrocesos ordinarios ni transiciones desde `Delivered` o `Cancelled`. Cancelar exige `comment`. La reapertura es una operación separada, exclusiva de admin, exige `reason` y lleva `Completed`, `Delivered` o `Cancelled` a `In Progress`.

Cada mutación usa compare-and-set (`_id` + estado/asignación observados) dentro de una transacción MongoDB. Una carrera devuelve `409`; no se aplica last-write-wins. El evento de auditoría se inserta con la misma sesión/transacción que el cambio del pedido.

## 2. Autorización

- `user`: crea pedidos, lista sólo los propios y consulta sólo detalle propio. No transiciona ni asigna.
- `worker`: lista/detalla pedidos operativos, se asigna un pedido libre mediante la operación explícita de asignación, opera sólo un pedido asignado exactamente a sí mismo y no puede reabrir. La transición no reclama implícitamente un pedido.
- `admin`: lista/detalla, transiciona, asigna o reasigna a cualquier worker activo y reabre con motivo.
- Una asignación sólo acepta una cuenta `Worker` con `role=worker` y `active=true`, leída dentro de la transacción.
- Un pedido `Delivered` o `Cancelled` no puede asignarse sin reapertura previa.

## 3. API canónica

Todos los endpoints requieren el encabezado `Authorization` con esquema Bearer y un JWT válido.

### Cliente

- `GET /api/user/orders`
- `GET /api/user/orders/:orderId`

### Operación

Las rutas están disponibles bajo `/api/worker` para worker/admin y bajo `/api/admin` para admin:

- `GET /api/worker/orders`
- `GET /api/worker/orders/:orderId`
- `PATCH /api/worker/orders/:orderId/transition`
  - body: `{ "status": "In Progress", "comment": "...", "origin": "web" }`
  - `origin`: `web | api | legacy | system`; por defecto `api`.
- `PATCH /api/worker/orders/:orderId/assignment`
  - worker: se asigna a sí mismo; un `workerId` distinto devuelve `403`.
  - admin: body `{ "workerId": "ObjectId", "comment": "..." }`.
- `PATCH /api/admin/orders/:orderId/reopen`
  - body obligatorio: `{ "reason": "..." }`.
- `POST /api/worker/orders/:orderId/notifications/completed/retry`
  - reintenta sólo una notificación `Completed` fallida; una ya enviada no vuelve a reclamarse.

Aliases conservados:

- `GET /api/worker/getallorderdetails` ahora devuelve el listado paginado compatible.
- `PATCH /api/worker/update-order-status/:orderId` conserva la intención de completar, pero ya no salta la máquina: sólo funciona desde `In Progress`.

## 4. Paginación y filtros

Parámetros para listados:

- `page`: entero >= 1, default 1.
- `limit`: entero 1..100, default 25.
- `status`: uno o varios estados canónicos separados por coma.
- `paymentStatus` o alias `payment`: `pending | pending_review | paid | unpaid`.
- `workerId`: ObjectId válido.
- `dateFrom`, `dateTo`: fecha ISO; una fecha `YYYY-MM-DD` incluye el día completo en UTC.
- `bagNumber`, `client`, `phone`, `room`: texto no vacío de hasta 100 caracteres; se escapa antes de construir el regex.

Los filtros de perfil de un cliente consultan exclusivamente su propio `_id` y nunca sustituyen el filtro inmutable `userId`. Para admin/worker, la precarga está limitada a 501 lecturas para aceptar como máximo 500 coincidencias; una búsqueda más amplia devuelve `422` y debe refinarse. El listado de pedidos mantiene `limit <= 100`.

Respuesta:

```json
{
  "items": [],
  "orders": [],
  "page": 1,
  "limit": 25,
  "total": 0,
  "totalPages": 0,
  "totalOrders": 0,
  "pendingOrders": 0,
  "completedOrders": 0
}
```

`orders` y los contadores legacy se conservan para compatibilidad. Los contadores por estado son sobre la página; `total`/`totalOrders` son sobre el filtro completo.

Filtros inválidos y ObjectIds inválidos devuelven `400`; recurso inexistente `404`; carrera o regla de negocio incompatible `409`; ownership/RBAC `403`.

## 5. DTO y detalle

El DTO conserva aliases actuales (`id`, `orderId`, `OrderId`, `numberOfItems`, `numberOfClothes`, `orders`) y añade campos canónicos de cliente, asignación, precio y pago. Nunca expone bytes de evidencia.

El detalle incluye `timeline`. Cada evento contiene:

- `type`: `created | transition | assignment | reopened | notification`;
- `fromStatus` / `toStatus` cuando aplica;
- `fromWorker` / `toWorker` cuando aplica;
- `actor.id`, `actor.role`;
- `timestamp`;
- `comment`;
- `origin`.

La timeline es append-only: el modelo rechaza `$set`, `$unset`, `$pull`, `$pullAll`, `$pop`, `$rename` desde/hacia timeline, pipelines, replace/delete y operaciones `bulkWrite` destructivas. Sólo un `$push` de un evento literal (sin modificadores `$each/$slice/$sort`) está permitido; el guard también se aplica dentro de `bulkWrite`.

## 6. SMS de Completed

La transición a `Completed` crea `completionNotification.transitionEventId` con el mismo ID del evento de timeline. Después del commit:

1. Se reclama atómicamente `pending|failed -> sending`, o `sending` con lease vencido, condicionado al ID de transición y a que el pedido siga `Completed`.
2. Sólo quien reclama llama Twilio.
3. Éxito marca `sent`, `sentAt` y el alias `smsSent=true`.
4. Error marca `failed` y deja el estado del pedido intacto en `Completed`.
5. El claim guarda `claimedAt`, `lastAttemptAt`, `leaseExpiresAt`, `attempts` y un token único. Un `sending` vigente responde `in-progress`; tras 2 minutos puede recuperarse. Sólo el dueño del token puede finalizar y registra timeline/audit; un dueño obsoleto responde `lease-lost`. Una notificación `sent` no se vuelve a enviar.

Sin configuración Twilio se responde `not-configured`; no se degrada ni revierte el pedido. El endpoint de retry permite recuperar fallos explícitamente sin duplicar éxitos.

## 7. Índices

Pedidos:

- `{ status: 1, createdAt: -1 }`
- `{ assignedWorker: 1, status: 1, createdAt: -1 }`
- `{ payment.current.status: 1, createdAt: -1 }`
- `{ userId: 1, createdAt: -1 }`
- `{ createdAt: -1 }`

Usuarios añaden índices para `bagNumber`, `name` y `roomNumber`; `phoneNumber` ya dispone de índice único.

## 8. Operación y pruebas

Las transacciones requieren una topología MongoDB compatible (replica set/Atlas). No existe fallback no transaccional para cambios de workflow, porque separaría pedido y auditoría.

Ejecutar:

```sh
cd BACKEND
npm test
npm audit --audit-level=high
```

`test/order-workflow.test.js` cubre flujo positivo, saltos y payloads negativos, ObjectId 400, RBAC, asignación activa, reapertura, compare-and-set en carrera, auditoría con la misma sesión, filtros/paginación, timeline append-only y SMS sin degradación de estado.
