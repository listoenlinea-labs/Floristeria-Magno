const ConfiguracionTienda = require('../models/ConfiguracionTienda');

const DEFAULT_OPTIONS = Object.freeze({
    seoVisible: false,
    seoTitulo: 'Compra flores en línea con entrega a domicilio en Guadalajara y Zapopan',
    seoTexto1: 'En Floristería Magno encontrarás arreglos florales y ramos de flores para cumpleaños, aniversarios, agradecimientos y otros momentos especiales. Elige entre rosas, girasoles, tulipanes y flores de temporada según la disponibilidad del catálogo.',
    seoTexto2: 'Selecciona tus arreglos, revisa tu carrito y programa una entrega dentro de nuestra zona de cobertura en el Área Metropolitana de Guadalajara.',
    seoVideoUrl: '',
    tema: { fondo: 'base', botones: 'base', petalos: 'base', petaloInicial: 'base' },
    cancelacionPorcentaje: null
});

const PALETTES = ['base', 'rosa', 'lavanda', 'menta', 'durazno', 'cielo', 'vainilla',
    'malva', 'lila', 'coral', 'salmon', 'amarillo', 'lima', 'verdeAgua', 'turquesa', 'azulPolvo', 'arena', 'grisPerla', 'fresa', 'pistacho'];
const MAX_LENGTH = { seoTitulo: 220, seoTexto1: 1600, seoTexto2: 1600, seoVideoUrl: 300 };

function parseStoredOptions(row) {
    if (!row?.opcionesJson) return {};
    try {
        const value = JSON.parse(row.opcionesJson);
        return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (_) {
        return {};
    }
}

function normalizeOptions(raw) {
    const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const theme = value.tema && typeof value.tema === 'object' ? value.tema : {};
    return {
        ...DEFAULT_OPTIONS,
        ...Object.fromEntries(['seoTitulo', 'seoTexto1', 'seoTexto2', 'seoVideoUrl']
            .map(key => [key, typeof value[key] === 'string' ? value[key] : DEFAULT_OPTIONS[key]])),
        seoVisible: typeof value.seoVisible === 'boolean' ? value.seoVisible : DEFAULT_OPTIONS.seoVisible,
        tema: Object.fromEntries(Object.keys(DEFAULT_OPTIONS.tema)
            .map(key => [key, PALETTES.includes(theme[key]) ? theme[key] : 'base'])),
        cancelacionPorcentaje: Number.isInteger(value.cancelacionPorcentaje) &&
            value.cancelacionPorcentaje >= 1 && value.cancelacionPorcentaje <= 99
            ? value.cancelacionPorcentaje : null
    };
}

async function getStoreOptions() {
    const row = await ConfiguracionTienda.findByPk(1);
    return normalizeOptions(parseStoredOptions(row));
}

function validateStoreOptions(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new Error('La configuración enviada no es válida.');
    }
    const options = normalizeOptions(body);
    for (const [key, max] of Object.entries(MAX_LENGTH)) {
        if (typeof body[key] !== 'string' || body[key].length > max) {
            throw new Error(`El campo ${key} debe ser texto de hasta ${max} caracteres.`);
        }
    }
    if (typeof body.seoVisible !== 'boolean') {
        throw new Error('La visibilidad debe ser verdadero o falso.');
    }
    if (!body.tema || Object.keys(DEFAULT_OPTIONS.tema).some(
        key => !PALETTES.includes(body.tema[key])
    )) {
        throw new Error('Selecciona únicamente temas pastel disponibles.');
    }
    const percent = body.cancelacionPorcentaje;
    if (percent !== null && (!Number.isInteger(percent) || percent < 1 || percent > 99)) {
        throw new Error('El porcentaje de devolución debe estar entre 1 y 99, o quedar sin definir.');
    }
    if (options.seoVideoUrl) {
        let parsed;
        try { parsed = new URL(options.seoVideoUrl); } catch (_) {
            throw new Error('La liga de YouTube no es válida.');
        }
        if (parsed.protocol !== 'https:' || ![
            'www.youtube.com', 'youtube.com', 'm.youtube.com',
            'youtu.be', 'www.youtube-nocookie.com'
        ].includes(parsed.hostname)) {
            throw new Error('Solo se admiten ligas HTTPS de YouTube.');
        }
    }
    return options;
}

async function saveStoreOptions(raw) {
    const options = validateStoreOptions(raw);
    await ConfiguracionTienda.upsert({ id: 1, opcionesJson: JSON.stringify(options) });
    return options;
}

function cancellationText(percent) {
    if (percent === null) {
        return 'Para cancelar un pedido, contáctanos antes de pagar y consulta las condiciones aplicables. El porcentaje de devolución está pendiente de definición.';
    }
    return `Si necesitas cancelar tu pedido, contáctanos lo antes posible. En una cancelación aceptada se devuelve el ${percent}% del total pagado; el ${100 - percent}% restante no es reembolsable por la preparación y reserva de flores.`;
}

const REPLACEMENT_TEXT = 'Si tu arreglo llega en mal estado o presenta un problema atribuible a la floristería, contáctanos para revisarlo y reemplazarlo.';

module.exports = {
    DEFAULT_OPTIONS, PALETTES, getStoreOptions, saveStoreOptions,
    cancellationText, REPLACEMENT_TEXT
};
