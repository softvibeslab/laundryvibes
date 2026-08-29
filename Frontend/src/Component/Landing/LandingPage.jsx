import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Boxes,
  Check,
  ChevronRight,
  CircleUserRound,
  ClipboardCheck,
  Clock3,
  Gauge,

  LayoutDashboard,
  LockKeyhole,
  Menu,
  MessageSquareWarning,
  PackageCheck,
  PackageOpen,
  RefreshCw,
  ShieldCheck,
  Shirt,
  Smartphone,
  UsersRound,
  Warehouse,
  X,
} from 'lucide-react';
import BrandLogo from '../Brand/BrandLogo';
import './landing.css';

const features = [
  {
    icon: PackageOpen,
    kicker: 'Pedidos',
    title: 'Cada orden, en el mismo flujo',
    description: 'El cliente registra prendas y peso. El equipo recibe el pedido, consulta sus datos y actualiza su estado desde un panel compartido.',
    accent: 'blue',
  },
  {
    icon: CircleUserRound,
    kicker: 'Clientes',
    title: 'Perfiles que evitan capturas repetidas',
    description: 'Teléfono, edificio, habitación y número de bolsa quedan ligados a la cuenta para que cada pedido llegue con el contexto correcto.',
    accent: 'mint',
  },
  {
    icon: RefreshCw,
    kicker: 'Tiempo real',
    title: 'La operación se mantiene al día',
    description: 'Cuando entra o se completa un pedido, Socket.IO avisa a las vistas autorizadas para actualizar la información.',
    accent: 'violet',
  },
  {
    icon: Boxes,
    kicker: 'Inventario',
    title: 'Insumos bajo control',
    description: 'Registra consumo y reposición, revisa umbrales, alertas, promedio diario y fecha estimada de agotamiento.',
    accent: 'amber',
  },
  {
    icon: MessageSquareWarning,
    kicker: 'Atención',
    title: 'Reclamaciones con contexto',
    description: 'El sistema relaciona cada reporte con el cliente, su bolsa y ubicación para dar seguimiento sin reconstruir la historia.',
    accent: 'coral',
  },
  {
    icon: BellRing,
    kicker: 'Notificaciones',
    title: 'Avisos donde hacen falta',
    description: 'El envío opcional de SMS informa que un pedido fue completado. El correo permite recuperar el acceso cuando SMTP está configurado.',
    accent: 'navy',
  },
];

const profiles = [
  {
    id: 'cliente',
    icon: CircleUserRound,
    label: 'Cliente',
    title: 'Solicita y consulta sin llamadas',
    description: 'Una experiencia sencilla para crear pedidos, revisar el historial, mantener los datos actualizados y reportar una incidencia.',
    items: ['Registro y acceso propio', 'Perfil, bolsa y ubicación', 'Pedidos e historial', 'Reclamaciones'],
    cta: 'Crear cuenta',
    to: '/registration',
  },
  {
    id: 'worker',
    icon: Shirt,
    label: 'Trabajador',
    title: 'El trabajo del día, visible',
    description: 'El equipo encuentra pedidos pendientes, busca por bolsa, completa órdenes y registra movimientos de inventario.',
    items: ['Panel de operación', 'Gestión de pedidos', 'Consumo y reposición', 'Alertas de inventario'],
    cta: 'Acceso del equipo',
    to: '/login',
  },
  {
    id: 'admin',
    icon: ShieldCheck,
    label: 'Administrador',
    title: 'Control operativo con permisos',
    description: 'El rol administrador comparte las vistas de operación e inventario y puede habilitar cuentas de trabajador mediante la API protegida.',
    items: ['Permisos por rol', 'Pedidos globales', 'Inventario y analítica', 'Alta protegida de trabajadores'],
    cta: 'Acceso administrativo',
    to: '/login',
    note: 'La gestión completa para editar o desactivar cuentas está en la hoja de ruta.',
  },
];

const workflow = [
  {
    number: '01',
    actor: 'Cliente',
    icon: CircleUserRound,
    title: 'Registra sus datos',
    description: 'Crea su cuenta con contacto, ubicación y número de bolsa.',
  },
  {
    number: '02',
    actor: 'Cliente',
    icon: PackageOpen,
    title: 'Envía el pedido',
    description: 'Indica la cantidad de prendas y el peso de la carga.',
  },
  {
    number: '03',
    actor: 'Sistema',
    icon: RefreshCw,
    title: 'Actualiza la operación',
    description: 'El panel del equipo recibe el nuevo pedido y sus datos asociados.',
  },
  {
    number: '04',
    actor: 'Trabajador',
    icon: Shirt,
    title: 'Procesa y registra',
    description: 'Atiende la orden y descuenta los insumos utilizados.',
  },
  {
    number: '05',
    actor: 'Sistema',
    icon: BellRing,
    title: 'Cierra y notifica',
    description: 'Actualiza el estado y puede enviar un SMS al cliente.',
  },
  {
    number: '06',
    actor: 'Negocio',
    icon: BarChart3,
    title: 'Conserva el historial',
    description: 'Pedidos, movimientos y alertas quedan disponibles para consulta.',
  },
];

const benefits = [
  {
    icon: LayoutDashboard,
    title: 'Una sola vista de la operación',
    description: 'Pedidos, clientes e inventario dejan de vivir en conversaciones y notas separadas.',
  },
  {
    icon: Clock3,
    title: 'Menos seguimiento manual',
    description: 'El cliente consulta su historial y el equipo identifica lo pendiente sin reconstruir cada caso.',
  },
  {
    icon: Warehouse,
    title: 'Reposición con anticipación',
    description: 'Los umbrales y alertas hacen visible qué insumo requiere atención antes de agotarse.',
  },
  {
    icon: UsersRound,
    title: 'Responsabilidades claras',
    description: 'Cada perfil accede sólo a las funciones que corresponden a su trabajo.',
  },
];

const available = [
  'Registro, inicio de sesión y recuperación de acceso',
  'Perfiles de clientes',
  'Pedidos e historial',
  'Panel para trabajadores y administradores',
  'Inventario, consumo y alertas',
  'Reclamaciones y tiempo real',
];

const upcoming = [
  'Gestión completa de cuentas operativas',
  'Estados En proceso y Entregado',
  'Pagos y comprobantes integrados',
  'Bandeja de gestión de reclamaciones',
  'Reportes operativos descargables',
];

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="lv-landing">
      <a className="lv-skip-link" href="#contenido">Saltar al contenido</a>

      <header className="lv-header">
        <div className="lv-container lv-header__inner">
          <a className="lv-brand" href="#inicio" aria-label="LaundryVibes, ir al inicio" onClick={closeMenu}>
            <BrandLogo size={38} />
          </a>

          <nav className={`lv-nav ${menuOpen ? 'lv-nav--open' : ''}`} aria-label="Navegación principal">
            <a href="#funciones" onClick={closeMenu}>Funciones</a>
            <a href="#perfiles" onClick={closeMenu}>Perfiles</a>
            <a href="#como-funciona" onClick={closeMenu}>Día a día</a>
            <a href="#beneficios" onClick={closeMenu}>Beneficios</a>
            <div className="lv-nav__mobile-actions">
              <Link className="lv-button lv-button--ghost" to="/login" onClick={closeMenu}>Iniciar sesión</Link>
              <Link className="lv-button lv-button--primary" to="/registration" onClick={closeMenu}>Crear cuenta</Link>
            </div>
          </nav>

          <div className="lv-header__actions">
            <Link className="lv-login-link" to="/login">Iniciar sesión</Link>
            <Link className="lv-button lv-button--primary lv-button--small" to="/registration">Crear cuenta</Link>
          </div>

          <button
            type="button"
            className="lv-menu-button"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <main id="contenido">
        <section className="lv-hero" id="inicio">
          <div className="lv-hero__wash lv-hero__wash--one" />
          <div className="lv-hero__wash lv-hero__wash--two" />
          <div className="lv-container lv-hero__grid">
            <div className="lv-hero__copy">
              <div className="lv-eyebrow"><span /> Operación conectada, servicio más claro</div>
              <h1>Tu lavandería, organizada de principio a fin.</h1>
              <p className="lv-hero__lead">
                LaundryVibes reúne pedidos, clientes, operación e inventario en un solo lugar. El cliente solicita; tu equipo atiende; el negocio mantiene el control.
              </p>
              <div className="lv-hero__actions">
                <Link className="lv-button lv-button--primary lv-button--large" to="/registration">
                  Crear cuenta <ArrowRight size={18} />
                </Link>
                <a className="lv-button lv-button--outline lv-button--large" href="#como-funciona">
                  Ver cómo funciona
                </a>
              </div>
              <div className="lv-hero__proof" aria-label="Capacidades principales">
                <span><Check size={15} /> Acceso por roles</span>
                <span><Check size={15} /> Actualización en tiempo real</span>
                <span><Check size={15} /> Inventario con alertas</span>
              </div>
            </div>

            <div className="lv-product-preview" aria-label="Vista demostrativa del panel de LaundryVibes">
              <div className="lv-preview__topbar">
                <div className="lv-preview__brand"><BrandLogo size={25} /></div>
                <div className="lv-preview__demo">Vista demostrativa</div>
                <div className="lv-preview__avatar">OP</div>
              </div>
              <div className="lv-preview__body">
                <aside className="lv-preview__sidebar" aria-hidden="true">
                  <span className="active"><LayoutDashboard size={18} /></span>
                  <span><PackageOpen size={18} /></span>
                  <span><Boxes size={18} /></span>
                  <span><BarChart3 size={18} /></span>
                </aside>
                <div className="lv-preview__content">
                  <div className="lv-preview__heading">
                    <div><small>MIÉRCOLES, 29 AGO</small><strong>Resumen operativo</strong></div>
                    <button type="button" tabIndex={-1} aria-label="Notificaciones"><BellRing size={17} /></button>
                  </div>
                  <div className="lv-preview__metrics">
                    <article>
                      <span className="lv-metric-icon blue"><PackageOpen size={18} /></span>
                      <small>Pedidos hoy</small>
                      <strong>18</strong>
                      <em>6 pendientes</em>
                    </article>
                    <article>
                      <span className="lv-metric-icon green"><PackageCheck size={18} /></span>
                      <small>Completados</small>
                      <strong>12</strong>
                      <em>Operación al día</em>
                    </article>
                    <article>
                      <span className="lv-metric-icon amber"><BellRing size={18} /></span>
                      <small>Alertas de inventario</small>
                      <strong>2</strong>
                      <em>Requieren atención</em>
                    </article>
                  </div>
                  <div className="lv-preview__panels">
                    <article className="lv-orders-panel">
                      <div className="lv-panel-title"><strong>Pedidos recientes</strong><span>Ver todos</span></div>
                      <div className="lv-order-row">
                        <span className="lv-bag">B-104</span><div><strong>Habitación 208</strong><small>4.2 kg · 11 prendas</small></div><em className="pending">Pendiente</em>
                      </div>
                      <div className="lv-order-row">
                        <span className="lv-bag mint">B-087</span><div><strong>Habitación 115</strong><small>2.8 kg · 7 prendas</small></div><em className="progress">En proceso</em>
                      </div>
                      <div className="lv-order-row">
                        <span className="lv-bag violet">B-121</span><div><strong>Habitación 304</strong><small>5.1 kg · 14 prendas</small></div><em className="done">Completado</em>
                      </div>
                    </article>
                    <article className="lv-stock-panel">
                      <div className="lv-panel-title"><strong>Inventario</strong><Gauge size={16} /></div>
                      <div className="lv-stock-item"><span>Detergente</span><small>68%</small><i><b style={{ width: '68%' }} /></i></div>
                      <div className="lv-stock-item warning"><span>Suavizante</span><small>24%</small><i><b style={{ width: '24%' }} /></i></div>
                      <div className="lv-stock-item"><span>Jabón</span><small>52%</small><i><b style={{ width: '52%' }} /></i></div>
                    </article>
                  </div>
                </div>
              </div>
              <div className="lv-preview__notification">
                <span><BellRing size={18} /></span>
                <div><strong>Pedido actualizado</strong><small>La orden B-121 fue completada</small></div>
                <Check size={17} />
              </div>
            </div>
          </div>
          <div className="lv-container lv-capability-strip">
            <span>Pedidos centralizados</span><i />
            <span>Roles separados</span><i />
            <span>Inventario visible</span><i />
            <span>Acceso desde navegador</span>
          </div>
        </section>

        <section className="lv-problem-section">
          <div className="lv-container lv-problem-grid">
            <div>
              <p className="lv-section-kicker">MENOS FRICCIÓN OPERATIVA</p>
              <h2>Cuando la información está dispersa, el trabajo se duplica.</h2>
            </div>
            <div className="lv-problem-copy">
              <p>Mensajes para confirmar pedidos. Notas para recordar una bolsa. Llamadas para saber si una orden ya terminó. Una revisión tardía para descubrir que falta detergente.</p>
              <p>LaundryVibes conecta esos momentos en un flujo común, con una vista distinta para cada responsabilidad.</p>
            </div>
          </div>
        </section>

        <section className="lv-section lv-features" id="funciones">
          <div className="lv-container">
            <div className="lv-section-heading lv-section-heading--center">
              <p className="lv-section-kicker">TODO EN UN SOLO FLUJO</p>
              <h2>Las funciones que sostienen la operación diaria</h2>
              <p>Desde la solicitud del cliente hasta el control de insumos, cada módulo conserva el contexto que el siguiente necesita.</p>
            </div>
            <div className="lv-features-grid">
              {features.map(({ icon: Icon, kicker, title, description, accent }) => (
                <article className="lv-feature-card" key={title}>
                  <div className={`lv-feature-card__icon ${accent}`}><Icon size={23} /></div>
                  <span>{kicker}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lv-section lv-profiles" id="perfiles">
          <div className="lv-container">
            <div className="lv-section-heading lv-section-heading--split">
              <div>
                <p className="lv-section-kicker">UN SISTEMA, TRES PERSPECTIVAS</p>
                <h2>Cada perfil ve lo que necesita para avanzar</h2>
              </div>
              <p>Los permisos separan la experiencia del cliente de las herramientas operativas. Menos ruido, menos accesos innecesarios.</p>
            </div>
            <div className="lv-profiles-grid">
              {profiles.map(({ id, icon: Icon, label, title, description, items, cta, to, note }) => (
                <article className={`lv-profile-card lv-profile-card--${id}`} key={id}>
                  <div className="lv-profile-card__top">
                    <div className="lv-profile-card__icon"><Icon size={25} /></div>
                    <span>{label}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <ul>
                    {items.map((item) => <li key={item}><Check size={15} /> {item}</li>)}
                  </ul>
                  {note && <small className="lv-profile-card__note">{note}</small>}
                  <Link to={to}>{cta} <ChevronRight size={17} /></Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lv-section lv-workflow" id="como-funciona">
          <div className="lv-container">
            <div className="lv-section-heading lv-section-heading--center lv-section-heading--light">
              <p className="lv-section-kicker">DE LA SOLICITUD AL HISTORIAL</p>
              <h2>Así funciona LaundryVibes en un día normal</h2>
              <p>El sistema mantiene el hilo de la operación mientras cada persona se concentra en su parte.</p>
            </div>
            <div className="lv-workflow-grid">
              {workflow.map(({ number, actor, icon: Icon, title, description }) => (
                <article className="lv-workflow-card" key={number}>
                  <div className="lv-workflow-card__line"><span>{number}</span><i /></div>
                  <div className="lv-workflow-card__icon"><Icon size={21} /></div>
                  <small>{actor}</small>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lv-section lv-benefits" id="beneficios">
          <div className="lv-container lv-benefits-grid">
            <div className="lv-benefits__copy">
              <p className="lv-section-kicker">MEJOR OPERACIÓN, SIN PROMESAS VACÍAS</p>
              <h2>El negocio gana claridad donde antes había seguimiento manual.</h2>
              <p>La mejora no depende de una cifra inventada. Está en saber qué está pendiente, quién puede actuar y qué insumo requiere atención.</p>
              <Link className="lv-text-link" to="/registration">Comenzar como cliente <ArrowRight size={17} /></Link>
            </div>
            <div className="lv-benefits-list">
              {benefits.map(({ icon: Icon, title, description }) => (
                <article key={title}>
                  <div><Icon size={22} /></div>
                  <span><h3>{title}</h3><p>{description}</p></span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lv-section lv-security">
          <div className="lv-container lv-security-card">
            <div className="lv-security-card__visual" aria-hidden="true">
              <span className="ring ring-one" />
              <span className="ring ring-two" />
              <div><LockKeyhole size={35} /></div>
            </div>
            <div className="lv-security-card__copy">
              <p className="lv-section-kicker">SEGURIDAD DESDE LA OPERACIÓN</p>
              <h2>Accesos separados. Datos protegidos.</h2>
              <p>El servidor valida la identidad y los permisos en cada ruta privada. Las contraseñas se almacenan con bcrypt y la aplicación pública opera sobre HTTPS.</p>
              <div className="lv-security-points">
                <span><ShieldCheck size={17} /> JWT y permisos por rol</span>
                <span><LockKeyhole size={17} /> Contraseñas cifradas</span>
                <span><Smartphone size={17} /> Servicios internos aislados</span>
                <span><Gauge size={17} /> Comprobaciones de estado activas</span>
              </div>
            </div>
          </div>
        </section>

        <section className="lv-section lv-status">
          <div className="lv-container">
            <div className="lv-section-heading lv-section-heading--split">
              <div>
                <p className="lv-section-kicker">PRODUCTO CON LOS PIES EN LA TIERRA</p>
                <h2>Lo que está disponible y lo que viene después</h2>
              </div>
              <p>Preferimos mostrar el alcance real del sistema. Las funciones futuras aparecen en la hoja de ruta, no como una promesa ya entregada.</p>
            </div>
            <div className="lv-status-grid">
              <article className="lv-status-card lv-status-card--available">
                <div className="lv-status-card__title"><span><ClipboardCheck size={21} /></span><div><small>HOY</small><h3>Disponible</h3></div></div>
                <ul>{available.map((item) => <li key={item}><Check size={16} /> {item}</li>)}</ul>
              </article>
              <article className="lv-status-card lv-status-card--upcoming">
                <div className="lv-status-card__title"><span><Clock3 size={21} /></span><div><small>HOJA DE RUTA</small><h3>Próximamente</h3></div></div>
                <ul>{upcoming.map((item) => <li key={item}><ArrowRight size={16} /> {item}</li>)}</ul>
              </article>
            </div>
          </div>
        </section>

        <section className="lv-final-cta">
          <div className="lv-final-cta__pattern" />
          <div className="lv-container lv-final-cta__inner">
            <div className="lv-final-cta__icon"><BrandLogo showName={false} size={52} /></div>
            <p className="lv-section-kicker">LA OPERACIÓN EMPIEZA CON UN PEDIDO CLARO</p>
            <h2>Organiza tu próxima carga desde hoy.</h2>
            <p>Crea tu cuenta de cliente o entra al sistema si ya formas parte de la operación.</p>
            <div>
              <Link className="lv-button lv-button--white lv-button--large" to="/registration">Crear cuenta <ArrowRight size={18} /></Link>
              <Link className="lv-button lv-button--dark-outline lv-button--large" to="/login">Iniciar sesión</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="lv-footer">
        <div className="lv-container lv-footer__top">
          <div>
            <a className="lv-brand lv-brand--footer" href="#inicio" aria-label="LaundryVibes, volver al inicio"><BrandLogo size={38} inverse /></a>
            <p>Pedidos, operación e inventario en un solo flujo.</p>
          </div>
          <div className="lv-footer__links">
            <div><strong>Producto</strong><a href="#funciones">Funciones</a><a href="#perfiles">Perfiles</a><a href="#como-funciona">Cómo funciona</a></div>
            <div><strong>Acceso</strong><Link to="/registration">Crear cuenta</Link><Link to="/login">Iniciar sesión</Link><Link to="/forgot-password">Recuperar acceso</Link></div>
            <div><strong>Información</strong><a href="https://github.com/softvibeslab/laundryvibes" target="_blank" rel="noreferrer">Documentación técnica</a><a href="#beneficios">Beneficios</a><a href="#contenido">Volver arriba</a></div>
          </div>
        </div>
        <div className="lv-container lv-footer__bottom">
          <span>© {new Date().getFullYear()} LaundryVibes</span>
          <span>Hecho para mantener la operación en movimiento.</span>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
