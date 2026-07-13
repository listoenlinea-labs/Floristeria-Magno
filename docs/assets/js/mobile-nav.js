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

        setActiveMobileNavItem();
    } catch (error) {
        console.error('Error cargando navegación móvil:', error);
    }
});

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
            const isActive = link.dataset.page === currentPage;

            link.classList.toggle('active', isActive);

            if (isActive) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });
}