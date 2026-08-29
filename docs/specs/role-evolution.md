# SPEC — Evolución de perfiles de LaundryVibes

Estado: Propuesta versionada
Fecha: 2026-08-29
Producto: LaundryVibes

## 1. Objetivo

Convertir los perfiles actuales en herramientas de trabajo diferenciadas, sin inventar permisos ni mezclar responsabilidades.

- Administrador: configura el negocio, supervisa resultados, controla accesos y resuelve excepciones.
- Trabajador: ejecuta la operación diaria con el menor número posible de pasos.
- Cliente: crea pedidos, consulta su avance y registra la forma de pago disponible.

## 2. Principios

1. El backend es la autoridad de permisos, precios, moneda y estados.
2. Cada acción sensible conserva actor, fecha y contexto de origen.
3. Los proveedores no integrados deben decir “Próximamente”; nunca simular un cobro exitoso.
4. Los controles del trabajador deben optimizar velocidad, legibilidad móvil y prevención de errores.
5. El cliente sólo ve opciones habilitadas por administración.
6. Los datos financieros nunca dependen únicamente de cálculos del navegador.

## 3. Perfil administrador

### 3.1 Mejoras recomendadas

#### Configuración del negocio
- Moneda, precio por kilogramo, pedido mínimo e impuestos.
- Métodos de pago habilitados.
- Datos de transferencia y texto de instrucciones.
- Horarios, capacidad diaria y zonas/edificios atendidos.
- Plantillas de mensajes y reglas de notificación.

#### Gestión operativa
- Panel con pedidos por estado, atraso, carga diaria y tiempo promedio.
- Vista de excepciones: pagos pendientes de revisión, pedidos atrasados, inventario crítico y reclamaciones abiertas.
- Reasignación de pedidos y responsables.
- Ajustes controlados de monto con motivo obligatorio.

#### Equipo y seguridad
- Listar, invitar, editar, suspender y reactivar trabajadores.
- Restablecimiento seguro de contraseña y cierre de sesiones.
- Matriz de permisos por capacidad cuando existan más roles.
- Bitácora de accesos y acciones sensibles.

#### Finanzas y cierre
- Historial de pagos y filtros por método, estado, fecha y trabajador.
- Cierre de caja por turno: esperado, contado y diferencia.
- Reembolsos/anulaciones con motivo y autorización.
- Exportaciones CSV/PDF y conciliación de transferencias.

#### Calidad y clientes
- Bandeja de reclamaciones con responsable, prioridad y SLA.
- Historial unificado del cliente.
- Etiquetas, notas internas y alertas de clientes frecuentes.

### 3.2 Criterio de UX

La portada administrativa debe priorizar “qué necesita atención ahora”, no repetir el dashboard del trabajador. Sus bloques principales deben ser excepciones, métricas, caja, equipo y configuración.

## 4. Perfil trabajador

### 4.1 Mejoras recomendadas

#### Flujo operativo
- Cola “Por recibir / En proceso / Listo / Entregado”.
- Cambio de estado en un toque con confirmación sólo en acciones irreversibles.
- Búsqueda por bolsa, cliente, habitación, teléfono o identificador.
- Detalle compacto con instrucciones, prendas, peso, responsable y timestamps.
- Escaneo QR/código de bolsa como mejora futura.

#### POS y caja
- Ver métodos habilitados por administración.
- Registrar pago en efectivo, transferencia o tarjeta.
- Evidencia obligatoria para transferencia y tarjeta.
- Importe calculado por servidor y moneda visible.
- Historial del pago y estado de revisión.
- Cierre de turno y arqueo como fase posterior.

#### Inventario
- Descuento de insumos ligado a completar un pedido.
- Sugerencias de consumo según peso/servicio.
- Alertas visibles sin entrar a otra pantalla.
- Correcciones con motivo y bitácora.

#### Productividad
- Vista móvil y botones grandes.
- Filtros guardados por turno.
- Indicadores personales: pedidos completados y pendientes.
- Modo de conectividad degradada sólo en una fase con sincronización diseñada explícitamente.

### 4.2 Límites

El trabajador no configura moneda, precios, métodos de pago, cuentas ni permisos. Tampoco puede eliminar pagos; sólo registrar o solicitar corrección.

## 5. Perfil cliente

### 5.1 Mejoras recomendadas

- Cotización autoritativa antes de confirmar.
- Métodos de pago habilitados por el negocio.
- Instrucciones específicas por método.
- Evidencia para transferencia o tarjeta manual.
- Estado separado de pedido y pago.
- Línea de tiempo del pedido.
- Comprobante descargable después de validación.
- Repetir un pedido anterior.
- Preferencias de comunicación y notificaciones.
- Reclamación vinculada a un pedido específico.

## 6. Roadmap consolidado

### Fase A — Base comercial y POS
- Configuración de moneda/precio/métodos.
- Registro POS manual.
- Evidencia protegida.
- Estado de pago visible por rol.
- Retiro completo de UPI.

### Fase B — Operación real
- Nuevo pedido operativo persistente.
- Estados completos y línea de tiempo.
- Ordenación/filtros reales.
- Asignación de trabajador.
- Consumo de inventario conectado al pedido.

### Fase C — Administración de equipo
- Listar/editar/suspender trabajadores.
- Cambio y recuperación de contraseña operativa.
- Auditoría de acciones.
- Seeder/bootstrap versionado del primer administrador.

### Fase D — Finanzas
- Historial y conciliación de pagos.
- Caja/turnos.
- Comprobantes.
- Ajustes, anulaciones y reembolsos.
- Exportación de reportes.

### Fase E — Servicio y automatización
- Reclamaciones E2E.
- Notificaciones configurables.
- Daily Rush real.
- SMTP/Twilio con observabilidad.
- Proveedores de pago reales sólo después de evaluación técnica y contractual.

### Fase F — Calidad técnica
- Pruebas frontend E2E.
- Code splitting y reducción de bundle.
- Actualización de Browserslist.
- Limpieza de warnings.
- Prerender/SSR de páginas públicas.

## 7. Fuera de alcance inmediato

- Cobros reales con PayPal, Mercado Pago o Stripe.
- Almacenamiento de números de tarjeta.
- Conversión de divisas.
- Facturación fiscal CFDI.
- Operación offline.

Esos elementos requieren SPEC propia de seguridad, conciliación, cumplimiento y recuperación ante fallos.
