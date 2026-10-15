const { normalizeImagesInRecord } = require('../services/public-image-url.service');
const { Op } = require('sequelize');
const { Galeria } = require('../models');

const attributes = [
    'id',
    'titulo',
    'descripcion',
    'imagenUrl',
    'textoAlternativo',
    'categoria',
    'seccion',
    'orden',
    'activo',
    'creadoEn',
    'actualizadoEn'
];

function normalizeBoolean(value, defaultValue = false) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (value === 1 || value === '1') {
        return true;
    }

    if (value === 0 || value === '0') {
        return false;
    }

    if (typeof value === 'string') {
        const normalized = value
            .trim()
            .toLowerCase();

        if (['true', 'si', 'sí'].includes(normalized)) {
            return true;
        }

        if (['false', 'no'].includes(normalized)) {
            return false;
        }
    }

    return defaultValue;
}

function validateBody(body) {
    if (!String(body.titulo || '').trim()) {
        return 'El título es obligatorio';
    }

    if (!String(body.imagenUrl || '').trim()) {
        return 'La imagen es obligatoria';
    }

    if (!String(body.seccion || '').trim()) {
        return 'La sección es obligatoria';
    }

    const orden = Number(body.orden ?? 1);

    if (!Number.isInteger(orden) || orden < 0) {
        return 'El orden no es válido';
    }

    return null;
}

function buildPayload(body) {
    return {
        titulo: String(body.titulo || '').trim(),

        descripcion: body.descripcion
            ? String(body.descripcion).trim()
            : null,

        imagenUrl: String(
            body.imagenUrl || ''
        ).trim(),

        textoAlternativo: body.textoAlternativo
            ? String(body.textoAlternativo).trim()
            : null,

        categoria: body.categoria
            ? String(body.categoria).trim()
            : null,

        seccion: String(
            body.seccion || 'otros'
        )
            .trim()
            .toLowerCase(),

        orden: Number(body.orden ?? 1),

        activo: normalizeBoolean(
            body.activo,
            true
        ),

        actualizadoEn: new Date()
    };
}

async function listarGaleria(req, res, next) {
    try {
        const {
            seccion,
            categoria,
            buscar
        } = req.query;

        const where = {};

        if (req.allowInactive !== true) {
            where.activo = true;
        }

        if (seccion && seccion.trim()) {
            where.seccion = seccion
                .trim()
                .toLowerCase();
        }

        if (categoria && categoria.trim()) {
            where.categoria = categoria.trim();
        }

        if (buscar && buscar.trim()) {
            const text = buscar.trim();

            where[Op.or] = [
                {
                    titulo: {
                        [Op.like]: `%${text}%`
                    }
                },
                {
                    descripcion: {
                        [Op.like]: `%${text}%`
                    }
                },
                {
                    categoria: {
                        [Op.like]: `%${text}%`
                    }
                },
                {
                    seccion: {
                        [Op.like]: `%${text}%`
                    }
                }
            ];
        }

        const imagenes = await Galeria.findAll({
            where,
            attributes,
            order: [
                ['seccion', 'ASC'],
                ['orden', 'ASC'],
                ['id', 'ASC']
            ]
        });

        res.status(200).json({
            ok: true,
            total: imagenes.length,
            data: imagenes.map(normalizeImagesInRecord)
        });
    } catch (error) {
        next(error);
    }
}

async function obtenerImagenGaleria(req, res, next) {
    try {
        const id = Number(req.params.id);

        const imagen = await Galeria.findByPk(id, {
            attributes
        });

        if (!imagen) {
            return res.status(404).json({
                ok: false,
                message: 'Imagen no encontrada'
            });
        }

        res.status(200).json({
            ok: true,
            data: normalizeImagesInRecord(imagen)
        });
    } catch (error) {
        next(error);
    }
}

async function crearImagenGaleria(req, res, next) {
    try {
        const validationError =
            validateBody(req.body);

        if (validationError) {
            return res.status(400).json({
                ok: false,
                message: validationError
            });
        }

        const imagen = await Galeria.create(
            buildPayload(req.body)
        );

        res.status(201).json({
            ok: true,
            message: 'Imagen creada correctamente',
            data: imagen
        });
    } catch (error) {
        next(error);
    }
}

async function actualizarImagenGaleria(
    req,
    res,
    next
) {
    try {
        const id = Number(req.params.id);

        const imagen = await Galeria.findByPk(id);

        if (!imagen) {
            return res.status(404).json({
                ok: false,
                message: 'Imagen no encontrada'
            });
        }

        const validationError =
            validateBody(req.body);

        if (validationError) {
            return res.status(400).json({
                ok: false,
                message: validationError
            });
        }

        await imagen.update(
            buildPayload(req.body)
        );

        res.status(200).json({
            ok: true,
            message: 'Imagen actualizada',
            data: imagen
        });
    } catch (error) {
        next(error);
    }
}

async function cambiarEstadoImagen(req, res, next) {
    try {
        const id = Number(req.params.id);

        const imagen = await Galeria.findByPk(id);

        if (!imagen) {
            return res.status(404).json({
                ok: false,
                message: 'Imagen no encontrada'
            });
        }

        imagen.activo = normalizeBoolean(
            req.body.activo,
            imagen.activo
        );

        imagen.actualizadoEn = new Date();

        await imagen.save();

        res.status(200).json({
            ok: true,
            message: imagen.activo
                ? 'Imagen activada'
                : 'Imagen ocultada',
            data: imagen
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    listarGaleria,
    obtenerImagenGaleria,
    crearImagenGaleria,
    actualizarImagenGaleria,
    cambiarEstadoImagen
};