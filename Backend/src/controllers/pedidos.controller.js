const {
    Op,
    fn,
    col
} = require('sequelize');

const {
    Cliente,
    Producto,
    Pedido,
    DetallePedido,
    HistorialPedido
} = require('../models');

const pedidoAttributes = [
    'id',
    'codigoRastreo',
    'clienteId',
    'nombreDestinatario',
    'telefonoDestinatario',
    'direccionEntrega',
    'referenciasEntrega',
    'total',
    'estado',
    'tipoPedido',
    'fechaEntrega',
    'ventanaEntrega',
    'mensajeTarjeta',
    'metodoPago',
    'estadoPago',
    'referenciaPago',
    'comprobanteUrl',
    'creadoEn',
    'actualizadoEn'
];

const pedidoIncludes = [
    {
        model: Cliente,
        as: 'cliente',
        attributes: [
            'id',
            'nombre',
            'telefono',
            'email',
            'direccion'
        ],
        required: false
    },
    {
        model: DetallePedido,
        as: 'detalles',
        attributes: [
            'id',
            'pedidoId',
            'productoId',
            'cantidad',
            'precioUnitario',
            'subtotal'
        ],
        include: [
            {
                model: Producto,
                as: 'producto',
                attributes: [
                    'id',
                    'nombre',
                    'descripcion',
                    'precio',
                    'imagenUrl'
                ],
                required: false
            }
        ],
        required: false
    },
    {
        model: HistorialPedido,
        as: 'historial',
        attributes: [
            'id',
            'estado',
            'descripcion',
            'creadoEn'
        ],
        required: false,
        separate: true,
        order: [
            ['creadoEn', 'ASC'],
            ['id', 'ASC']
        ]
    }
];

function fechaValida(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(
        String(value || '')
    );
}

async function listarPedidos(req, res, next) {
    try {
        const {
            estado,
            clienteId,
            fechaEntrega,
            busqueda
        } = req.query;

        const where = {};

        if (estado && estado.trim()) {
            where.estado = estado
                .trim()
                .toUpperCase();
        }

        if (clienteId !== undefined) {
            const clienteIdNumero = Number(clienteId);

            if (
                !Number.isInteger(clienteIdNumero) ||
                clienteIdNumero <= 0
            ) {
                return res.status(400).json({
                    ok: false,
                    message:
                        'El ID del cliente no es válido'
                });
            }

            where.clienteId = clienteIdNumero;
        }

        if (fechaEntrega && fechaEntrega.trim()) {
            if (!fechaValida(fechaEntrega.trim())) {
                return res.status(400).json({
                    ok: false,
                    message:
                        'La fecha de entrega debe usar YYYY-MM-DD'
                });
            }

            where.fechaEntrega = fechaEntrega.trim();
        }

        if (busqueda && busqueda.trim()) {
            const text = `%${busqueda.trim()}%`;

            where[Op.or] = [
                {
                    codigoRastreo: {
                        [Op.like]: text
                    }
                },
                {
                    nombreDestinatario: {
                        [Op.like]: text
                    }
                },
                {
                    telefonoDestinatario: {
                        [Op.like]: text
                    }
                }
            ];
        }

        const pedidos = await Pedido.findAll({
            where,
            attributes: pedidoAttributes,
            include: pedidoIncludes,
            order: [
                ['fechaEntrega', 'ASC'],
                ['creadoEn', 'DESC'],
                ['id', 'DESC']
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

async function obtenerPedido(req, res, next) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                ok: false,
                message:
                    'El ID del pedido no es válido'
            });
        }

        const pedido = await Pedido.findByPk(id, {
            attributes: pedidoAttributes,
            include: pedidoIncludes
        });

        if (!pedido) {
            return res.status(404).json({
                ok: false,
                message: 'Pedido no encontrado'
            });
        }

        return res.status(200).json({
            ok: true,
            data: pedido
        });
    } catch (error) {
        next(error);
    }
}

async function obtenerCalendarioPedidos(
    req,
    res,
    next
) {
    try {
        const anio = Number(req.query.anio);
        const mes = Number(req.query.mes);

        if (
            !Number.isInteger(anio) ||
            anio < 2000 ||
            anio > 2100
        ) {
            return res.status(400).json({
                ok: false,
                message: 'El año no es válido'
            });
        }

        if (
            !Number.isInteger(mes) ||
            mes < 1 ||
            mes > 12
        ) {
            return res.status(400).json({
                ok: false,
                message: 'El mes no es válido'
            });
        }

        const firstDay =
            `${anio}-${String(mes).padStart(2, '0')}-01`;

        const nextMonthDate =
            mes === 12
                ? `${anio + 1}-01-01`
                : `${anio}-${String(
                    mes + 1
                ).padStart(2, '0')}-01`;

        const resultados = await Pedido.findAll({
            attributes: [
                'fechaEntrega',
                [
                    fn('COUNT', col('Pedido.id')),
                    'cantidad'
                ]
            ],
            where: {
                fechaEntrega: {
                    [Op.gte]: firstDay,
                    [Op.lt]: nextMonthDate
                }
            },
            group: [
                'fechaEntrega'
            ],
            order: [
                ['fechaEntrega', 'ASC']
            ],
            raw: true
        });

        const dias = {};

        resultados.forEach((item) => {
            if (item.fechaEntrega) {
                dias[item.fechaEntrega] =
                    Number(item.cantidad || 0);
            }
        });

        return res.status(200).json({
            ok: true,
            data: {
                anio,
                mes,
                dias
            }
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    listarPedidos,
    obtenerPedido,
    obtenerCalendarioPedidos
};