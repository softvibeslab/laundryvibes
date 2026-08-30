# Plan maestro — Finalización E2E de LaundryVibes

Estado: Propuesto para ejecución
Fecha: 2026-08-30
Base auditada: `feature/payment-settings-pos` @ `088f0ab`
Producción: `https://laundryvibes.rovicrm.com`

## 1. Resultado esperado

Terminar LaundryVibes como una aplicación operativa E2E para una lavandería, con flujos completos y verificables para cliente, trabajador y administrador:

1. El cliente se registra, crea un pedido, conoce el precio autoritativo, declara su pago, sigue el pedido, recibe avisos y puede abrir una reclamación vinculada.
2. El trabajador recibe el pedido, lo asigna/procesa, registra consumo de inventario, registra o valida el pago y entrega la orden con trazabilidad.
3. El administrador gestiona configuración, equipo, excepciones, reclamaciones, pagos, caja, inventario, reportes y auditoría.
4. El sistema conserva integridad ante concurrencia, aplica RBAC del lado servidor, pagina los listados, registra acciones sensibles y cuenta con pruebas E2E, CI/CD, backups y observabilidad.
5. La publicación se realiza de forma aislada, reversible y sin tocar los recursos de Rovi.

## 2. Alcance y límites

### Incluido

- Seguridad y consistencia P0.
- Flujo completo de pedidos y línea de tiempo.
- Asignación de trabajadores.
- Inventario ligado a pedidos.
- Administración completa de trabajadores.
- Pagos manuales/POS, revisión de evidencia, correcciones y cierre de caja.
- Reclamaciones E2E.
- Notificaciones con trazabilidad.
- Reportes operativos y Daily Rush basado en datos reales.
- Paginación, filtros, índices y auditoría.
- Pruebas backend, frontend, integración y E2E por rol.
- CI/CD, imágenes inmutables, monitoreo y recuperación.

### Fuera de alcance de este plan

- Cobros reales mediante Stripe, Mercado Pago o PayPal.
- Captura o almacenamiento de PAN/CVV.
- CFDI.
- Conversión de moneda.
- Operación offline.
- Aplicaciones móviles nativas.

Los proveedores de pago reales requieren una SPEC independiente de seguridad, conciliación, contratos y cumplimiento. En esta entrega deben permanecer visibles sólo como “Próximamente” o retirarse.

## 3. Reglas de implementación

- Trabajar en ramas limpias por fase desde `main`; no desarrollar sobre el árbol de producción con cambios ajenos.
- Integrar primero `feature/payment-settings-pos` mediante PR revisado.
- Aplicar RED-GREEN-REFACTOR a todo cambio de comportamiento.
- Backend como autoridad de roles, estados, precios, moneda, totales, inventario y transiciones.
- Toda acción sensible conserva actor, rol, fecha, origen y motivo cuando corresponda.
- Dinero en unidades menores enteras; nunca depender de floats del navegador.
- Operaciones de inventario y cambios financieros con escrituras condicionales/atómicas.
- Listados grandes con paginación server-side, filtros validados e índices.
- No incluir secretos, dumps, evidencias ni datos personales reales en Git o fixtures.
- No desplegar una fase sin backup, smoke autenticado, rollback definido y verificación de Rovi.

## 4. Definición global de terminado

LaundryVibes se considera terminado E2E cuando:

- [ ] Los tres roles completan sus journeys en navegador contra un entorno aislado.
- [ ] No quedan botones accionables que sean maquetas.
- [ ] No quedan promesas de correo, SMS, SLA o cobro que el sistema no pueda verificar.
- [ ] Los pedidos recorren estados válidos con timeline y actor.
- [ ] Completar un pedido registra de forma atómica el consumo confirmado de inventario.
- [ ] Las reclamaciones se vinculan a pedidos y tienen responsable, prioridad, SLA, resolución e historial.
- [ ] Admin puede listar, crear, editar, suspender y reactivar trabajadores.
- [ ] Los pagos manuales tienen revisión, historial, corrección/anulación controlada y cierre de caja.
- [ ] Ningún listado operativo depende de cargar colecciones completas.
- [ ] Backend tests, integración Mongo, frontend tests, lint, build y E2E pasan en CI.
- [ ] `npm audit --audit-level=high` pasa en backend y frontend, o cada excepción está documentada y aceptada.
- [ ] Producción usa imágenes etiquetadas por commit y permite rollback.
- [ ] Existe backup automático, alerta de fallo y restore ensayado en entorno aislado.
- [ ] Health, logs, métricas y alertas permiten detectar caída de app, Atlas y notificaciones.
- [ ] Producción y Rovi pasan smoke después del despliegue.

## 5. Secuencia de entrega

No ejecutar fases de producto en paralelo si comparten modelos centrales (`userOrder`, pagos, stock o identidad). Sí se pueden paralelizar frontend, pruebas y documentación después de estabilizar el contrato API de cada fase.

---

## Fase 0 — Formalizar baseline y release actual

### Objetivo

Convertir el estado desplegado actual en una base trazable antes de agregar más cambios.

### Tareas

1. Abrir PR de `feature/payment-settings-pos` hacia `main`.
2. Revisar el diff completo de los dos commits pendientes.
3. Confirmar que `README.md` y `docs/specs/payment-settings-pos.md` describen el comportamiento real.
4. Corregir el roadmap desactualizado que todavía presenta la integración autoritativa de pagos como pendiente.
5. Etiquetar el release base después del merge.
6. Añadir metadatos de commit/build a las imágenes y un endpoint/version file no sensible.

### Verificación

```sh
(cd BACKEND && npm test && npm audit --audit-level=high)
(cd Frontend && npm run lint && npm run build && npm audit --audit-level=high)
git diff --check
git status --short
```

### Criterios de aceptación

- `main` contiene la implementación desplegada.
- El árbol está limpio.
- Existe tag de baseline y SHA identificable desde las imágenes.
- No hay discrepancias entre landing, README, spec y producto.

---

## Fase 1 — Seguridad, identidad e integridad P0

### Objetivo

Eliminar vulnerabilidades que pueden comprometer acceso, sesiones, inventario o recuperación operativa.

### Backend

Archivos principales:

- `BACKEND/app.js`
- `BACKEND/middleware/authMiddleware.js`
- `BACKEND/controllers/user/Authentification/userController.js`
- `BACKEND/controllers/Admin/worker-Controller/workerController.js`
- `BACKEND/controllers/worker/stockController.js`
- `BACKEND/models/Stock.js`
- `BACKEND/models/user.js`
- `BACKEND/models/Worker/workerModel.js`
- `BACKEND/models/user/Complaint Form/complaintModel.js`
- Nuevos: `BACKEND/models/auditEvent.js`, `BACKEND/services/auditService.js`, `BACKEND/scripts/bootstrap-admin.js`

Tareas:

1. Centralizar login o aplicar el mismo rate limiter a todos los aliases.
2. Añadir límites diferenciados para login, reset y endpoints de escritura sensibles.
3. Incorporar `tokenVersion`/`sessionVersion`, estado activo y comprobación de cuenta en auth middleware.
4. Invalidar sesiones al cambiar contraseña, suspender cuenta o cambiar rol.
5. Crear bootstrap admin idempotente, auditable y ejecutable sólo desde CLI/runtime.
6. Unificar validación de email y contraseña entre clientes y workers.
7. Normalizar `bagNumber` como String en reclamaciones y pedidos.
8. Convertir consumo/reposición a updates atómicos:
   - `$inc` para reposición;
   - filtro `currentQuantity >= requested` para consumo;
   - respuesta `409` ante saldo insuficiente o carrera.
9. Validar números finitos, positivos, límites y precisión antes de Mongo.
10. Mover el seed de inventario a script explícito y añadir índice único normalizado.
11. Añadir auditoría base para login administrativo, cambios de configuración, inventario y cuentas.

### Pruebas RED

- Rate limiter no puede evadirse por `/api/admin/login` o `/api/worker/login`.
- Token anterior deja de funcionar después de cambio de contraseña/suspensión.
- Dos consumos concurrentes nunca producen saldo negativo ni pierden actualizaciones.
- Dos reposiciones concurrentes conservan ambas cantidades.
- `bagNumber=B-01` crea una reclamación válida.
- Bootstrap repetido no duplica admin.
- Seed repetido no duplica artículos.

### Criterios de aceptación

- No existe alias de login sin protección equivalente.
- Inventario resiste pruebas reales de concurrencia con Mongo.
- El primer admin puede recuperarse sin editar documentos manualmente.
- Las acciones sensibles generan un evento de auditoría.

---

## Fase 2 — Máquina de estados y operación completa de pedidos

### Objetivo

Reemplazar `Pending → Completed` por un flujo operacional trazable.

### Contrato propuesto

Estados canónicos:

- `Pending`: pedido creado, por recibir.
- `In Progress`: recibido y en proceso.
- `Completed`: listo para entregar.
- `Delivered`: entregado y cerrado.
- `Cancelled`: cancelado con motivo.

Transiciones:

- `Pending → In Progress | Cancelled`
- `In Progress → Completed | Cancelled`
- `Completed → Delivered`
- Reapertura sólo por admin, con motivo y auditoría.

### Backend

Archivos principales:

- `BACKEND/models/userOrder.js`
- `BACKEND/controllers/user/OrderManagement/orderController.js`
- `BACKEND/controllers/worker/All-Orders/allorders.js`
- `BACKEND/routes/Worker/Get-All-Orders/allOrders.js`
- `BACKEND/utils/orderDto.js`
- Nuevos: `BACKEND/services/orderStateService.js`, `BACKEND/models/orderEvent.js` o subdocumento de timeline acotado.

Tareas:

1. Definir máquina de estados centralizada.
2. Añadir transición condicional atómica por estado actual.
3. Validar ObjectId y devolver 400/404, nunca CastError 500.
4. Registrar actor, timestamps, comentario y origen.
5. Implementar asignación/reasignación a worker activo.
6. Añadir cancelación y reapertura administrativa.
7. Crear detalle de pedido con timeline.
8. Implementar paginación, búsqueda y filtros server-side:
   - estado;
   - pago;
   - trabajador;
   - rango de fecha;
   - bolsa;
   - cliente;
   - teléfono;
   - habitación.
9. Añadir índices para los filtros reales.
10. Hacer idempotentes las notificaciones vinculadas a transición.

### Frontend

Archivos principales:

- `Frontend/src/Component/Worker/OrdersManagement/OrderManagement.jsx`
- `Frontend/src/Component/Worker/OrdersManagement/NotifyAndComplete.jsx`
- `Frontend/src/Component/User/OrderHistory/Orderhistory.jsx`
- `Frontend/src/Component/User/Dashboard.jsx`
- Nuevos: componentes de detalle, timeline, asignación y transición.

Tareas:

1. Crear columnas/colas “Por recibir / En proceso / Listo / Entregado”.
2. Mostrar acciones válidas según estado y rol.
3. Añadir detalle con timeline, pago, inventario y reclamaciones.
4. Corregir dashboard cliente sin `[undefined]`, estados estáticos ni bolsa usada como ID.
5. Escuchar eventos Socket.IO del propietario y actualizar historial/dashboard.
6. Sustituir errores de consola por feedback accesible.
7. Implementar el “Nuevo pedido” operativo o retirarlo hasta la fase correspondiente; no dejar modal maqueta.

### Criterios de aceptación

- Una orden recorre el flujo completo sin saltos ilegales.
- Dos transiciones concurrentes no pueden sobrescribirse.
- Cliente ve estado y timeline actualizados.
- Admin puede reasignar/reabrir con motivo.
- Listados operan con paginación real.

---

## Fase 3 — Inventario ligado al pedido

### Objetivo

Cerrar el loop pedido → producción → consumo → trazabilidad.

### Modelo

Añadir al pedido un snapshot de consumo confirmado:

- insumo;
- cantidad sugerida;
- cantidad confirmada;
- unidad;
- actor;
- timestamp;
- referencia al movimiento de inventario.

### Tareas

1. Crear catálogo de reglas de consumo por servicio/peso.
2. Al pasar a `Completed`, presentar consumos sugeridos.
3. Permitir ajuste del trabajador antes de confirmar.
4. Confirmar transición y consumo en transacción Mongo cuando el entorno lo soporte.
5. Si falta inventario, bloquear o requerir override administrativo explícito con motivo.
6. Registrar movimientos append-only de reposición, consumo y corrección.
7. Exponer crear, editar, archivar y reactivar insumos.
8. Mostrar alertas críticas en dashboard worker/admin.
9. Corregir analytics para separar alertas activas y resueltas.
10. Añadir historial completo y filtros.

### Archivos principales

- `BACKEND/models/Stock.js`
- `BACKEND/controllers/worker/stockController.js`
- `BACKEND/routes/Worker/stockRoutes.js`
- `BACKEND/models/userOrder.js`
- `Frontend/src/Component/Worker/Stock/Stock.jsx`
- Flujo de detalle/transición de pedidos creado en Fase 2.

### Pruebas

- Completar pedido descuenta exactamente los movimientos confirmados.
- Fallo de un movimiento revierte la transición completa.
- Reintento no duplica consumo.
- Override sólo funciona para admin y queda auditado.
- Alertas cambian de estado correctamente al consumir/reponer.

### Criterios de aceptación

- No se puede completar silenciosamente un pedido sin resolver su consumo configurado.
- Todo cambio de saldo tiene movimiento, actor y motivo/origen.
- Saldo materializado coincide con la suma auditada de movimientos.

---

## Fase 4 — Administración de equipo y dashboard de excepciones

### Objetivo

Convertir admin en una herramienta de supervisión, no una copia del panel worker.

### Backend

1. Listar workers con paginación y estado.
2. Crear/invitar worker.
3. Editar nombre y capacidades permitidas.
4. Suspender/reactivar.
5. Reset seguro de contraseña.
6. Cerrar todas las sesiones.
7. Impedir suspender al último admin activo.
8. Registrar auditoría de cada acción.
9. Añadir endpoint agregado de excepciones:
   - pedidos atrasados;
   - pagos pendientes de revisión;
   - inventario crítico;
   - reclamaciones abiertas;
   - fallos de notificación.

### Frontend

1. Página de equipo con búsqueda, filtros y estados.
2. Formularios accesibles de alta/edición/suspensión.
3. Dashboard admin con excepciones, métricas, caja, equipo y configuración.
4. Mantener dashboard worker enfocado en trabajo del turno.
5. Eliminar privilegios administrativos de la navegación worker.

### Criterios de aceptación

- Admin gestiona el ciclo completo de una cuenta sin tocar Mongo.
- Worker suspendido pierde acceso inmediatamente.
- Dashboard admin responde “qué necesita atención ahora”.
- RBAC negativo probado por API y navegador.

---

## Fase 5 — Reclamaciones E2E y servicio al cliente

### Objetivo

Pasar de capturar formularios a resolver casos trazables.

### Modelo mínimo

- `complaintNumber` público.
- `orderId` obligatorio cuando exista pedido relacionado.
- categoría, descripción, fecha del incidente y evidencia opcional.
- prioridad: low/medium/high/critical.
- estado: open/in_review/waiting_customer/resolved/rejected.
- responsable.
- SLA configurado y fecha objetivo.
- timeline de eventos/comentarios.
- resolución y fecha de cierre.

### Backend

1. Crear consulta propia para cliente.
2. Crear bandeja paginada para worker/admin según permisos.
3. Asignar, priorizar, comentar y cambiar estado.
4. Vincular a pedido y validar ownership.
5. Añadir evidencia protegida con reglas equivalentes a pagos.
6. Evitar exposición de notas internas al cliente.
7. Generar eventos de auditoría y notificación.

### Frontend

1. Selector de pedido en el formulario.
2. Enviar todos los campos visibles; eliminar campos no persistidos.
3. Mostrar número de seguimiento y estado.
4. Historial de reclamaciones para cliente.
5. Bandeja, filtros, detalle y resolución para admin.
6. Retirar promesa fija de “24 horas” hasta que el SLA configurado pueda cumplirse y medirse.

### Criterios de aceptación

- Cliente sólo ve sus reclamaciones.
- Admin completa creación → asignación → comunicación → resolución.
- El timeline separa notas internas y mensajes visibles.
- SLA y atrasos aparecen en dashboard de excepciones.

---

## Fase 6 — Finanzas, revisión de pagos y caja

### Objetivo

Completar el flujo manual sin convertir LaundryVibes en procesador de pagos.

### Tareas

1. Añadir bandeja de `pending_review`.
2. Aprobar/rechazar evidencia con motivo.
3. Conservar historial append-only del pago.
4. Implementar regularización administrativa de pedidos históricos sin snapshot.
5. Añadir corrección/anulación con transición condicional, motivo y permisos.
6. Mantener precio/moneda snapshot inmutables; correcciones como nuevos eventos.
7. Implementar turnos de caja:
   - apertura;
   - operador;
   - pagos esperados por método;
   - efectivo contado;
   - diferencia;
   - cierre y aprobación.
8. Crear historial financiero paginado con filtros.
9. Generar comprobante descargable después de validación.
10. Exportar CSV/PDF desde datos server-authoritative.
11. Revisar evidencia: preferir descarga `attachment`, escaneo y/o origen separado si aumenta sensibilidad.

### Archivos principales

- `BACKEND/models/userOrder.js`
- `BACKEND/models/paymentConfig.js`
- `BACKEND/controllers/payment/paymentController.js`
- `BACKEND/services/paymentService.js`
- Nuevos modelos/controladores para eventos de pago y turnos.
- `Frontend/src/Component/Worker/OrdersManagement/PosPaymentModal.jsx`
- `Frontend/src/Component/Worker/Settings/OperationsSettings.jsx`
- Nuevas páginas de revisión, historial y caja.

### Criterios de aceptación

- Un pago no puede aprobarse, anularse o corregirse dos veces por carrera.
- Cada movimiento financiero conserva actor, motivo y snapshots.
- Caja puede cerrarse y explicar diferencias.
- Ningún endpoint acepta total, tarifa o moneda como autoridad del navegador.

---

## Fase 7 — Notificaciones, reportes y Daily Rush

### Notificaciones

1. Crear servicio único con proveedores SMTP/Twilio y estado persistente.
2. Plantillas configurables por evento.
3. Preferencias del cliente y consentimiento.
4. Outbox/cola con idempotency key, reintentos acotados y dead-letter state.
5. Mostrar `sent`, `failed`, `not-configured` y `already-sent` al operador.
6. Métricas y alertas por fallos.
7. Mantener Socket.IO para actualización UI, separado de entrega SMS/correo.
8. Si se escala a múltiples réplicas, incorporar adapter Redis sólo cuando sea necesario.

### Reportes

1. Reemplazar `GenerateReport.jsx` por generación real server-side.
2. Reportes por periodo:
   - pedidos y estados;
   - ingresos registrados;
   - pagos por método;
   - productividad;
   - consumos y reposiciones;
   - reclamaciones y SLA.
3. Descarga CSV/PDF con filtros y zona horaria configurable.
4. No enviar correos sin confirmación clara y resultado observable.

### Daily Rush

1. Definirlo como proyección basada en histórico, capacidad y pedidos abiertos.
2. Mostrar datos suficientes, no una predicción opaca.
3. Si no hay volumen histórico suficiente, mostrar “Datos insuficientes”.
4. Probar zona horaria y cortes diarios de México; eliminar `Asia/Kolkata`.

### Criterios de aceptación

- Cada notificación tiene estado consultable e idempotencia.
- Los botones de reporte generan un archivo real.
- Daily Rush usa datos persistidos y explica su cálculo.
- No quedan pantallas “Temporalmente no disponible” dentro de navegación activa.

---

## Fase 8 — Calidad frontend, accesibilidad y performance

### Tareas

1. Introducir Vitest + Testing Library.
2. Introducir Playwright para E2E por rol.
3. Crear un API client central con manejo coherente de 401/403/409/422/500.
4. Sustituir `alert()` y errores sólo en consola por feedback accesible.
5. Implementar focus trap, Escape, labels y restauración de foco en modales.
6. Corregir las 19 advertencias ESLint y ejecutar lint con `--max-warnings=0`.
7. Actualizar Browserslist y dependencias transitivas vulnerables.
8. Declarar dependencias directas usadas, incluido `prop-types` si permanece.
9. Separar rutas con `React.lazy` y reducir el chunk principal.
10. Revisar tablas y acciones en viewport móvil.
11. Centralizar logout y limpiar todas las claves de sesión.
12. Añadir boundary global de errores y estados loading/empty/error.
13. Verificar landing, sitemap, canonical, OG, accesibilidad y rutas 404.

### Criterios de aceptación

- Frontend tiene pruebas unitarias para componentes y flujos críticos.
- E2E cubre los journeys definidos en la matriz de la sección 10.
- Lint pasa sin warnings.
- Build pasa sin advisories altos no aceptados.
- No existe acción visible sin resultado o feedback verificable.

---

## Fase 9 — Plataforma, CI/CD, observabilidad y recuperación

### CI

Crear `.github/workflows/ci.yml` con jobs separados:

1. Backend install/test/audit.
2. Frontend install/lint/test/build/audit.
3. Integración con Mongo efímero.
4. Playwright E2E contra Compose aislado.
5. Escaneo de secretos y dependencias.
6. Build y escaneo de imágenes.
7. Publicación de imágenes sólo desde commits aprobados/tags.

### Contenedores

1. Etiquetar imágenes por SHA, no sólo `:local`.
2. Fijar bases por versión/digest.
3. Añadir `cap_drop: [ALL]` y capacidades mínimas.
4. Ejecutar frontend como non-root.
5. Mantener puertos loopback-only y límites de recursos.
6. Revisar egress y separar redes si frontend no necesita salida externa.
7. Añadir rotación explícita de logs.

### Observabilidad

1. Logs JSON con request/correlation ID.
2. Métricas de requests, latencia, 4xx/5xx, Mongo, Socket.IO y outbox.
3. Monitoreo externo de:
   - HTTPS público;
   - `/api/health/live`;
   - `/api/health/ready`;
   - expiración TLS.
4. Alertas por:
   - readiness caído;
   - errores elevados;
   - fallos de notificación;
   - backup fallido;
   - reinicios/OOM;
   - inventario negativo o inconsistente.
5. Política CSP/HSTS/referrer/permissions en el edge, validada sin romper SPA/Socket.IO.

### Backups

1. Confirmar y documentar snapshots/PITR de Atlas.
2. Añadir backup lógico cifrado cuando sea necesario para portabilidad.
3. Retención y copia off-host.
4. Alerta de fallo.
5. Restore trimestral en proyecto/cluster aislado.
6. Verificar conteos, índices, usuarios de prueba y checksums después del restore.
7. Nunca restaurar sobre producción durante un ensayo.

### Criterios de aceptación

- Un PR no puede mergearse con gates rojos.
- Cada release identifica commit, imágenes y migraciones.
- Existe rollback probado.
- Una caída de backend/Atlas genera alerta.
- Existe evidencia fechada del último backup y restore ensayado.

---

## 6. Matriz E2E mínima

### Cliente

1. Registro → login → perfil → cotización → pedido efectivo → historial.
2. Pedido por transferencia con evidencia → `pending_review` → aprobación → comprobante.
3. Ver timeline hasta `Delivered` con actualizaciones.
4. Abrir reclamación vinculada → consultar estado → recibir resolución.
5. Intentar leer pedido/evidencia/reclamación de otro cliente → 403/404 sin filtración.
6. Cambio de contraseña invalida sesión anterior.

### Worker

1. Login → ver cola → tomar/asignarse pedido → `In Progress`.
2. Confirmar consumo → `Completed` → registrar pago → `Delivered`.
3. Saldo insuficiente bloquea consumo y no cambia estado.
4. Búsqueda/filtros/paginación conservan resultados.
5. Worker no puede cambiar configuración, gestionar equipo ni anular pagos.
6. Worker suspendido pierde acceso inmediatamente.

### Admin

1. Login → dashboard de excepciones.
2. Crear/editar/suspender/reactivar worker.
3. Cambiar tarifa/métodos y confirmar aplicación en cliente/POS.
4. Revisar evidencia y aprobar/rechazar.
5. Resolver reclamación y verificar comunicación.
6. Abrir/cerrar caja y explicar diferencia.
7. Corregir/reabrir con motivo y verificar auditoría.
8. Descargar reportes.

### Concurrencia y resiliencia

1. Doble transición del mismo pedido.
2. Doble consumo del mismo saldo.
3. Doble pago/aprobación/anulación.
4. Reintento de notificación sin duplicado.
5. Mongo no disponible → readiness falla y no hay writes parciales.
6. Reinicio de backend → pedidos y outbox continúan consistentes.

### Borde y despliegue

1. HTTP redirige a HTTPS.
2. TLS válido y headers esperados.
3. Rutas SPA conocidas funcionan al refrescar.
4. Ruta desconocida devuelve 404.
5. Socket.IO funciona detrás de Nginx.
6. Backend y frontend sólo escuchan en loopback del host.
7. Smoke de Rovi permanece verde después de desplegar LaundryVibes.

## 7. Estrategia de datos y migraciones

Cada cambio de modelo debe incluir:

1. Script idempotente versionado.
2. Modo `--dry-run` con conteos, sin imprimir PII.
3. Backup estrechamente delimitado antes de escritura.
4. Índices creados de forma controlada.
5. Compatibilidad temporal de lectura para documentos antiguos.
6. Verificación posterior con conteos e invariantes.
7. Script o procedimiento de rollback.

Migraciones previstas:

- Normalizar `bagNumber`.
- Añadir `active` y `tokenVersion` a identidades.
- Añadir timeline/asignación a pedidos.
- Crear movimientos de inventario y reconciliar saldos.
- Crear eventos de auditoría.
- Crear reclamaciones evolucionadas.
- Crear eventos financieros y turnos de caja.
- Crear outbox de notificaciones.
- Crear índices de búsqueda/paginación.

## 8. Estrategia de ramas y PRs

Orden sugerido:

1. `release/payment-pos-baseline`
2. `fix/security-stock-integrity`
3. `feature/order-workflow`
4. `feature/order-inventory-link`
5. `feature/admin-team-management`
6. `feature/complaints-e2e`
7. `feature/finance-cashier`
8. `feature/notifications-reports-rush`
9. `quality/frontend-e2e-ci`
10. `ops/immutable-release-observability`

Cada PR debe:

- ser cohesivo;
- incluir SPEC/contrato actualizado;
- incluir migración si aplica;
- incluir pruebas positivas y negativas;
- pasar auditoría de secretos;
- documentar rollback;
- no mezclar cambios de Rovi u otros proyectos.

## 9. Gate de despliegue por fase

Antes:

- Confirmar rama/SHA e imágenes.
- Crear backup y registrar checksum/identificador.
- Validar recursos VPS y servicios existentes.
- Ejecutar tests, build y E2E en aislado.
- Validar Compose y Nginx sin aplicar cambios.
- Preparar rollback a imágenes anteriores.

Durante:

- Construir secuencialmente para evitar presión de memoria.
- Aplicar migración compatible antes del corte cuando corresponda.
- Reemplazar sólo servicios LaundryVibes con identidad Compose explícita.
- No ejecutar `docker compose down` sobre proyectos ajenos.

Después:

- Verificar health local y público.
- Ejecutar smoke autenticado de cliente, worker y admin con fixtures controlados.
- Revisar logs, OOM y reinicios.
- Verificar assets, Socket.IO y endpoints privados.
- Ejecutar smoke de `rovicrm.com` y servicios críticos existentes.
- Mantener ventana de observación antes de retirar rollback.

## 10. Orden de prioridad si hay que recortar alcance

No recortar:

1. Integridad atómica de inventario.
2. Rate limiting/sesiones/bootstrap.
3. Máquina de estados y auditoría.
4. Gestión de trabajadores.
5. Reclamaciones E2E.
6. Pruebas E2E, backups y rollback.

Se puede posponer sin falsear el producto:

1. Daily Rush avanzado; puede ocultarse mientras no exista.
2. PDF sofisticado; CSV puede ser primera entrega.
3. Redis para Socket.IO mientras haya una sola réplica.
4. Proveedores de pago reales.
5. Offline y app nativa.

## 11. Primer incremento ejecutable recomendado

El primer PR debe ser exclusivamente `fix/security-stock-integrity` y contener:

1. Rate limiting único para todos los logins.
2. Validación compartida de credenciales.
3. `active` + `tokenVersion` y revocación básica.
4. Bootstrap admin idempotente.
5. `bagNumber` normalizado.
6. Consumo/reposición atómicos.
7. Seed de inventario fuera del GET e índice único.
8. Pruebas de concurrencia con Mongo real.
9. Auditoría mínima de acciones sensibles.
10. Actualización de README/runbook.

No mezclar todavía máquina de estados, reclamaciones o caja. Ese PR establece la base segura sobre la cual construir el resto del E2E.
