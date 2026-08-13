const {
    Op
} = require('sequelize');

const {
    Cliente,
    Producto,
    Pedido,
    DetallePedido
} = require('../models');


const MONTH_NAMES = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre'
];


function validateYearMonth(
    yearValue,
    monthValue
) {
    const anio =
        Number(yearValue);

    const mes =
        Number(monthValue);

    if (
        !Number.isInteger(anio) ||
        anio < 2020 ||
        anio > 2100
    ) {
        return {
            error:
                'El año no es válido'
        };
    }

    if (
        !Number.isInteger(mes) ||
        mes < 1 ||
        mes > 12
    ) {
        return {
            error:
                'El mes no es válido'
        };
    }

    return {
        anio,
        mes
    };
}


function buildMonthRange(
    anio,
    mes
) {
    const start =
        new Date(
            anio,
            mes - 1,
            1,
            0,
            0,
            0,
            0
        );

    const end =
        new Date(
            anio,
            mes,
            1,
            0,
            0,
            0,
            0
        );

    return {
        start,
        end
    };
}


function buildYearRange(anio) {
    return {
        start:
            new Date(
                anio,
                0,
                1,
                0,
                0,
                0,
                0
            ),

        end:
            new Date(
                anio + 1,
                0,
                1,
                0,
                0,
                0,
                0
            )
    };
}


function normalizeChannel(value) {
    const channel =
        String(
            value || 'TODOS'
        )
            .trim()
            .toUpperCase();

    if (
        [
            'TODOS',
            'MERCADO_PAGO',
            'WHATSAPP'
        ].includes(
            channel
        )
    ) {
        return channel;
    }

    return 'TODOS';
}


function buildSalesWhere({
    start,
    end,
    channel
}) {
    const where = {
        estadoPago:
            'PAGADO',

        origen:
            'WEB',

        pagadoEn: {
            [Op.gte]:
                start,

            [Op.lt]:
                end
        }
    };

    if (
        channel !== 'TODOS'
    ) {
        where.canalCierre =
            channel;
    }

    return where;
}


const salesIncludes = [
    {
        model:
            Cliente,

        as:
            'cliente',

        required:
            false,

        attributes: [
            'id',
            'nombre',
            'telefono',
            'email',
            'direccion'
        ]
    },

    {
        model:
            DetallePedido,

        as:
            'detalles',

        required:
            false,

        attributes: [
            'id',
            'productoId',
            'cantidad',
            'precioUnitario',
            'subtotal'
        ],

        include: [
            {
                model:
                    Producto,

                as:
                    'producto',

                required:
                    false,

                attributes: [
                    'id',
                    'nombre',
                    'imagenUrl',
                    'categoria'
                ]
            }
        ]
    }
];


function serializeSale(
    pedido
) {
    const plain =
        typeof pedido.get === 'function'
            ? pedido.get({
                plain: true
            })
            : pedido;

    return {
        id:
            plain.id,

        codigoRastreo:
            plain.codigoRastreo,

        total:
            Number(
                plain.total || 0
            ),

        estado:
            plain.estado,

        estadoPago:
            plain.estadoPago,

        pagadoEn:
            plain.pagadoEn,

        metodoPago:
            plain.metodoPago,

        referenciaPago:
            plain.referenciaPago,

        origen:
            plain.origen,

        canalCierre:
            plain.canalCierre,

        fechaEntrega:
            plain.fechaEntrega,

        ventanaEntrega:
            plain.ventanaEntrega,

        nombreDestinatario:
            plain.nombreDestinatario,

        telefonoDestinatario:
            plain.telefonoDestinatario,

        direccionEntrega:
            plain.direccionEntrega,

        referenciasEntrega:
            plain.referenciasEntrega,

        mensajeTarjeta:
            plain.mensajeTarjeta,

        cliente:
            plain.cliente || null,

        detalles:
            Array.isArray(
                plain.detalles
            )
                ? plain.detalles.map(
                    detail => ({
                        id:
                            detail.id,

                        productoId:
                            detail.productoId,

                        cantidad:
                            Number(
                                detail.cantidad || 0
                            ),

                        precioUnitario:
                            Number(
                                detail.precioUnitario || 0
                            ),

                        subtotal:
                            Number(
                                detail.subtotal || 0
                            ),

                        producto:
                            detail.producto || null
                    })
                )
                : []
    };
}


function buildProductsRanking(
    sales
) {
    const productMap =
        new Map();

    sales.forEach(
        sale => {
            const details =
                Array.isArray(
                    sale.detalles
                )
                    ? sale.detalles
                    : [];

            details.forEach(
                detail => {
                    const productId =
                        Number(
                            detail.productoId
                        );

                    const key =
                        Number.isInteger(
                            productId
                        )
                            ? String(
                                productId
                            )
                            : String(
                                detail.producto?.nombre ||
                                'producto'
                            );

                    if (
                        !productMap.has(
                            key
                        )
                    ) {
                        productMap.set(
                            key,
                            {
                                productoId:
                                    productId || null,

                                nombre:
                                    detail.producto?.nombre ||
                                    'Producto',

                                imagenUrl:
                                    detail.producto?.imagenUrl ||
                                    '',

                                cantidad:
                                    0,

                                ingresos:
                                    0
                            }
                        );
                    }

                    const item =
                        productMap.get(
                            key
                        );

                    item.cantidad +=
                        Number(
                            detail.cantidad || 0
                        );

                    item.ingresos +=
                        Number(
                            detail.subtotal || 0
                        );
                }
            );
        }
    );

    return Array
        .from(
            productMap.values()
        )
        .sort(
            (
                a,
                b
            ) =>
                b.cantidad -
                a.cantidad
        );
}


async function obtenerDashboardVentas(
    req,
    res,
    next
) {
    try {
        const validation =
            validateYearMonth(
                req.query.anio,
                req.query.mes
            );

        if (
            validation.error
        ) {
            return res
                .status(400)
                .json({
                    ok: false,
                    message:
                        validation.error
                });
        }

        const {
            anio,
            mes
        } =
            validation;

        const channel =
            normalizeChannel(
                req.query.canal
            );

        /*
         * ==================================================
         * VENTAS DEL MES SELECCIONADO
         * ==================================================
         */

        const monthRange =
            buildMonthRange(
                anio,
                mes
            );

        const monthlyOrders =
            await Pedido.findAll({
                where:
                    buildSalesWhere({
                        start:
                            monthRange.start,

                        end:
                            monthRange.end,

                        channel
                    }),

                include:
                    salesIncludes,

                order: [
                    [
                        'pagadoEn',
                        'DESC'
                    ],
                    [
                        'id',
                        'DESC'
                    ]
                ]
            });

        const sales =
            monthlyOrders.map(
                serializeSale
            );


        const totalSales =
            sales.reduce(
                (
                    total,
                    sale
                ) =>
                    total +
                    Number(
                        sale.total || 0
                    ),
                0
            );


        const numberOfSales =
            sales.length;


        const averageTicket =
            numberOfSales
                ? totalSales /
                numberOfSales
                : 0;


        const mercadoPagoTotal =
            sales
                .filter(
                    sale =>
                        sale.canalCierre ===
                        'MERCADO_PAGO'
                )
                .reduce(
                    (
                        total,
                        sale
                    ) =>
                        total +
                        Number(
                            sale.total || 0
                        ),
                    0
                );


        const whatsappTotal =
            sales
                .filter(
                    sale =>
                        sale.canalCierre ===
                        'WHATSAPP'
                )
                .reduce(
                    (
                        total,
                        sale
                    ) =>
                        total +
                        Number(
                            sale.total || 0
                        ),
                    0
                );


        /*
         * ==================================================
         * VENTAS ANUALES
         * ==================================================
         */

        const yearRange =
            buildYearRange(
                anio
            );

        const annualOrders =
            await Pedido.findAll({
                where:
                    buildSalesWhere({
                        start:
                            yearRange.start,

                        end:
                            yearRange.end,

                        channel
                    }),

                attributes: [
                    'id',
                    'total',
                    'pagadoEn'
                ],

                order: [
                    [
                        'pagadoEn',
                        'ASC'
                    ]
                ]
            });


        const annual =
            MONTH_NAMES.map(
                (
                    monthName,
                    index
                ) => ({
                    mes:
                        index + 1,

                    nombre:
                        monthName,

                    total:
                        0,

                    ventas:
                        0
                })
            );


        annualOrders.forEach(
            order => {
                if (
                    !order.pagadoEn
                ) {
                    return;
                }

                const date =
                    new Date(
                        order.pagadoEn
                    );

                const index =
                    date.getMonth();

                if (
                    index < 0 ||
                    index > 11
                ) {
                    return;
                }

                annual[index].total +=
                    Number(
                        order.total || 0
                    );

                annual[index].ventas +=
                    1;
            }
        );


        /*
         * ==================================================
         * COMPARACIÓN MES ANTERIOR
         * ==================================================
         */

        let previousYear =
            anio;

        let previousMonth =
            mes - 1;

        if (
            previousMonth === 0
        ) {
            previousMonth = 12;
            previousYear -= 1;
        }


        const previousRange =
            buildMonthRange(
                previousYear,
                previousMonth
            );


        const previousOrders =
            await Pedido.findAll({
                where:
                    buildSalesWhere({
                        start:
                            previousRange.start,

                        end:
                            previousRange.end,

                        channel
                    }),

                attributes: [
                    'total'
                ]
            });


        const previousTotal =
            previousOrders.reduce(
                (
                    total,
                    order
                ) =>
                    total +
                    Number(
                        order.total || 0
                    ),
                0
            );


        let variationPercent =
            null;


        if (
            previousTotal > 0
        ) {
            variationPercent =
                (
                    (
                        totalSales -
                        previousTotal
                    ) /
                    previousTotal
                ) * 100;
        } else if (
            totalSales > 0
        ) {
            variationPercent =
                100;
        }


        /*
         * ==================================================
         * PRODUCTOS DEL MES
         * ==================================================
         */

        const popularProducts =
            buildProductsRanking(
                sales
            );


        const mostSold =
            popularProducts[0] ||
            null;


        const mostRevenue =
            [...popularProducts]
                .sort(
                    (
                        a,
                        b
                    ) =>
                        b.ingresos -
                        a.ingresos
                )[0] ||
            null;


        return res
            .status(200)
            .json({
                ok: true,

                data: {
                    filtros: {
                        anio,
                        mes,
                        canal:
                            channel
                    },

                    resumen: {
                        totalVentas:
                            totalSales,

                        numeroVentas:
                            numberOfSales,

                        ticketPromedio:
                            averageTicket,

                        mercadoPago:
                            mercadoPagoTotal,

                        whatsapp:
                            whatsappTotal,

                        mesAnterior:
                            previousTotal,

                        variacionPorcentaje:
                            variationPercent
                    },

                    anual:
                        annual,

                    productos: {
                        ranking:
                            popularProducts,

                        masVendido:
                            mostSold,

                        mayorIngreso:
                            mostRevenue
                    },

                    ventas:
                        sales
                }
            });
    } catch (error) {
        next(error);
    }
}


module.exports = {
    obtenerDashboardVentas
};