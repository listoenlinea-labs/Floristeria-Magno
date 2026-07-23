const crypto = require('crypto');

const sequelize =
    require('../config/database');

const {
    Pedido,
    RastreoUbicacion,
    HistorialPedido
} = require('../models');

function validarCoordenada(value) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}

function tokenSeguro() {
    return crypto
        .randomBytes(32)
        .toString('hex');
}

async function generarAccesoRepartidor(
    req,
    res,
    next
) {
    try {
        const pedidoId =
            Number(req.params.id);

        if (
            !Number.isInteger(pedidoId) ||
            pedidoId <= 0
        ) {
            return res.status(400).json({
                ok: false,
                message:
                    'El ID del pedido no es válido.'
            });
        }

        const pedido =
            await Pedido.findByPk(pedidoId);

        if (!pedido) {
            return res.status(404).json({
                ok: false,
                message:
                    'Pedido no encontrado.'
            });
        }

        if (!pedido.tokenRepartidor) {
            pedido.tokenRepartidor =
                tokenSeguro();

            await pedido.save();
        }

        return res.status(200).json({
            ok: true,
            data: {
                pedidoId: pedido.id,
                codigoRastreo:
                    pedido.codigoRastreo,
                token:
                    pedido.tokenRepartidor
            }
        });
    } catch (error) {
        next(error);
    }
}

async function iniciarRastreo(
    req,
    res,
    next
) {
    const transaction =
        await sequelize.transaction();

    try {
        const pedidoId =
            Number(req.params.id);

        if (
            !Number.isInteger(pedidoId) ||
            pedidoId <= 0
        ) {
            await transaction.rollback();

            return res.status(400).json({
                ok: false,
                message:
                    'El ID del pedido no es válido.'
            });
        }

        const pedido =
            await Pedido.findByPk(
                pedidoId,
                {
                    transaction,
                    lock:
                        transaction.LOCK.UPDATE
                }
            );

        if (!pedido) {
            await transaction.rollback();

            return res.status(404).json({
                ok: false,
                message:
                    'Pedido no encontrado.'
            });
        }

        const estadoActual =
            String(pedido.estado || '')
                .trim()
                .toUpperCase();

        if (
            estadoActual !==
            'LISTO_ENTREGA' &&
            estadoActual !==
            'EN_CAMINO'
        ) {
            await transaction.rollback();

            return res.status(409).json({
                ok: false,
                message:
                    'Solo se puede iniciar una entrega que esté lista para entrega.'
            });
        }

        const yaEstabaEnCamino =
            estadoActual === 'EN_CAMINO' &&
            pedido.rastreoActivo === true;

        pedido.rastreoActivo = true;

        if (!pedido.rastreoIniciadoEn) {
            pedido.rastreoIniciadoEn =
                new Date();
        }

        pedido.rastreoFinalizadoEn = null;
        pedido.estado = 'EN_CAMINO';

        await pedido.save({
            transaction
        });

        if (!yaEstabaEnCamino) {
            await HistorialPedido.create(
                {
                    pedidoId: pedido.id,
                    estado: 'EN_CAMINO',
                    descripcion:
                        'El repartidor inició la entrega y el rastreo en vivo.'
                },
                {
                    transaction
                }
            );
        }

        await transaction.commit();

        return res.status(200).json({
            ok: true,
            data: {
                id: pedido.id,
                codigoRastreo:
                    pedido.codigoRastreo,
                estado: pedido.estado,
                rastreoActivo: true
            }
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
}

async function actualizarUbicacion(
    req,
    res,
    next
) {
    try {
        const pedidoId =
            Number(req.params.id);

        if (
            !Number.isInteger(pedidoId) ||
            pedidoId <= 0
        ) {
            return res.status(400).json({
                ok: false,
                message:
                    'El ID del pedido no es válido.'
            });
        }

        const latitud =
            validarCoordenada(
                req.body.latitud
            );

        const longitud =
            validarCoordenada(
                req.body.longitud
            );

        const precisionMetros =
            validarCoordenada(
                req.body.precisionMetros
            );

        const velocidadMps =
            validarCoordenada(
                req.body.velocidadMps
            );

        const rumboGrados =
            validarCoordenada(
                req.body.rumboGrados
            );

        if (
            latitud === null ||
            longitud === null ||
            latitud < -90 ||
            latitud > 90 ||
            longitud < -180 ||
            longitud > 180
        ) {
            return res.status(400).json({
                ok: false,
                message:
                    'Las coordenadas no son válidas.'
            });
        }

        const pedido =
            await Pedido.findOne({
                where: {
                    id: pedidoId,
                    estado: 'EN_CAMINO',
                    rastreoActivo: true
                }
            });

        if (!pedido) {
            return res.status(409).json({
                ok: false,
                message:
                    'El pedido no está en camino o el rastreo no está activo.'
            });
        }

        const ahora = new Date();

        await Promise.all([
            RastreoUbicacion.create({
                pedidoId: pedido.id,
                latitud,
                longitud,
                precisionMetros,
                velocidadMps,
                rumboGrados,
                registradoEn: ahora
            }),

            pedido.update({
                ultimaLatitud: latitud,
                ultimaLongitud: longitud,
                ultimaPrecisionMetros:
                    precisionMetros,
                ultimaUbicacionEn: ahora
            })
        ]);

        const io = req.app.get('io');

        if (io) {
            io
                .to(
                    `pedido:${pedido.codigoRastreo}`
                )
                .emit(
                    'rastreo:ubicacion',
                    {
                        codigoRastreo:
                            pedido.codigoRastreo,

                        latitud,
                        longitud,
                        precisionMetros,
                        velocidadMps,
                        rumboGrados,
                        registradoEn: ahora
                    }
                );
        }

        return res.status(200).json({
            ok: true,
            data: {
                registradoEn: ahora
            }
        });
    } catch (error) {
        next(error);
    }
}

async function finalizarRastreo(
    req,
    res,
    next
) {
    const transaction =
        await sequelize.transaction();

    try {
        const pedidoId =
            Number(req.params.id);

        if (
            !Number.isInteger(pedidoId) ||
            pedidoId <= 0
        ) {
            await transaction.rollback();

            return res.status(400).json({
                ok: false,
                message:
                    'El ID del pedido no es válido.'
            });
        }

        const pedido =
            await Pedido.findByPk(
                pedidoId,
                {
                    transaction,
                    lock:
                        transaction.LOCK.UPDATE
                }
            );

        if (!pedido) {
            await transaction.rollback();

            return res.status(404).json({
                ok: false,
                message:
                    'Pedido no encontrado.'
            });
        }

        const estadoActual =
            String(pedido.estado || '')
                .trim()
                .toUpperCase();

        if (estadoActual !== 'EN_CAMINO') {
            await transaction.rollback();

            return res.status(409).json({
                ok: false,
                message:
                    'Solo se puede finalizar un pedido que esté en camino.'
            });
        }

        pedido.rastreoActivo = false;
        pedido.rastreoFinalizadoEn =
            new Date();
        pedido.estado = 'ENTREGADO';

        await pedido.save({
            transaction
        });

        await HistorialPedido.create(
            {
                pedidoId: pedido.id,
                estado: 'ENTREGADO',
                descripcion:
                    'El repartidor confirmó la entrega.'
            },
            {
                transaction
            }
        );

        await transaction.commit();

        const io = req.app.get('io');

        if (io) {
            io
                .to(
                    `pedido:${pedido.codigoRastreo}`
                )
                .emit(
                    'rastreo:finalizado',
                    {
                        codigoRastreo:
                            pedido.codigoRastreo,
                        estado: 'ENTREGADO'
                    }
                );
        }

        return res.status(200).json({
            ok: true,
            data: {
                estado: 'ENTREGADO',
                rastreoActivo: false
            }
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
}

async function obtenerUbicacionPublica(
    req,
    res,
    next
) {
    try {
        const codigo =
            String(
                req.params.codigoRastreo ||
                ''
            )
                .trim()
                .toUpperCase();

        const pedido =
            await Pedido.findOne({
                where: {
                    codigoRastreo:
                        codigo
                },
                attributes: [
                    'codigoRastreo',
                    'estado',
                    'rastreoActivo',
                    'ultimaLatitud',
                    'ultimaLongitud',
                    'ultimaPrecisionMetros',
                    'ultimaUbicacionEn'
                ]
            });

        if (!pedido) {
            return res.status(404).json({
                ok: false,
                message:
                    'Pedido no encontrado.'
            });
        }

        return res.status(200).json({
            ok: true,
            data: {
                codigoRastreo:
                    pedido.codigoRastreo,
                estado:
                    pedido.estado,
                rastreoActivo:
                    pedido.rastreoActivo,
                ubicacion:
                    pedido.ultimaLatitud !== null &&
                        pedido.ultimaLongitud !== null
                        ? {
                            latitud:
                                Number(
                                    pedido.ultimaLatitud
                                ),
                            longitud:
                                Number(
                                    pedido.ultimaLongitud
                                ),
                            precisionMetros:
                                pedido.ultimaPrecisionMetros !== null
                                    ? Number(
                                        pedido.ultimaPrecisionMetros
                                    )
                                    : null,
                            actualizadoEn:
                                pedido.ultimaUbicacionEn
                        }
                        : null
            }
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    generarAccesoRepartidor,
    iniciarRastreo,
    actualizarUbicacion,
    finalizarRastreo,
    obtenerUbicacionPublica
};