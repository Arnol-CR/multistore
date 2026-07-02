/**
 * sidebar.js — MultiStore
 * Sidebar compartido. Agregar en cada HTML antes de </body>:
 *   <script src="/assets/sidebar.js"></script>
 * Y en el <body> reemplazar todo el <aside>...</aside> con:
 *   <aside class="sidebar" id="sidebar"></aside>
 */

(function () {
  const pagina = window.location.pathname.split('/').pop() || 'dashboard.html';

  const links = [
    {
      label: 'Principal',
      items: [
        {
          href: '/dashboard.html',
          texto: 'Inicio',
          solo: false,
          badge: null,
          svg: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
        },
        {
          href: '/pedidos.html',
          texto: 'Pedidos',
          solo: false,
          badge: { id: 'badge-pedidos', cls: '' },
          svg: '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>'
        },
        {
          href: '/crear-pedidos.html',
          texto: 'Crear Pedido',
          solo: false,
          badge: null,
          svg: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'
        },
        {
          href: '/listado-pedidos.html',
          texto: 'Listado Pedidos',
          solo: true,
          badge: null,
          svg: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'
        },
        {
          href: '/tracking.html',
          texto: 'Tracking',
          solo: false,
          badge: null,
          svg: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'
        },
        {
          href: '/asignar-precios.html',
          texto: 'Mis Precios',
          solo: false,
          badge: null,
          svg: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>'
        },
        {
          href: '/clientes.html',
          texto: 'Clientes',
          solo: false,
          badge: null,
          svg: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>'
        },
        {
          href: '/pagos.html',
          texto: 'Pagos Clientes',
          solo: true,
          badge: null,
          svg: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>'
        },
        {
            href: '/cuentas.html',
            texto: 'Estado Cuentas',
            solo: false,
            badge: null,
            svg: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/><line x1="8" y1="15" x2="12" y2="15"/>'
        },
        {
            href: '/catalogo.html',
            texto: 'Catálogo',
            solo: false,
            badge: null,
            svg: '<path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/>'
        }
      ]
    }
  ];

  function buildSidebar() {
    const usuario = JSON.parse(localStorage.getItem('ms_usuario') || 'null');
    if (!usuario) return;
    const esAdmin = !!usuario.esAdmin;

    const ini = (usuario.nombres[0] + (usuario.apellidos ? usuario.apellidos[0] : '')).toUpperCase();

    // Nav HTML
    let navHtml = '';
    links.forEach(grupo => {
      if (grupo.soloGrupo && !esAdmin) return;
      navHtml += `<div class="nav-label${grupo.soloGrupo ? ' solo-admin' : ''}">${grupo.label}</div>`;
      grupo.items.forEach(item => {
        if (item.solo && !esAdmin) return;
        const activo = pagina === item.href.replace('/', '') ? ' active' : '';
        const badgeHtml = item.badge
          ? `<span class="nav-badge ${item.badge.cls}" id="${item.badge.id}">0</span>`
          : '';
        navHtml += `
         <a class="nav-item${activo}" href="${item.href}">
            <svg fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">${item.svg}</svg>
            ${item.texto}
            ${badgeHtml}
          </a>`;
      });
    });

    const aside = document.getElementById('sidebar');
    if (!aside) return;

    aside.innerHTML = `
      <div class="sidebar-logo">
        <img src="/assets/Recurso 3.png" alt="Logo" onerror="this.style.display='none'">
        <div class="sidebar-logo-text">Multi<span>Store</span></div>
      </div>
      <div class="sidebar-user">
        <div class="avatar" id="avatar">${ini}</div>
        <div>
          <div class="user-info-name" id="user-name">${usuario.nombres} ${usuario.apellidos || ''}</div>
          <div class="user-info-rol"  id="user-rol">${esAdmin ? 'Administrador' : 'Vendedor'}</div>
        </div>
      </div>
      <nav class="nav">${navHtml}</nav>
      <div class="sidebar-bottom">
        <button class="btn-salir" onclick="cerrarSesion()">
          <svg fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" width="16" height="16">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Cerrar sesión
        </button>
      </div>`;
  }

  // Funciones globales que usan los HTMLs
  window.cerrarMenu   = function () {
    document.getElementById('sidebar').classList.remove('open');
    const ov = document.getElementById('overlay');
    if (ov) ov.classList.remove('active');
  };
  window.abrirMenu    = function () {
    document.getElementById('sidebar').classList.add('open');
    const ov = document.getElementById('overlay');
    if (ov) ov.classList.add('active');
  };
  window.cerrarSesion = function () {
    localStorage.removeItem('ms_usuario');
    window.location.href = '/login.html';
  };

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildSidebar);
  } else {
    buildSidebar();
  }
})();