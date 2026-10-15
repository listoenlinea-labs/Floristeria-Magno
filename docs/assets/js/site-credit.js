/* Crédito discreto y accesible compartido por todas las páginas públicas. */
(() => {
    function renderSiteCredit() {
        if (document.getElementById('listoenlinea-site-credit')) return;

        let footer = document.querySelector('footer:last-of-type');
        if (!footer) {
            footer = document.createElement('footer');
            footer.className = 'listoenlinea-credit-only-footer';
            footer.style.cssText = 'background:#1d1719;color:#f5edef;padding:24px 16px;';
            document.body.appendChild(footer);
        }

        const row = document.createElement('div');
        row.id = 'listoenlinea-site-credit';
        row.style.cssText = [
            'box-sizing:border-box', 'margin:24px auto 0', 'padding:18px 14px 4px',
            'width:min(1200px,100%)', 'text-align:center',
            'border-top:1px solid rgba(180,150,156,.28)',
            'font:400 12px/1.8 Inter,Arial,sans-serif',
            'letter-spacing:.01em', 'color:#c7b8bc'
        ].join(';');
        // El PNG original incluye márgenes transparentes amplios. Lo mostramos
        // recortado mediante su contenedor, sin modificar ni duplicar el archivo.
        const brandLink = document.createElement('a');
        brandLink.href = 'https://listoenlinea.com/';
        brandLink.target = '_blank';
        brandLink.rel = 'noopener noreferrer';
        brandLink.setAttribute('aria-label', 'Visitar Listo en Línea');
        brandLink.style.cssText = [
            'position:relative', 'display:inline-block', 'flex:0 0 28px',
            'width:28px', 'height:30px', 'overflow:hidden',
            'border-radius:3px', 'vertical-align:middle'
        ].join(';');

        const logo = document.createElement('img');
        logo.src = 'assets/img/brand/Listo_Linea_icono.png';
        logo.alt = '';
        logo.loading = 'lazy';
        logo.decoding = 'async';
        logo.style.cssText = [
            'position:absolute', 'display:block', 'width:96px',
            'height:64px', 'max-width:none', 'top:-15px', 'left:-34px'
        ].join(';');
        brandLink.appendChild(logo);

        const lead = document.createElement('span');
        lead.textContent = 'Sitio desarrollado por ';
        const link = document.createElement('a');
        link.href = 'https://listoenlinea.com/';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Listo en Línea';
        link.style.cssText = 'color:inherit;text-decoration:underline;text-underline-offset:3px;font-weight:700;';
        const tagline = document.createElement('span');
        tagline.textContent = ' · Desarrollamos software a la medida de tu negocio.';

        const copy = document.createElement('span');
        copy.append(lead, link, tagline);
        const credit = document.createElement('div');
        credit.style.cssText = [
            'display:flex', 'align-items:center', 'justify-content:center',
            'gap:9px', 'flex-wrap:wrap'
        ].join(';');
        credit.append(brandLink, copy);
        row.appendChild(credit);
        footer.appendChild(row);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderSiteCredit, { once: true });
    } else {
        renderSiteCredit();
    }
})();
