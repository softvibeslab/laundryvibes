# Plan: landing page comercial de LaundryVibes

## Objetivo

Convertir la ruta pública principal de LaundryVibes en una landing page que explique con claridad:

- Qué problema resuelve el sistema.
- Qué puede hacer cada perfil.
- Cómo se usa durante una jornada normal.
- Cómo reduce trabajo manual, errores y tiempos de respuesta.
- Qué funciones están disponibles hoy y cuáles no deben anunciarse todavía.
- Cómo registrarse o iniciar sesión sin perder el acceso actual.

La creación del administrador inicial se mantiene como una operación posterior, separada y sujeta a respaldo, creación, almacenamiento de credenciales y verificación independientes.

## Público objetivo

### Dueño o gerente de lavandería

Busca control de operación, visibilidad de pedidos, inventario y desempeño. La página debe mostrarle cómo sustituir hojas, mensajes y seguimiento manual por un flujo centralizado.

### Trabajador operativo

Necesita saber qué pedidos están pendientes, quién es el cliente, qué debe completar y qué insumos requieren atención.

### Cliente

Quiere registrarse, enviar su pedido, consultar su estado e historial, actualizar sus datos y reportar un problema sin llamar o enviar mensajes por separado.

### Administrador

Puede operar pedidos e inventario y crear trabajadores desde el backend. La landing no debe prometer una consola administrativa dedicada porque todavía no existe.

## Decisión de navegación

### Ruta principal

- Convertir `/` en la landing pública.
- Añadir `/access` para el selector actual de User, Worker y Admin, o integrar esas tarjetas en la sección de perfiles de la landing.
- Mantener sin cambios `/login`, `/registration` y las rutas protegidas existentes.

### CTAs principales

- `Crear cuenta` → `/registration`.
- `Iniciar sesión` → `/login`.
- `Conocer cómo funciona` → ancla `#como-funciona`.
- `Ver perfiles` → ancla `#perfiles`.

No añadir un CTA de contratación, demo o contacto hasta tener un destino real para esos leads.

## Mensaje central

### Propuesta de hero

Título:

> Tu lavandería, organizada de principio a fin

Subtítulo:

> LaundryVibes reúne pedidos, clientes, operación e inventario en un solo lugar. El cliente solicita el servicio, el equipo atiende el pedido y el negocio mantiene visibilidad de cada movimiento.

Apoyos concretos:

- Pedidos e historial centralizados.
- Roles separados para clientes y operación.
- Inventario con consumo, reposición y alertas.
- Actualizaciones de pedidos en tiempo real.

El copy debe hablar de resultados operativos concretos, no de "revolucionar", "transformar" o afirmaciones cuantitativas que aún no tienen datos medidos.

## Arquitectura de contenido

### 1. Header

Contenido:

- Logotipo/nombre LaundryVibes.
- Enlaces ancla: Funciones, Perfiles, Día a día, Beneficios.
- Botón secundario: Iniciar sesión.
- Botón principal: Crear cuenta.
- Menú móvil accesible.

Comportamiento:

- Header fijo con fondo translúcido al hacer scroll.
- Navegación por teclado.
- Estado visible de foco.
- Sin dropdowns innecesarios.

### 2. Hero

Elementos:

- Título y propuesta de valor.
- Dos CTAs.
- Captura o mockup realista del dashboard, construido con componentes/CSS propios.
- Franja de confianza con capacidades reales: JWT/RBAC, pedidos en tiempo real, inventario y acceso web.

Evitar imágenes genéricas de lavanderías si no explican el producto.

### 3. El problema operativo

Presentar situaciones reconocibles:

- Pedidos repartidos entre mensajes y notas.
- Dificultad para saber qué está pendiente o completado.
- Clientes preguntando por el estado.
- Inventario que se repone demasiado tarde.
- Datos duplicados entre atención y operación.

Cerrar con la transición al sistema: un flujo compartido y roles claros.

### 4. Funciones principales

Crear una cuadrícula con seis bloques:

1. Gestión de pedidos
   - Alta por el cliente.
   - Historial propio.
   - Vista operacional global.
   - Finalización por worker/admin.

2. Clientes y perfiles
   - Registro y login.
   - Datos de edificio, habitación y bolsa.
   - Actualización de perfil y contraseña.

3. Operación en tiempo real
   - Evento de actualización cuando entra o cambia un pedido.
   - Refresco del panel de trabajo.

4. Inventario
   - Existencia actual.
   - Consumo y reposición.
   - Alertas y estimación de agotamiento.
   - Analítica e historial.

5. Reclamaciones
   - Captura de tipo y descripción.
   - Asociación automática al cliente y bolsa.

6. Notificaciones
   - SMS opcional al completar pedidos.
   - Recuperación de contraseña por correo cuando SMTP está configurado.

Cada bloque debe enlazar la función con una consecuencia práctica, sin inventar métricas.

### 5. Perfiles

Usar tres tarjetas o tabs.

#### Cliente

Puede:

- Crear su cuenta.
- Iniciar sesión.
- Consultar y editar su perfil.
- Enviar pedidos.
- Consultar el historial.
- Crear reclamaciones.
- Recibir actualización cuando su pedido cambia.

#### Worker

Puede:

- Consultar todos los pedidos.
- Buscar por número de bolsa.
- Marcar pedidos como completados.
- Consultar y operar el inventario.
- Registrar consumo y reposición.
- Revisar alertas y analítica.

#### Admin

Puede hoy:

- Acceder a las vistas operativas permitidas a worker/admin.
- Administrar pedidos e inventario.
- Crear cuentas worker mediante la API protegida.

Aclaración de producto:

- La consola administrativa dedicada todavía está pendiente.
- No mostrar botones que lleven a una ruta admin inexistente.

### 6. Así funciona en el día a día

Contar una jornada en seis pasos:

1. El cliente se registra y mantiene sus datos de contacto, ubicación y bolsa.
2. Envía un pedido con cantidad de prendas y peso.
3. El equipo ve el nuevo pedido en su panel.
4. El trabajador procesa la orden y controla los insumos consumidos.
5. Al completar el pedido, el sistema actualiza los paneles y puede enviar un SMS.
6. El cliente consulta su historial o crea una reclamación si necesita seguimiento.

Representación visual:

- Timeline horizontal en desktop.
- Timeline vertical en móvil.
- Conectar cada paso con el perfil responsable.

### 7. Cómo mejora el negocio

Presentar beneficios verificables por diseño del sistema:

- Una sola fuente para pedidos y clientes.
- Menos captura repetida: el sistema toma el propietario del JWT y los datos guardados del perfil.
- Separación de responsabilidades por rol.
- Visibilidad de pendientes y completados.
- Menor dependencia de llamadas para consultar historial.
- Reposición más oportuna gracias a umbrales y alertas de stock.
- Seguimiento más consistente mediante historial y eventos de actualización.
- Acceso desde navegador sin instalar software de escritorio.

No publicar porcentajes de ahorro, crecimiento o reducción de errores hasta medirlos con analítica real.

### 8. Seguridad y confiabilidad

Sección corta y comprensible:

- Acceso con JWT y permisos por rol.
- Contraseñas cifradas con bcrypt.
- Conexiones HTTPS.
- Base de datos dedicada.
- Servicios internos expuestos sólo por el proxy.
- Healthchecks de aplicación y base de datos.

No saturar la landing con detalles de infraestructura; enlazar al README para información técnica.

### 9. Estado del producto

Incluir una pequeña distinción honesta:

Disponible:

- Clientes, perfiles, pedidos, reclamaciones, operación, inventario y tiempo real.

Próximamente:

- Consola admin dedicada.
- Flujo completo de estados `In Progress` y `Delivered`.
- Pagos integrados.
- Gestión de reclamaciones.
- Reportes operativos descargables.

Esto evita que una maqueta se interprete como una promesa contractual.

### 10. CTA final

Título:

> Empieza a organizar tus pedidos desde hoy

Acciones:

- Crear cuenta.
- Iniciar sesión.

No usar formularios de contacto simulados.

### 11. Footer

- LaundryVibes.
- Enlace a la aplicación.
- Acceso.
- Documentación técnica en GitHub.
- Aviso de privacidad y términos sólo si existen páginas reales; de lo contrario, dejarlos como tarea antes de una campaña comercial.

## Dirección visual

### Personalidad

- Limpia, operativa y moderna.
- Debe sentirse como software para un negocio real, no como una plantilla genérica SaaS.
- Visuales inspirados en textiles, etiquetas de ropa, ciclos y organización, sin caer en ilustraciones infantiles.

### Paleta propuesta

- Azul tinta: confianza y contraste.
- Azul lavado: fondos y superficies.
- Turquesa moderado: acciones y estado activo.
- Verde: completado/saludable.
- Ámbar: alertas de inventario.
- Blanco roto: fondo principal.

Mantener contraste WCAG AA para texto y controles.

### Tipografía

- Sans serif legible para interfaz y cuerpo.
- Una segunda familia opcional para titulares, sin aumentar peso de carga innecesariamente.
- Escala fluida con `clamp()`.

### Componentes

- `LandingHeader`
- `HeroSection`
- `ProductPreview`
- `ProblemSection`
- `FeaturesGrid`
- `ProfilesSection`
- `DailyWorkflow`
- `BusinessBenefits`
- `SecuritySection`
- `ProductStatus`
- `FinalCTA`
- `LandingFooter`

## Estrategia técnica

### Archivos previstos

- `Frontend/src/App.jsx`: registrar la nueva raíz y, si se requiere, `/access`.
- `Frontend/src/Component/Landing/LandingPage.jsx`: composición principal.
- `Frontend/src/Component/Landing/LandingHeader.jsx`.
- `Frontend/src/Component/Landing/HeroSection.jsx`.
- `Frontend/src/Component/Landing/FeaturesSection.jsx`.
- `Frontend/src/Component/Landing/ProfilesSection.jsx`.
- `Frontend/src/Component/Landing/DailyWorkflow.jsx`.
- `Frontend/src/Component/Landing/BusinessBenefits.jsx`.
- `Frontend/src/Component/Landing/LandingFooter.jsx`.
- `Frontend/src/Component/Landing/landing.css` o clases Tailwind consistentes.
- `Frontend/src/assets/landing/`: únicamente imágenes optimizadas y necesarias.
- `README.md`: añadir la landing a la wiki después de verificarla.

La implementación puede agrupar secciones pequeñas en menos archivos si no aportan reutilización. Evitar un componente por cada párrafo.

### Datos y backend

- La primera versión será estática y no necesita endpoints nuevos.
- No leer información sensible ni datos reales para poblar el hero.
- Si se muestran pedidos o métricas, usar datos ficticios marcados como demostración.
- No incorporar formularios que no tengan un backend real.

### Compatibilidad

- Mantener las rutas de login, registro y portales existentes.
- No cambiar JWT, MongoDB, Socket.IO ni Compose.
- No reiniciar Rovi ni otros proyectos.
- Para publicar, reconstruir sólo `laundryvibes-frontend`.

## SEO y metadatos

- Título: `LaundryVibes | Pedidos, operación e inventario para lavanderías`.
- Meta description específica y sin promesas no medidas.
- Open Graph básico.
- Canonical a `https://laundryvibes.rovicrm.com/`.
- Idioma del documento a `es` si la landing se publica en español.
- Jerarquía de un solo `h1`.
- Texto alternativo útil.
- Datos estructurados sólo si corresponden a una entidad real y verificable.

## Accesibilidad

- Navegación completa por teclado.
- Focus visible.
- Menú móvil con `aria-expanded` y cierre por Escape.
- Contraste AA.
- Orden de headings correcto.
- Respeto por `prefers-reduced-motion`.
- Botones y enlaces con nombres descriptivos.
- Evitar carruseles automáticos.

## Rendimiento

- Evitar librerías nuevas para animaciones.
- Usar CSS y componentes existentes.
- Imágenes WebP/AVIF con dimensiones explícitas.
- Lazy loading debajo del fold.
- Sin video automático.
- Objetivos orientativos en móvil:
  - Lighthouse Performance >= 90.
  - Accessibility >= 95.
  - Best Practices >= 95.
  - SEO >= 95.
  - Sin errores de consola.

## Secuencia de implementación

### Fase 1: contenido y estructura

1. Confirmar URL raíz y CTAs.
2. Crear el mapa de mensajes y copy final.
3. Marcar cada capacidad como disponible o pendiente.
4. Crear la composición semántica sin animaciones.
5. Preservar el selector/acceso actual.

Criterio de salida:

- Todo el contenido se entiende sin imágenes.
- Ninguna función pendiente se vende como terminada.

### Fase 2: sistema visual

1. Definir tokens de color, tipografía, radios, sombras y espacios.
2. Diseñar hero y preview del producto.
3. Construir cards, tabs/tarjetas de perfiles y timeline.
4. Ajustar desktop, tablet y móvil.
5. Añadir movimiento discreto con fallback reduced-motion.

Criterio de salida:

- La landing se distingue visualmente de una plantilla genérica.
- No rompe estilos de los portales existentes.

### Fase 3: integración

1. Registrar rutas.
2. Conectar CTAs a destinos reales.
3. Configurar metadatos.
4. Añadir enlaces del footer.
5. Mantener same-origin y navegación SPA.

Criterio de salida:

- Registro, login y portales siguen accesibles.
- Refresh directo de la landing funciona detrás de Nginx.

### Fase 4: verificación

1. Ejecutar ESLint y build.
2. Revisar 360, 768, 1024 y 1440 px.
3. Probar Chrome/Chromium con navegación real.
4. Revisar consola y peticiones fallidas.
5. Probar teclado, foco y reduced-motion.
6. Validar enlaces y CTAs.
7. Ejecutar Lighthouse.
8. Confirmar que el backend y `/api/health/ready` siguen saludables.

Criterio de salida:

- 0 errores de build.
- 0 errores nuevos de ESLint.
- 0 errores JavaScript en navegación.
- CTAs y rutas pasan smoke test.
- No hay regresiones en login, registro o dashboards.

### Fase 5: publicación aislada

1. Crear una rama limpia para la landing.
2. Revisar diff y escanear secretos.
3. Commit y push.
4. Construir sólo la imagen frontend.
5. Registrar el ID de imagen previo para rollback.
6. Reemplazar únicamente `laundryvibes-frontend`.
7. Verificar landing pública y aplicación autenticada.
8. Confirmar que backend, Hermes y otros servicios continúan saludables.
9. Actualizar README con capturas y descripción final.

Rollback:

- Volver a etiquetar/levantar la imagen frontend anterior.
- No tocar Atlas, backend ni datos.

## Pruebas de aceptación

### Contenido

- Explica qué es LaundryVibes en menos de diez segundos.
- Describe funciones, perfiles y flujo diario.
- Relaciona cada módulo con un beneficio operativo.
- No publica funciones inexistentes como disponibles.
- No incluye métricas inventadas.

### Navegación

- Crear cuenta abre `/registration`.
- Iniciar sesión abre `/login`.
- Todos los enlaces ancla llegan a la sección correcta.
- User y worker conservan sus accesos actuales.
- Admin no recibe un enlace roto.

### Calidad

- Responsive sin overflow horizontal.
- Contraste y foco accesibles.
- Sin errores de consola.
- Build reproducible.
- Sin secretos ni datos personales.
- Healthchecks de producción continúan en verde.

## Entregables

1. Landing page pública en la raíz.
2. Componentes fuente y estilos.
3. Assets optimizados.
4. Metadatos SEO/Open Graph.
5. Evidencia de responsive, consola y Lighthouse.
6. README actualizado.
7. Commit y URL del repositorio.
8. Despliegue verificado en `https://laundryvibes.rovicrm.com`.
9. Registro del rollback del frontend.

## Orden respecto al administrador inicial

1. Diseñar, implementar y publicar la landing.
2. Verificar que login y roles no sufrieron regresiones.
3. Crear respaldo acotado de `workers`.
4. Crear el administrador con un proceso auditable e idempotente.
5. Guardar credenciales en un archivo privado modo 600.
6. Verificar login y rol por la ruta pública.

La landing y el bootstrap de administrador deben permanecer como cambios independientes para facilitar auditoría y rollback.
