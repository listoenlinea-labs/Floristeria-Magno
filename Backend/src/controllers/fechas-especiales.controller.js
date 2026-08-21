const {
    Op
} = require('sequelize');

const {
    FechaEspecial
} = require('../models');


function normalizeText(
    value,
    maxLength = 500
) {
    return String(
        value ?? ''
    )
        .trim()
        .slice(
            0,
            maxLength
        );
}


function parseDate(
    value
) {
    if (!value) {
        return null;
    }

    const date =
        new Date(value);

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}


function normalizeBoolean(
    value,
    defaultValue = true
) {
    if (
        value === true ||
        value === 1 ||
        value === '1' ||
        String(value).toLowerCase() === 'true' ||
        String(value).toLowerCase() === 'si' ||
        String(value).toLowerCase() === 'sí'
    ) {
        return true;
    }

    if (
        value === false ||
        value === 0 ||
        value === '0' ||
        String(value).toLowerCase() === 'false' ||
        String(value).toLowerCase() === 'no'
    ) {
        return false;
    }

    return defaultValue;
}


function buildPayload(
    body
) {
    const nombre =
        normalizeText(
            body.nombre,
            120
        );

    const fechaEspecial =
        parseDate(
            body.fechaEspecial
        );

    const inicioAviso =
        parseDate(
            body.inicioAviso
        );

    const fechaCorte =
        parseDate(
            body.fechaCorte
        );

    const finBloqueo =
        parseDate(
            body.finBloqueo
        );

    if (!nombre) {
        throw createHttpError(
            'El nombre de la fecha especial es obligatorio.'
        );
    }

    if (!fechaEspecial) {
        throw createHttpError(
            'La fecha especial no es válida.'
        );
    }

    if (!fechaCorte) {
        throw createHttpError(
            'La fecha de corte no es válida.'
        );
    }

    if (!finBloqueo) {
        throw createHttpError(
            'La fecha de finalización del bloqueo no es válida.'
        );
    }

    if (
        inicioAviso &&
        inicioAviso >= fechaCorte
    ) {
        throw createHttpError(
            'El aviso debe comenzar antes de la fecha de corte.'
        );
    }

    if (
        fechaCorte >= finBloqueo
    ) {
        throw createHttpError(
            'El final del bloqueo debe ser posterior a la fecha de corte.'
        );
    }

    return {
        nombre,

        fechaEspecial,

        inicioAviso,

        fechaCorte,

        finBloqueo,

        mensajeAviso:
            normalizeText(
                body.mensajeAviso,
                500
            ) || null,

        mensajeBloqueo:
            normalizeText(
                body.mensajeBloqueo,
                500
            ) || null,

        activo:
            normalizeBoolean(
                body.activo,
                true
            ),

        actualizadoEn:
            new Date()
    };
}


async function listarFechasEspeciales(
    req,
    res,
    next
) {
    try {
        const fechas =
            await FechaEspecial.findAll({
                order: [
                    [
                        'fechaEspecial',
                        'ASC'
                    ]
                ]
            });

        return res.status(200).json({
            ok: true,
            total:
                fechas.length,
            data:
                fechas
        });

    } catch (error) {
        return next(error);
    }
}


async function obtenerEstadoActual(
    req,
    res,
    next
) {
    try {
        const now =
            new Date();

        /*
         * Primero buscamos un bloqueo activo.
         */
        const bloqueo =
            await FechaEspecial.findOne({
                where: {
                    activo: true,

                    fechaCorte: {
                        [Op.lte]:
                            now
                    },

                    finBloqueo: {
                        [Op.gte]:
                            now
                    }
                },

                order: [
                    [
                        'fechaCorte',
                        'ASC'
                    ]
                ]
            });

        if (bloqueo) {
            return res.status(200).json({
                ok: true,

                data: {
                    estado:
                        'BLOQUEADO',

                    bloqueado:
                        true,

                    mostrarAviso:
                        false,

                    fecha:
                        bloqueo
                }
            });
        }

        /*
         * Si no estamos bloqueados,
         * buscamos una fecha cuyo aviso
         * ya haya comenzado.
         */
        const aviso =
            await FechaEspecial.findOne({
                where: {
                    activo: true,

                    inicioAviso: {
                        [Op.ne]:
                            null,

                        [Op.lte]:
                            now
                    },

                    fechaCorte: {
                        [Op.gt]:
                            now
                    }
                },

                order: [
                    [
                        'fechaCorte',
                        'ASC'
                    ]
                ]
            });

        if (aviso) {
            return res.status(200).json({
                ok: true,

                data: {
                    estado:
                        'AVISO',

                    bloqueado:
                        false,

                    mostrarAviso:
                        true,

                    fecha:
                        aviso
                }
            });
        }

        return res.status(200).json({
            ok: true,

            data: {
                estado:
                    'NORMAL',

                bloqueado:
                    false,

                mostrarAviso:
                    false,

                fecha:
                    null
            }
        });

    } catch (error) {
        return next(error);
    }
}


async function crearFechaEspecial(
    req,
    res,
    next
) {
    try {
        const payload =
            buildPayload(
                req.body
            );

        const fecha =
            await FechaEspecial.create(
                payload
            );

        return res.status(201).json({
            ok: true,
            data:
                fecha
        });

    } catch (error) {
        return next(error);
    }
}


async function actualizarFechaEspecial(
    req,
    res,
    next
) {
    try {
        const id =
            Number(
                req.params.id
            );

        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {
            return res.status(400).json({
                ok: false,
                message:
                    'ID no válido.'
            });
        }

        const fecha =
            await FechaEspecial.findByPk(
                id
            );

        if (!fecha) {
            return res.status(404).json({
                ok: false,
                message:
                    'Fecha especial no encontrada.'
            });
        }

        const payload =
            buildPayload(
                req.body
            );

        await fecha.update(
            payload
        );

        return res.status(200).json({
            ok: true,
            data:
                fecha
        });

    } catch (error) {
        return next(error);
    }
}


async function eliminarFechaEspecial(
    req,
    res,
    next
) {
    try {
        const id =
            Number(
                req.params.id
            );

        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {
            return res.status(400).json({
                ok: false,
                message:
                    'ID no válido.'
            });
        }

        const fecha =
            await FechaEspecial.findByPk(
                id
            );

        if (!fecha) {
            return res.status(404).json({
                ok: false,
                message:
                    'Fecha especial no encontrada.'
            });
        }

        await fecha.destroy();

        return res.status(200).json({
            ok: true,
            message:
                'Fecha especial eliminada.'
        });

    } catch (error) {
        return next(error);
    }
}


module.exports = {
    listarFechasEspeciales,
    obtenerEstadoActual,
    crearFechaEspecial,
    actualizarFechaEspecial,
    eliminarFechaEspecial
};