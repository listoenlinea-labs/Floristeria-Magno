const { Configuracion } = require('../models');

const attributes = [
    'id',
    'nombreNegocio',
    'whatsapp',
    'telefono',
    'direccion',
    'horario',
    'heroTitulo',
    'heroSubtitulo',
    'heroBotonTexto',
    'instagramUrl',
    'facebookUrl',
    'tiktokUrl',
    'googleMapsUrl',
    'activo',
    'actualizadoEn'
];

async function obtenerConfiguracion(req, res, next) {
    try {
        const configuracion = await Configuracion.findOne({
            where: {
                activo: true
            },
            attributes,
            order: [
                ['id', 'ASC']
            ]
        });

        if (!configuracion) {
            return res.status(404).json({
                ok: false,
                message: 'Configuración no encontrada'
            });
        }

        res.status(200).json({
            ok: true,
            data: configuracion
        });
    } catch (error) {
        next(error);
    }
}

async function actualizarConfiguracion(req, res, next) {
    try {
        let configuracion = await Configuracion.findOne({
            where: {
                activo: true
            },
            order: [
                ['id', 'ASC']
            ]
        });

        const payload = {
            nombreNegocio: String(
                req.body.nombreNegocio || ''
            ).trim(),

            whatsapp: req.body.whatsapp
                ? String(req.body.whatsapp).trim()
                : null,

            telefono: req.body.telefono
                ? String(req.body.telefono).trim()
                : null,

            direccion: req.body.direccion
                ? String(req.body.direccion).trim()
                : null,

            horario: req.body.horario
                ? String(req.body.horario).trim()
                : null,

            heroTitulo: req.body.heroTitulo
                ? String(req.body.heroTitulo).trim()
                : null,

            heroSubtitulo: req.body.heroSubtitulo
                ? String(req.body.heroSubtitulo).trim()
                : null,

            heroBotonTexto: req.body.heroBotonTexto
                ? String(req.body.heroBotonTexto).trim()
                : null,

            instagramUrl: req.body.instagramUrl
                ? String(req.body.instagramUrl).trim()
                : null,

            facebookUrl: req.body.facebookUrl
                ? String(req.body.facebookUrl).trim()
                : null,

            tiktokUrl: req.body.tiktokUrl
                ? String(req.body.tiktokUrl).trim()
                : null,

            googleMapsUrl: req.body.googleMapsUrl
                ? String(req.body.googleMapsUrl).trim()
                : null,

            actualizadoEn: new Date()
        };

        if (!payload.nombreNegocio) {
            return res.status(400).json({
                ok: false,
                message:
                    'El nombre del negocio es obligatorio'
            });
        }

        if (!configuracion) {
            configuracion = await Configuracion.create({
                ...payload,
                activo: true
            });
        } else {
            await configuracion.update(payload);
        }

        res.status(200).json({
            ok: true,
            message:
                'Configuración actualizada correctamente',
            data: configuracion
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    obtenerConfiguracion,
    actualizarConfiguracion
};