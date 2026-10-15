/**
 * Reparar URLs heredadas que apuntan al host anterior sin alterar el dato
 * original en MySQL. Solo se reescriben rutas del backend /uploads/ conocido.
 */
function normalizePublicImageUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return value;
    const base = String(process.env.PUBLIC_API_URL || '').trim().replace(/\\/+$/, '');
    if (!base) return value;
    let suffix;
    if (value.startsWith('/uploads/')) suffix = value;
    else {
        try {
            const url = new URL(value);
            if (!['http:', 'https:'].includes(url.protocol)) return value;
            if (!url.pathname.startsWith('/uploads/')) return value;
            // La migración afecta únicamente archivos subidos por la tienda.
            if (!/^\\/uploads\\/(productos|galeria)\\/[^/]+$/.test(url.pathname)) return value;
            suffix = url.pathname + url.search;
        } catch { return value; }
    }
    if (!/^\\/uploads\\/(productos|galeria)\\/[^/]+$/.test(suffix.split('?')[0])) return value;
    return base + suffix;
}

function normalizeImagesInRecord(record) {
    const item = typeof record?.toJSON === 'function' ? record.toJSON() : record;
    if (!item || typeof item !== 'object') return item;
    if (item.imagenUrl) item.imagenUrl = normalizePublicImageUrl(item.imagenUrl);
    if (Array.isArray(item.imagenes)) {
        item.imagenes = item.imagenes.map(image => ({
            ...image,
            imagenUrl: normalizePublicImageUrl(image.imagenUrl)
        }));
    }
    return item;
}

module.exports = { normalizePublicImageUrl, normalizeImagesInRecord };
