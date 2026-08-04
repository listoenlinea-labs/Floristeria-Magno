document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('mobile-nav-container');

    if (!container) return;

    try {
        const response = await fetch('components/mobile-nav.html', {
            cache: 'no-cache'
        });

        if (!response.ok) {
            throw new Error(
                `No se pudo cargar el menú móvil. HTTP ${response.status}`
            );
        }

        container.innerHTML = await response.text();

        addWhatsappMobileNavItem();
        setActiveMobileNavItem();
    } catch (error) {
        console.error('Error cargando navegación móvil:', error);
    }
});

/**
 * Agrega WhatsApp como quinto elemento de la barra móvil.
 * Se inserta dentro del mismo grid para conservar una sola fila.
 */
function addWhatsappMobileNavItem() {
    const mobileNav = document.querySelector(
        '#mobile-nav-container .mobile-app-nav'
    );

    if (!mobileNav) {
        console.warn(
            'No se encontró .mobile-app-nav dentro de components/mobile-nav.html'
        );
        return;
    }

    if (mobileNav.querySelector('.mobile-nav-whatsapp')) {
        return;
    }

    const whatsappLink = document.createElement('a');

    whatsappLink.className = 'mobile-nav-whatsapp';
    whatsappLink.href = 'https://wa.me/523336624226';
    whatsappLink.target = '_blank';
    whatsappLink.rel = 'noopener';
    whatsappLink.setAttribute(
        'aria-label',
        'Contactar a la Floristería Juan H Magno por WhatsApp'
    );

    whatsappLink.innerHTML = `
        <i class="bi bi-whatsapp" aria-hidden="true"></i>
        <span>WhatsApp</span>
    `;

    mobileNav.appendChild(whatsappLink);
}

function setActiveMobileNavItem() {
    const currentFile =
        window.location.pathname
            .split('/')
            .pop()
            .toLowerCase() || 'index.html';

    let currentPage = 'index';

    if (currentFile.includes('catalogo')) {
        currentPage = 'catalogo';
    } else if (currentFile.includes('carrito')) {
        currentPage = 'carrito';
    } else if (currentFile.includes('rastreo')) {
        currentPage = 'rastreo';
    } else if (currentFile.includes('ideas')) {
        currentPage = 'ideas';
    }

    document
        .querySelectorAll('.mobile-app-nav [data-page]')
        .forEach(link => {
            const isActive =
                link.dataset.page === currentPage;

            link.classList.toggle(
                'active',
                isActive
            );

            if (isActive) {
                link.setAttribute(
                    'aria-current',
                    'page'
                );
            } else {
                link.removeAttribute(
                    'aria-current'
                );
            }
        });
}