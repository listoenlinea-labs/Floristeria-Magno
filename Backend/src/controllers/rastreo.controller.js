const Pedido = require('../models/Pedido');

const configuracionEstados = {
    PENDIENTE: {
        paso: 0,
        etiqueta: 'Pedido recibido',
        titulo: 'Recibimos tu pedido.',
        descripcion:
            'Tu pedido fue registrado correctamente y está pendiente de comenzar su preparación.'
    },

    RECIBIDO: {
        paso: 0,
        etiqueta: 'Pedido recibido',
        titulo: 'Recibimos tu pedido.',
        descripcion:
            'Tu pedido fue registrado correctamente y nuestro equipo comenzará a prepararlo.'
    },

    EN_DISENO: {
        paso: 1,
        etiqueta: 'En diseño floral',
        titulo: 'Tu arreglo está en diseño floral.',
        descripcion:
            'Estamos preparando tu pedido con cuidado. Cada arreglo es único y puede tener variaciones naturales según la temporada.'
    },

    LISTO_ENTREGA: {
        paso: 2,
        etiqueta: 'Listo para entrega',
        titulo: 'Tu pedido está listo para entrega.',
        descripcion:
            'Terminamos de preparar tu arreglo floral y estamos coordinando su salida.'
    },

    EN_CAMINO: {
        paso: 3,
        etiqueta: 'En camino',
        titulo: 'Tu pedido va en camino.',
        descripcion:
            'El arreglo ya salió para entrega. Te recomendamos tener disponible tu teléfono.'
    },

    ENTREGADO: {
        paso: 4,
        etiqueta: 'Entregado',
        titulo: 'Tu pedido fue entregado.',
        descripcion:
            'Gracias por confiar en Juan H Magno. Esperamos que este detalle haya acompañado un momento especial.'
    },

    CANCELADO: {
        paso: 0,
        etiqueta: 'Pedido cancelado',
        titulo: 'Este pedido fue cancelado.',
        descripcion:
            'Comunícate con nuestro equipo por WhatsApp si necesitas más información.'
    }
};

function normalizarEstado(estado) {
    return String(estado || 'PENDIENTE')
        .trim()
        .toUpperCase()
        .replaceAll(' ', '_')
        .replaceAll('-', '_');
}

async function rastrearPedido(req, res, next) {
    try {
        const codigoRastreo = String(
            req.params.codigoRastreo || ''
        )
            .trim()
            .toUpperCase();

        /*
         * Evita consultas con formatos arbitrarios.
         * Ejemplo válido: JHM-000001
         */
        if (!/^JHM-\d{6}$/.test(codigoRastreo)) {
            return res.status(400).json({
                ok: false,
                message:
                    'El código debe tener el formato JHM-000001.'
            });
        }

        const pedido = await Pedido.findOne({
            where: {
                codigoRastreo
            },
            attributes: [
                'codigoRastreo',
                'estado',
                'tipoPedido',
                'fechaEntrega',
                'ventanaEntrega',
                'creadoEn',
                'actualizadoEn'
            ]
        });

        if (!pedido) {
            return res.status(404).json({
                ok: false,
                message:
                    'No encontramos un pedido con ese código.'
            });
        }

        const estado = normalizarEstado(pedido.estado);

        const configuracion =
            configuracionEstados[estado] ||
            configuracionEstados.PENDIENTE;

        /*
         * Evita que navegadores o proxies guarden información
         * desactualizada del pedido.
         */
        res.setHeader(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, private'
        );

        return res.status(200).json({
            ok: true,
            data: {
                codigoRastreo: pedido.codigoRastreo,
                estado,
                paso: configuracion.paso,
                etiqueta: configuracion.etiqueta,
                titulo: configuracion.titulo,
                descripcion: configuracion.descripcion,
                tipoPedido:
                    pedido.tipoPedido || 'Arreglo floral',
                fechaEntrega: pedido.fechaEntrega,
                ventanaEntrega:
                    pedido.ventanaEntrega || 'Por confirmar',
                creadoEn: pedido.creadoEn,
                actualizadoEn: pedido.actualizadoEn
            }
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    rastrearPedido
};