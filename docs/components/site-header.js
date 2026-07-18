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
            <a class="nav-link" href="${pageUrl('index.html', 'nosotros')}" data-section="nosotros">Quiénes somos</a>
            <a class="header-cta" href="${pageUrl('index.html', 'contacto')}">Ordenar flores</a>
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

    let clickedSectionId = null;
    let scrollStopTimer = null;

    const scrollToSection = (section, updateHash = true) => {
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
        behavior: 'smooth'
      });
    };

    sectionLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        const section = document.getElementById(link.dataset.section);
        if (!section) return;

        event.preventDefault();
        clickedSectionId = section.id;
        activateLink(link);
        closeMenu();
        scrollToSection(section);
      });
    });

    this.handleSectionScroll = () => {
      // Durante un desplazamiento iniciado por clic, conserva el botón elegido.
      if (clickedSectionId) {
        const clickedLink = sectionLinks.find(
          (link) => link.dataset.section === clickedSectionId
        );
        activateLink(clickedLink);
        return;
      }

      const marker = window.scrollY + header.offsetHeight + 90;
      let activeItem = sections[0];

      sections.forEach((item) => {
        if (item.section.offsetTop <= marker) activeItem = item;
      });

      activateLink(activeItem?.link);
    };

    this.handleSectionScrollWithRelease = () => {
      this.handleSectionScroll();
      window.clearTimeout(scrollStopTimer);

      scrollStopTimer = window.setTimeout(() => {
        clickedSectionId = null;
        this.handleSectionScroll();
      }, 180);
    };

    window.addEventListener('scroll', this.handleSectionScrollWithRelease, { passive: true });
    window.addEventListener('resize', this.handleSectionScroll);

    if ('onscrollend' in window) {
      this.handleScrollEnd = () => {
        clickedSectionId = null;
        this.handleSectionScroll();
      };
      window.addEventListener('scrollend', this.handleScrollEnd);
    }

    const hash = window.location.hash.replace('#', '');
    const hashItem = sections.find((item) => item.section.id === hash);

    if (hashItem) {
      window.setTimeout(() => {
        clickedSectionId = hashItem.section.id;
        scrollToSection(hashItem.section, false);
        activateLink(hashItem.link);
      }, 100);
    } else {
      this.handleSectionScroll();
    }
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.handleDocumentClick);
    document.removeEventListener('keydown', this.handleEscape);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('scroll', this.handleHeaderScroll);
    window.removeEventListener('scroll', this.handleSectionScrollWithRelease);
    window.removeEventListener('resize', this.handleSectionScroll);
    window.removeEventListener('scrollend', this.handleScrollEnd);
  }
}

if (!customElements.get('site-header')) {
  customElements.define('site-header', SiteHeader);
}
