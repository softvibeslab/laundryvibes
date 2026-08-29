# Plan de implementación — LaundryVibes pagos POS y evolución de roles

Base: `feature/brand-seo-geo`
Rama: `feature/payment-settings-pos`
SPECs: `docs/specs/role-evolution.md`, `docs/specs/payment-settings-pos.md`

## Entrega actual: Fase A

### 1. Dominio y contratos

- Crear modelo singleton de configuración comercial.
- Extender pedido con snapshot de precio y pago.
- Crear utilidades de configuración, formato y validación.
- Excluir evidencia de todos los listados.

Verificación:
- Defaults MXN/60 y tres métodos manuales.
- Al menos un método activo.
- Proveedores futuros inmutables.

### 2. API administrativa

- `GET /api/payments/config` para roles autenticados.
- `PUT /api/admin/payment-config` sólo admin.
- Guardar actor y fecha del cambio.

Verificación:
- user/worker reciben 403 en PUT.
- valores inválidos reciben 400.

### 3. Pedido y pago de cliente

- Aceptar formulario multipart.
- Calcular precio en servidor.
- Validar método contra configuración.
- Exigir evidencia en transferencia/tarjeta.
- Persistir registro inicial con estado correcto.

Verificación:
- efectivo sin archivo funciona.
- transferencia/tarjeta sin archivo falla.
- método desactivado falla.

### 4. POS operativo

- Endpoint para worker/admin.
- Registrar actor, fuente POS y estado pagado.
- Impedir sobreescritura de pago ya pagado.
- Endpoint autenticado de evidencia con control de propiedad.

Verificación:
- worker/admin funcionan.
- user recibe 403 en POS.
- cliente ajeno no descarga evidencia.

### 5. UI administrativa

- Sección “Pagos y moneda” en configuración.
- MXN y precio por kg.
- Toggles para Efectivo/Transferencia/Tarjeta.
- PayPal/Mercado Pago/Stripe como tarjetas bloqueadas “Próximamente”.
- Estados de guardado y errores accesibles.

### 6. UI de cliente

- Eliminar UPI, rupias y QR roto.
- Cargar configuración.
- Mostrar total en MXN.
- Mostrar sólo métodos activos.
- Evidencia condicionada.
- Enviar pedido y pago en un solo formulario.
- Mostrar método/estado/total en historial y confirmación.

### 7. UI worker/admin

- Mostrar pago en cada pedido.
- Modal POS manual.
- Métodos activos y evidencia condicionada.
- Refrescar pedido después del registro.

### 8. Documentación y calidad

- Actualizar README y llms.txt con alcance honesto.
- Pruebas unitarias/API de RBAC, defaults, validación y evidencia.
- Lint, build, `node --check`, `git diff --check` y escaneo de secretos.
- Revisión visual en admin, worker y cliente.

### 9. Publicación y despliegue

- Revisión independiente del diff.
- Commit cohesivo y push.
- PR dependiente contra `feature/brand-seo-geo` para mostrar sólo esta fase.
- Backup acotado de colecciones afectadas.
- Etiquetar imágenes de rollback.
- Desplegar backend y frontend secuencialmente, sin tocar Rovi.
- Smoke público por roles.

## Entregas posteriores

Las fases B–F y criterios están en `docs/specs/role-evolution.md`. Cada fase debe abrir una rama y SPEC operativa propia; no deben mezclarse cobro real, CFDI ni datos de tarjeta con el POS manual.
