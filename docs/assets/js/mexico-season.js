/* Temporada automática según calendario de México.
 * Se conservan las clases y animaciones existentes; no se ofrecen controles
 * manuales públicos. Los colores configurados por Admin se aplican después.
 */
(function () {
    'use strict';
    const CLASSES = ['theme-spring','theme-summer','theme-autumn','theme-winter'];
    const storeUrl = ['localhost','127.0.0.1'].includes(location.hostname)
        ? 'http://localhost:3000/api/floristeria-magno/configuracion'
        : 'https://api.listoenlinea.host/api/floristeria-magno/configuracion';
    function getMexicoSeason(date = new Date()) {
        const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
            timeZone:'America/Mexico_City', month:'2-digit',day:'2-digit'
        }).formatToParts(date).map(part => [part.type,part.value]));
        const md = Number(parts.month)*100+Number(parts.day);
        if (md >= 320 && md <= 620) return 'spring';
        if (md >= 621 && md <= 922) return 'summer';
        if (md >= 923 && md <= 1220) return 'autumn';
        return 'winter';
    }
    function applySeason() {
        const season = getMexicoSeason();
        document.body.classList.remove(...CLASSES);
        document.body.classList.add('theme-' + season);
        document.body.dataset.mexicoSeason = season;
        return season;
    }
    async function applyAdminTheme() {
        if (document.body.classList.contains('page-catalogo')) return;
        if (typeof window.magnoApplySiteSettings !== 'function') return;
        try {
            const response = await fetch(storeUrl, {headers:{Accept:'application/json'},cache:'no-store'});
            if (!response.ok) return;
            const result = await response.json();
            if (result.ok && result.data) window.magnoApplySiteSettings(result.data);
        } catch (error) {
            console.warn('No se pudo actualizar el tema desde el servidor; se mantiene la temporada automática.',error);
        }
    }
    window.MagnoMexicoSeason = Object.freeze({getMexicoSeason,applySeason});
    function init() {
        applySeason();
        applyAdminTheme();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
    else init();
})();
