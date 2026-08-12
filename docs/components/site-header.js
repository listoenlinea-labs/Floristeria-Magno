const SITE_ROOT = new URL('../', import.meta.url);

const pageUrl = (file, hash = '') => {
  const url = new URL(file, SITE_ROOT);
  url.hash = hash.replace(/^#/, '');
  return url.href;
};

const logoUrl = new URL('assets/img/icon/logo_lpb.png', SITE_ROOT).href;

class SiteHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    if (this.shadowRoot.hasChildNodes()) return;

    const currentFile =
      window.location.pathname.split('/').pop().toLowerCase() || 'index.html';

    this.currentPage = currentFile.replace('.html', '');

    this.shadowRoot.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap');

        :host {
          display: block;
        }

        *, *::before, *::after {
          box-sizing: border-box;
        }

        .site-header {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 1000;
          padding: 14px 0;
          background: rgba(255, 255, 255, 0.98);
          border-bottom: 1px solid #e8e8e8;
          backdrop-filter: blur(16px);
          transition: padding 0.25s ease, box-shadow 0.25s ease;
        }

        .site-header.scrolled {
          padding: 9px 0;
          box-shadow: 0 8px 28px rgba(17, 17, 17, 0.08);
        }

        .header-inner {
          width: min(1320px, 100%);
          margin: 0 auto;
          padding: 0 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .brand-logo {
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
          gap: 14px;
          color: #111111;
          font-family: 'Playfair Display', serif;
          font-size: 1.7rem;
          font-weight: 800;
          letter-spacing: 0.03em;
          line-height: 1;
          text-decoration: none;
        }

        .brand-name-accent {
          color: #111111;
        }

        .logo-mark {
          width: 58px;
          height: 58px;
          flex: 0 0 58px;
          display: grid;
          place-items: center;
          padding: 6px;
          overflow: hidden;
          border: 1px solid #e8e8e8;
          border-radius: 50%;
          background: #ffffff;
        }

        .logo-mark img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .nav-menu {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 22px;
        }

        .nav-link {
          position: relative;
          color: #111111;
          font-family: 'Inter', sans-serif;
          font-size: 0.88rem;
          font-weight: 600;
          line-height: 1.2;
          text-decoration: none;
          white-space: nowrap;
          transition: opacity 0.2s ease;
        }

        .nav-link:hover,
        .nav-link.active {
          opacity: 0.55;
        }

        .nav-link.active::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: -8px;
          height: 2px;
          border-radius: 999px;
          background: currentColor;
        }

        .header-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 10px 18px;
          border: 1px solid #111111;
          border-radius: 999px;
          background: #111111;
          color: #ffffff;
          font-family: 'Inter', sans-serif;
          font-size: 0.86rem;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .header-cta:hover {
          background: #333333;
          transform: translateY(-1px);
        }

        .mobile-phone-link {
  display: none;
}

        .menu-toggle {
          display: none;
          width: 44px;
          height: 44px;
          padding: 0;
          place-items: center;
          border: 1px solid #e1e1e1;
          border-radius: 12px;
          background: #ffffff;
          color: #111111;
          cursor: pointer;
        }

        .menu-toggle svg {
          width: 25px;
          height: 25px;
        }

        @media (max-width: 1199.98px) {
          .nav-menu {
            gap: 15px;
          }

          .nav-link {
            font-size: 0.82rem;
          }
        }

        @media (max-width: 991.98px) {
          .site-header,
          .site-header.scrolled {
            padding: 10px 0;
          }

          .header-inner {
            position: relative;
            padding: 0 16px;
          }

          .brand-logo {
            gap: 10px;
            font-size: 1.35rem;
          }

          .logo-mark {
            width: 50px;
            height: 50px;
            flex-basis: 50px;
          }

          .menu-toggle {
            display: grid;
          }

          .nav-menu {
            position: absolute;
            top: calc(100% + 12px);
            left: 16px;
            right: 16px;
            display: none;
            max-height: calc(100vh - 100px);
            padding: 14px;
            overflow-y: auto;
            flex-direction: column;
            align-items: stretch;
            gap: 4px;
            border: 1px solid #e8e8e8;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.99);
            box-shadow: 0 20px 50px rgba(17, 17, 17, 0.14);
          }

          .nav-menu.open {
            display: flex;
          }

          .nav-link,
          .header-cta {
            width: 100%;
            padding: 12px 14px;
            border-radius: 12px;
          }

          .nav-link.active::after {
            display: none;
          }

          .nav-link:hover,
          .nav-link.active {
            background: #f3f3f3;
            opacity: 1;
          }

          .header-cta {
            margin-top: 5px;
          }

          .mobile-phone-link {
            width: 100%;
            min-height: 48px;

            margin-top: 5px;
            padding: 12px 14px;

            border: 1px solid #ead7d9;
            border-radius: 12px;

            background: #fff4f4;
            color: #111111;

            display: flex;
            align-items: center;
            justify-content: center;
            gap: 9px;

            font-family: 'Inter', sans-serif;
            font-size: 0.86rem;
            font-weight: 750;
            line-height: 1.2;
            text-decoration: none;
          }

          .mobile-phone-link:hover {
            background: #fbe7e8;
            color: #111111;
          }

          .mobile-phone-link svg {
            width: 19px;
            height: 19px;
            flex: 0 0 19px;
          }

          .mobile-app-nav-item-phone {
            display: none;
          }

          @media (max-width: 767px) {
            body {
              padding-bottom: 94px;
            }

  .mobile-app-nav {
    position: fixed;
    bottom: 10px;
    left: 10px;
    right: 10px;

    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;

    align-items: stretch;
    justify-content: stretch;

    padding: 7px 7px 9px;
    border-radius: 28px;

    background: rgba(255, 255, 255, 0.98);
    border: 1px solid rgba(17, 17, 17, 0.10);

    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);

    box-shadow: 0 20px 55px rgba(17, 17, 17, 0.14);
  }

  /* Ocultamos el teléfono del header normal */
  .mobile-phone-link {
    display: none !important;
  }

  /* Traemos el teléfono a la barra móvil */
  .mobile-app-nav-item-phone {
    display: flex;
    align-items: center;
    justify-content: center;

    width: 100%;
    min-height: 50px;
    padding: 4px;

    border: none;
    border-radius: 16px;

    background: transparent;
    color: #198754;

    font-family: 'Inter', sans-serif;
    font-size: 0.56rem;
    font-weight: 750;
    line-height: 1.1;
    text-align: center;
    text-decoration: none;
  }

  .mobile-app-nav-item-phone i {
    display: block;
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.1;
  }

  .mobile-app-nav-item-phone span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-app-nav-item-phone:hover {
    background: #eaf8ef;
    color: #13733f;
  }

  .mobile-app-nav-item-phone:hover i {
    color: #13733f;
  }
}

        }
      </style>

      <header class="site-header" id="siteHeader">
        <div class="header-inner">
          <a class="brand-logo" href="${pageUrl('index.html', 'inicio')}" aria-label="Ir al inicio">
            <span class="logo-mark">
              <img src="${logoUrl}" alt="Logo Floristería Juan H Magno">
            </span>
            <span>Juan H <span class="brand-name-accent">Magno</span></span>
          </a>

          <button
            class="menu-toggle"
            type="button"
            aria-label="Abrir menú"
            aria-controls="siteHeaderMenu"
            aria-expanded="false"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>

          <nav class="nav-menu" id="siteHeaderMenu" aria-label="Navegación principal">
            <a class="nav-link" href="${pageUrl('index.html', 'inicio')}" data-section="inicio">Inicio</a>
            <a class="nav-link" href="${pageUrl('index.html', 'momentos')}" data-section="momentos">Momentos</a>
            <a class="nav-link" href="${pageUrl('index.html', 'servicios')}" data-section="servicios">Servicios</a>
            <a class="nav-link" href="${pageUrl('catalogo.html')}" data-page="catalogo">Catálogo</a>
            <a class="nav-link" href="${pageUrl('index.html', 'novias')}" data-section="novias">Novias</a>
            <a class="nav-link" href="${pageUrl('rastreo.html')}" data-page="rastreo">Rastrea tu pedido</a>
            <a
              class="nav-link"
              href="${pageUrl('index.html', 'nosotros')}"
              data-section="nosotros"
            >
              Quiénes somos
            </a>

            <a
              class="mobile-phone-link"
              href="tel:+5213312345678"
              aria-label="Llamar a Floristería Juan H Magno"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M7.2 3.5l2.1 4.1-1.8 1.8c1.1 2.4 3 4.3 5.4 5.4l1.8-1.8 4.1 2.1c.5.3.8.8.7 1.4l-.5 3c-.1.7-.7 1.2-1.4 1.2C9.8 20.7 3.3 14.2 3.3 6.4c0-.7.5-1.3 1.2-1.4l3-.5c.6-.1 1.2.2 1.5.7z"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>

              <span>Llamar: 33 1234 5678</span>
            </a>

            <a
              class="header-cta"
              href="#"
              id="headerWhatsappButton"
            >
              Ordenar por WhatsApp
            </a>
          </nav>
        </div>
      </header>
    `;

    this.initializeHeader();
  }

  initializeHeader() {
    const root = this.shadowRoot;
    const header = root.getElementById('siteHeader');
    const menu = root.getElementById('siteHeaderMenu');
    const toggle = root.querySelector('.menu-toggle');
    const whatsappButton =
      root.getElementById('headerWhatsappButton');

    const closeMenu = () => {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menú');
    };

    const toggleMenu = () => {
      const isOpen = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
    };

    toggle.addEventListener('click', toggleMenu);

    if (whatsappButton) {
      whatsappButton.addEventListener(
        'click',
        async (event) => {
          event.preventDefault();

          closeMenu();

          if (
            typeof window.openTrackedWhatsapp !==
            'function'
          ) {
            console.error(
              'openTrackedWhatsapp todavía no está disponible.'
            );

            return;
          }

          await window.openTrackedWhatsapp({
            source: 'header-whatsapp'
          });
        }
      );
    }

    root.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    this.handleDocumentClick = (event) => {
      if (!event.composedPath().includes(this)) closeMenu();
    };

    this.handleEscape = (event) => {
      if (event.key === 'Escape') closeMenu();
    };

    this.handleResize = () => {
      if (window.innerWidth >= 992) closeMenu();
    };

    this.handleHeaderScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 30);
    };

    document.addEventListener('click', this.handleDocumentClick);
    document.addEventListener('keydown', this.handleEscape);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('scroll', this.handleHeaderScroll, { passive: true });

    this.handleHeaderScroll();
    this.initializeActiveLink(header, closeMenu);
  }

  initializeActiveLink(header, closeMenu) {
    const root = this.shadowRoot;
    const allNavLinks = [...root.querySelectorAll('.nav-link')];
    const sectionLinks = [...root.querySelectorAll('[data-section]')];

    const clearActiveLinks = () => {
      allNavLinks.forEach((link) => {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      });
    };

    const activateLink = (link) => {
      clearActiveLinks();
      if (!link) return;
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    };

    if (this.currentPage !== 'index') {
      activateLink(root.querySelector(`[data-page="${this.currentPage}"]`));
      return;
    }

    const sections = sectionLinks
      .map((link) => ({
        link,
        section: document.getElementById(link.dataset.section)
      }))
      .filter((item) => item.section);

    let isAutomaticScrolling = false;
    let automaticScrollTargetLink = null;
    let automaticScrollStopTimer = null;

    const finishAutomaticScroll = () => {
      if (!isAutomaticScrolling) return;

      isAutomaticScrolling = false;
      window.clearTimeout(automaticScrollStopTimer);
      automaticScrollStopTimer = null;

      // Conserva activo el enlace que inició el desplazamiento.
      // El siguiente desplazamiento manual volverá a ejecutar el scroll spy.
      activateLink(automaticScrollTargetLink);
      automaticScrollTargetLink = null;
    };

    const scrollToSection = (
      section,
      updateHash = true,
      behavior = 'smooth'
    ) => {
      const targetTop =
        section.getBoundingClientRect().top +
        window.scrollY -
        header.offsetHeight -
        12;

      if (updateHash) {
        history.replaceState(null, '', `#${section.id}`);
      }

      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior
      });
    };

    sectionLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        const section = document.getElementById(link.dataset.section);
        if (!section) return;

        event.preventDefault();

        isAutomaticScrolling = true;
        automaticScrollTargetLink = link;
        window.clearTimeout(automaticScrollStopTimer);

        activateLink(link);
        closeMenu();
        scrollToSection(section);
      });
    });

    this.handleSectionScroll = () => {
      if (!sections.length) return;

      /*
        Se usa getBoundingClientRect() porque offsetTop es relativo al
        offsetParent. En esta página las secciones están dentro de <main>,
        que tiene position: relative; por eso comparar offsetTop con
        window.scrollY hacía que ninguna sección coincidiera y el menú
        regresara a Inicio.
      */
      const detectionLine = header.offsetHeight + 24;
      let activeItem = sections[0];

      sections.forEach((item) => {
        const rect = item.section.getBoundingClientRect();

        if (rect.top <= detectionLine) {
          activeItem = item;
        }
      });

      activateLink(activeItem.link);
    };

    this.handleSectionScrollEvent = () => {
      if (isAutomaticScrolling) {
        // El temporizador se reinicia con cada evento de scroll y solo
        // termina cuando el desplazamiento suave realmente se detiene.
        window.clearTimeout(automaticScrollStopTimer);
        automaticScrollStopTimer = window.setTimeout(
          finishAutomaticScroll,
          180
        );
        return;
      }

      this.handleSectionScroll();
    };

    window.addEventListener(
      'scroll',
      this.handleSectionScrollEvent,
      { passive: true }
    );
    window.addEventListener('resize', this.handleSectionScroll);

    const getHashItem = () => {
      const hash = decodeURIComponent(
        window.location.hash.replace(/^#/, '')
      );

      return sections.find(
        (item) => item.section.id === hash
      );
    };

    /*
     * Cuando se llega desde otra página, el navegador intenta saltar al hash
     * antes de que index.html termine de cargar productos y galerías desde la
     * API. Ese contenido cambia la altura de las secciones anteriores y puede
     * dejar #novias o #nosotros fuera de posición. Esta función vuelve a
     * calcular la ubicación usando la altura real del encabezado.
     */
    const alignCurrentHash = (behavior = 'auto') => {
      const hashItem = getHashItem();

      if (!hashItem) {
        return false;
      }

      isAutomaticScrolling = true;
      automaticScrollTargetLink = hashItem.link;
      activateLink(hashItem.link);
      scrollToSection(hashItem.section, false, behavior);

      return true;
    };

    this.handleHomeContentReady = () => {
      // Dos frames permiten que el navegador aplique primero el nuevo layout.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          alignCurrentHash('auto');
        });
      });
    };

    window.addEventListener(
      'home-content-ready',
      this.handleHomeContentReady
    );

    const initialHashItem = getHashItem();

    if (initialHashItem) {
      window.setTimeout(() => {
        alignCurrentHash('auto');
      }, 100);
    } else {
      this.handleSectionScroll();
    }

    this.cancelAutomaticScroll = () => {
      window.clearTimeout(automaticScrollStopTimer);
      automaticScrollStopTimer = null;
      isAutomaticScrolling = false;
      automaticScrollTargetLink = null;
    };
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.handleDocumentClick);
    document.removeEventListener('keydown', this.handleEscape);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('scroll', this.handleHeaderScroll);
    window.removeEventListener('scroll', this.handleSectionScrollEvent);
    window.removeEventListener('resize', this.handleSectionScroll);
    window.removeEventListener(
      'home-content-ready',
      this.handleHomeContentReady
    );
    if (this.cancelAutomaticScroll) this.cancelAutomaticScroll();
  }
}

if (!customElements.get('site-header')) {
  customElements.define('site-header', SiteHeader);
}
