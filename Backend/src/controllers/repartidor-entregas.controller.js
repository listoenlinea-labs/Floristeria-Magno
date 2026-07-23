const {
    Op
} = require('sequelize');

const {
    Cliente,
    Producto,
    Pedido,
    DetallePedido
} = require('../models');

const ESTADOS_VISIBLES_REPARTIDOR = [
    'LISTO_ENTREGA',
    'EN_CAMINO',
    'ENTREGADO'
];

function fechaValida(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(
        String(value || '')
    );
}

async function listarEntregasRepartidor(
    req,
    res,
    next
) {
    try {
        const fecha =
            String(req.query.fecha || '')
                .trim();

        if (!fechaValida(fecha)) {
            return res.status(400).json({
                ok: false,
                message:
                    'La fecha debe utilizar el formato YYYY-MM-DD.'
            });
        }

        const pedidos = await Pedido.findAll({
            where: {
                fechaEntrega: fecha,

                estado: {
                    [Op.in]:
                        ESTADOS_VISIBLES_REPARTIDOR
                }
            },

            attributes: [
                'id',
                'codigoRastreo',
                'estado',
                'tipoPedido',
                'fechaEntrega',
                'ventanaEntrega',
                'nombreDestinatario',
                'telefonoDestinatario',
                'direccionEntrega',
                'referenciasEntrega',
                'rastreoActivo',
                'rastreoIniciadoEn',
                'ultimaUbicacionEn'
            ],

            include: [
                {
                    model: Cliente,
                    as: 'cliente',
                    attributes: [
                        'nombre',
                        'telefono'
                    ],
                    required: false
                },

                {
                    model: DetallePedido,
                    as: 'detalles',
                    attributes: [
                        'id',
                        'cantidad'
                    ],

                    include: [
                        {
                            model: Producto,
                            as: 'producto',
                            attributes: [
                                'id',
                                'nombre',
                                'imagenUrl'
                            ],
                            required: false
                        }
                    ],

                    required: false
                }
            ],

            order: [
                ['ventanaEntrega', 'ASC'],
                ['id', 'ASC']
            ]
        });

        return res.status(200).json({
            ok: true,
            total: pedidos.length,
            data: pedidos
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    listarEntregasRepartidor
};