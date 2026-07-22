const sequelize = require('../config/database');

const {
    Pedido,
    HistorialPedido
} = require('../models');

const ESTADOS_PERMITIDOS = [
    'PENDIENTE',
    'RECIBIDO',
    'EN_DISENO',
    'LISTO_ENTREGA',
    'EN_CAMINO',
    'ENTREGADO',
    'CANCELADO'
];

const DESCRIPCIONES = {
    PENDIENTE:
        'El pedido está pendiente de confirmación de pago.',

    RECIBIDO:
        'El pago fue confirmado y el pedido fue recibido.',

    EN_DISENO:
        'El equipo comenzó la preparación del arreglo floral.',

    LISTO_ENTREGA:
        'El arreglo floral está listo para salir a entrega.',

    EN_CAMINO:
        'El pedido salió de la floristería y va en camino.',

    ENTREGADO:
        'El pedido fue entregado correctamente.',

    CANCELADO:
        'El pedido fue cancelado.'
};

function normalizarEstado(value) {
    return String(value || '')
        .trim()
        .toUpperCase()
        .replaceAll(' ', '_')
        .replaceAll('-', '_');
}

async function actualizarEstadoPedido(
    req,
    res,
    next
) {
    const transaction =
        await sequelize.transaction();

    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            await transaction.rollback();

            return res.status(400).json({
                ok: false,
                message:
                    'El ID del pedido no es válido.'
            });
        }

        const estado =
            normalizarEstado(req.body.estado);

        if (!ESTADOS_PERMITIDOS.includes(estado)) {
            await transaction.rollback();

            return res.status(400).json({
                ok: false,
                message:
                    'El estado enviado no es válido.',
                estadosPermitidos: ESTADOS_PERMITIDOS
            });
        }

        const pedido = await Pedido.findByPk(id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!pedido) {
            await transaction.rollback();

            return res.status(404).json({
                ok: false,
                message: 'Pedido no encontrado.'
            });
        }

        const estadoAnterior =
            normalizarEstado(pedido.estado);

        if (estadoAnterior === estado) {
            await transaction.rollback();

            return res.status(400).json({
                ok: false,
                message:
                    'El pedido ya tiene ese estado.'
            });
        }

        pedido.estado = estado;

        if (req.body.tipoPedido !== undefined) {
            pedido.tipoPedido =
                String(req.body.tipoPedido || '')
                    .trim() || null;
        }

        if (req.body.fechaEntrega !== undefined) {
            pedido.fechaEntrega =
                req.body.fechaEntrega || null;
        }

        if (
            req.body.ventanaEntrega !== undefined
        ) {
            pedido.ventanaEntrega =
                String(
                    req.body.ventanaEntrega || ''
                ).trim() || null;
        }

        await pedido.save({
            transaction
        });

        const descripcion =
            String(req.body.descripcion || '').trim() ||
            DESCRIPCIONES[estado];

        await HistorialPedido.create(
            {
                pedidoId: pedido.id,
                estado,
                descripcion
            },
            {
                transaction
            }
        );

        await transaction.commit();

        return res.status(200).json({
            ok: true,
            message:
                'Estado actualizado correctamente.',
            data: {
                id: pedido.id,
                codigoRastreo:
                    pedido.codigoRastreo,
                estadoAnterior,
                estado,
                actualizadoEn:
                    pedido.actualizadoEn
            }
        });
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
}

module.exports = {
    actualizarEstadoPedido
};