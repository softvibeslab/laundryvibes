# SPEC — Configuración de pagos y registro POS manual

Estado: Aprobada para implementación inicial
Fecha: 2026-08-29

## 1. Resultado esperado

LaundryVibes permite que un administrador configure moneda, tarifa por kilogramo y métodos manuales aceptados. Cliente, trabajador y administrador ven la misma configuración efectiva. Un trabajador puede registrar un pago POS y un cliente puede declarar su método al crear el pedido.

No se procesa dinero. El sistema sólo registra la operación y su evidencia.

## 2. Terminología

- Método manual: `cash`, `transfer`, `card`.
- Proveedor futuro: PayPal, Mercado Pago o Stripe; visible pero no accionable.
- POS manual: registro de un pago recibido fuera de LaundryVibes.
- Evidencia: imagen o PDF asociado a transferencia o tarjeta.
- Estado de pago:
  - `pending`: seleccionado, todavía no pagado/validado.
  - `pending_review`: evidencia enviada por cliente y pendiente de revisión.
  - `paid`: pago registrado por worker/admin.
  - `unpaid`: pedido sin registro de pago.

## 3. Configuración

### Valores iniciales

- Moneda: `MXN`.
- Locale: `es-MX`.
- Precio por kg: 60.00 MXN.
- Efectivo: activo.
- Transferencia: activo.
- Tarjeta: activo.
- PayPal: próximamente.
- Mercado Pago: próximamente.
- Stripe: próximamente.

### Reglas

1. Sólo admin puede modificar configuración.
2. Debe quedar al menos un método manual activo.
3. El código de moneda usa tres letras ISO 4217; la primera interfaz soporta MXN.
4. El precio por kg debe ser mayor que cero y tener máximo dos decimales.
5. Proveedores futuros no pueden activarse mediante esta versión.
6. Cada cambio conserva `updatedBy` y `updatedAt`.

## 4. Cálculo

El backend calcula:

`total = round(weight * pricePerKg, 2)`

El frontend sólo presenta la cotización devuelta o calculada a partir de configuración para previsualización. Al guardar, el backend vuelve a calcular y persiste snapshot de moneda y tarifa.

No hay conversión de moneda ni impuestos en esta fase.

## 5. Creación de pedido por cliente

1. Cliente consulta configuración efectiva.
2. Selecciona un método activo.
3. Para efectivo, no adjunta evidencia; el pago queda `pending`.
4. Para transferencia o tarjeta, adjunta imagen/PDF; queda `pending_review`.
5. Backend rechaza métodos deshabilitados.
6. Backend rechaza transferencia/tarjeta sin evidencia.
7. Pedido guarda snapshot financiero y registro inicial de pago.

La tarjeta es registro manual; LaundryVibes no solicita ni almacena PAN, CVV, fecha de expiración o datos de tarjeta.

## 6. Registro POS por worker/admin

1. El operador abre un pedido.
2. Ve total, moneda, estado y métodos actualmente activos.
3. Selecciona método.
4. Transferencia/tarjeta requieren evidencia.
5. Efectivo no requiere evidencia.
6. Backend establece `paid`, `source=pos`, actor y timestamp.
7. Un pago `paid` no puede sobrescribirse en esta fase.
8. Admin podrá corregir/anular en una fase financiera posterior.

## 7. Evidencia

- Formatos: JPEG, PNG, WebP o PDF.
- Tamaño máximo: 2 MiB.
- Se guarda dentro del documento del pedido en esta primera versión para persistir con MongoDB Atlas y evitar almacenamiento efímero del contenedor.
- Nunca se incluye el binario en listados ni DTOs.
- Descarga sólo con JWT:
  - cliente propietario del pedido;
  - worker o admin.
- Cabeceras: tipo seguro, `nosniff`, disposición inline y caché privada.

## 8. API

### `GET /api/payments/config`
Roles: user, worker, admin.

Respuesta:

```json
{
  "currency": "MXN",
  "locale": "es-MX",
  "pricePerKg": 60,
  "methods": [
    { "id": "cash", "label": "Efectivo", "enabled": true, "requiresEvidence": false },
    { "id": "transfer", "label": "Transferencia", "enabled": true, "requiresEvidence": true },
    { "id": "card", "label": "Tarjeta", "enabled": true, "requiresEvidence": true }
  ],
  "comingSoon": ["PayPal", "Mercado Pago", "Stripe"]
}
```

### `PUT /api/admin/payment-config`
Rol: admin.

Campos: `currency`, `pricePerKg`, `methods`.

### `POST /api/user/submit-order`
Rol: user. `multipart/form-data`.

Campos: `numberOfClothes`, `weight`, `paymentMethod`, `evidence?`.

### `PATCH /api/worker/orders/:orderId/payment`
Roles: worker, admin. `multipart/form-data`.

Campos: `paymentMethod`, `evidence?`.

### `GET /api/payments/orders/:orderId/evidence`
Roles: propietario user, worker, admin.

## 9. DTO de pedido

```json
{
  "pricing": {
    "currency": "MXN",
    "pricePerKg": 60,
    "total": 120
  },
  "payment": {
    "method": "transfer",
    "methodLabel": "Transferencia",
    "status": "pending_review",
    "statusLabel": "Pendiente de revisión",
    "source": "client",
    "evidenceAvailable": true,
    "recordedAt": "..."
  }
}
```

El DTO no expone datos binarios ni identificadores internos innecesarios.

## 10. Criterios de aceptación

- No existe texto, icono o identificador UPI en código visible/documentación activa.
- MXN se presenta con `Intl.NumberFormat('es-MX', { currency: 'MXN' })`.
- Admin puede activar/desactivar Efectivo, Transferencia y Tarjeta, conservando al menos uno.
- Cliente y trabajador sólo pueden elegir métodos activos.
- PayPal, Mercado Pago y Stripe dicen “Próximamente” y no son clicables.
- Transferencia/tarjeta sin evidencia reciben HTTP 400.
- Método deshabilitado recibe HTTP 400 aunque se fuerce por API.
- User no puede cambiar configuración ni registrar POS.
- Worker no puede cambiar configuración.
- Evidencia ajena no es accesible por un cliente.
- Listados no contienen binarios.
- Pruebas backend, lint y build pasan.
