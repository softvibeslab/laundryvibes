import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ORIGIN = 'https://laundryvibes.rovicrm.com';
const LANDING_DESCRIPTION = 'LaundryVibes centraliza pedidos, clientes, operación e inventario para organizar una lavandería de principio a fin.';
const SOCIAL_IMAGE = `${ORIGIN}/brand/laundryvibes-og.png`;

const publicPages = {
  '/': {
    title: 'LaundryVibes | Software para pedidos e inventario de lavanderías',
    description: LANDING_DESCRIPTION,
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  },
};

const noIndexTitles = {
  '/login': 'Iniciar sesión | LaundryVibes',
  '/registration': 'Crear cuenta | LaundryVibes',
  '/forgot-password': 'Recuperar acceso | LaundryVibes',
  '/access': 'Seleccionar perfil | LaundryVibes',
  '/workerdashboard': 'Panel operativo | LaundryVibes',
  '/worker/orders': 'Gestión de pedidos | LaundryVibes',
  '/worker/settings': 'Mi cuenta operativa | LaundryVibes',
  '/admin/dashboard': 'Panel de administración | LaundryVibes',
  '/admin/settings': 'Administración de accesos | LaundryVibes',
  '/stock': 'Inventario | LaundryVibes',
};

const upsertMeta = (selector, attributes) => {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
};

const PageMetadata = () => {
  const { pathname } = useLocation();
  const structuredData = useRef(document.querySelector('#laundryvibes-structured-data')?.textContent || '');

  useEffect(() => {
    const publicPage = publicPages[pathname];
    const isReset = pathname.startsWith('/reset-password/');
    const isPrivatePanel = /^\/(?:user|worker|admin)(?:\/|$)/.test(pathname)
      || ['/workerdashboard', '/stock'].includes(pathname);
    const title = publicPage?.title
      || noIndexTitles[pathname]
      || (isReset
        ? 'Restablecer contraseña | LaundryVibes'
        : (isPrivatePanel ? 'Panel | LaundryVibes' : 'Página no encontrada | LaundryVibes'));
    const description = publicPage?.description || 'Acceso seguro a LaundryVibes.';
    const robots = publicPage?.robots || 'noindex, nofollow, noarchive';
    const canonicalUrl = `${ORIGIN}${pathname}`;

    document.title = title;
    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[name="robots"]', { name: 'robots', content: robots });
    upsertMeta('meta[name="googlebot"]', { name: 'googlebot', content: robots });
    const canonical = document.head.querySelector('link[rel="canonical"]');
    if (publicPage) {
      const canonicalLink = canonical || document.head.appendChild(document.createElement('link'));
      canonicalLink.setAttribute('rel', 'canonical');
      canonicalLink.setAttribute('href', canonicalUrl);

      const socialMeta = [
        ['meta[property="og:type"]', { property: 'og:type', content: 'website' }],
        ['meta[property="og:site_name"]', { property: 'og:site_name', content: 'LaundryVibes' }],
        ['meta[property="og:locale"]', { property: 'og:locale', content: 'es_MX' }],
        ['meta[property="og:title"]', { property: 'og:title', content: title }],
        ['meta[property="og:description"]', { property: 'og:description', content: description }],
        ['meta[property="og:url"]', { property: 'og:url', content: canonicalUrl }],
        ['meta[property="og:image"]', { property: 'og:image', content: SOCIAL_IMAGE }],
        ['meta[property="og:image:secure_url"]', { property: 'og:image:secure_url', content: SOCIAL_IMAGE }],
        ['meta[property="og:image:type"]', { property: 'og:image:type', content: 'image/png' }],
        ['meta[property="og:image:width"]', { property: 'og:image:width', content: '1200' }],
        ['meta[property="og:image:height"]', { property: 'og:image:height', content: '630' }],
        ['meta[property="og:image:alt"]', { property: 'og:image:alt', content: 'LaundryVibes: tu lavandería organizada de principio a fin' }],
        ['meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' }],
        ['meta[name="twitter:title"]', { name: 'twitter:title', content: title }],
        ['meta[name="twitter:description"]', { name: 'twitter:description', content: description }],
        ['meta[name="twitter:image"]', { name: 'twitter:image', content: SOCIAL_IMAGE }],
        ['meta[name="twitter:image:alt"]', { name: 'twitter:image:alt', content: 'LaundryVibes: tu lavandería organizada de principio a fin' }],
      ];
      socialMeta.forEach(([selector, attributes]) => upsertMeta(selector, attributes));

      if (!document.querySelector('#laundryvibes-structured-data') && structuredData.current) {
        const script = document.createElement('script');
        script.id = 'laundryvibes-structured-data';
        script.type = 'application/ld+json';
        script.textContent = structuredData.current;
        document.head.appendChild(script);
      }
    } else {
      canonical?.remove();
      document.head.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]').forEach((meta) => meta.remove());
      document.querySelector('#laundryvibes-structured-data')?.remove();
    }
  }, [pathname]);

  return null;
};

export default PageMetadata;
