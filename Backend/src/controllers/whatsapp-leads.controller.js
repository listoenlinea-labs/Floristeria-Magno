const crypto = require('crypto');

const {
    Op
} = require('sequelize');

const sequelize = require('../config/database');

const {
    Producto,
    WhatsappLead,
    WhatsappLeadItem,
    WhatsappLeadEvento
} = require('../models');


function createHttpError(message, status = 400) {
    const error = new Error(message);
    error.status = status;

    return error;
}


function normalizeText(value, maxLength) {
    return String(value ?? '')
        .trim()
        .slice(0, maxLength);
}


function getWhatsappPhone() {
    const phone = String(
        process.env.WHATSAPP_SALES_PHONE || ''
    )
        .replace(/\D/g, '');

    if (!/^\d{10,15}$/.test(phone)) {
        throw createHttpError(
            'WHATSAPP_SALES_PHONE no está configurado correctamente',
            500
        );
    }

    return phone;
}


function createIpHash(req) {
    const secret = String(
        process.env.LEAD_HASH_SECRET || ''
    ).trim();

    if (!secret) {
        throw createHttpError(
            'Falta configurar LEAD_HASH_SECRET',
            500
        );
    }

    const ip = String(
        req.ip || 'unknown'
    );

    return crypto
        .createHmac(
            'sha256',
            secret
        )
        .update(ip)
        .digest('hex');
}


async function generateUniqueLeadCode(
    transaction
) {
    for (
        let attempt = 0;
        attempt < 10;
        attempt += 1
    ) {
        const randomPart = crypto
            .randomBytes(5)
            .toString('hex')
            .toUpperCase();

        const codigo =
            `WEB-${randomPart}`;

        const existing =
            await WhatsappLead.findOne({
                where: {
                    codigo
                },
                transaction
            });

        if (!existing) {
            return codigo;
        }
    }

    throw createHttpError(
        'No fue posible generar la referencia del contacto',
        500
    );
}


function normalizeRequestItems(
    requestItems
) {
    if (!Array.isArray(requestItems)) {
        return [];
    }

    if (requestItems.length > 30) {
        throw createHttpError(
            'El carrito contiene demasiados productos'
        );
    }

    const consolidated =
        new Map();

    requestItems.forEach(item => {
        const id =
            Number(item?.id);

        const quantity =
            Number(item?.quantity);

        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {
            return;
        }

        if (
            !Number.isInteger(quantity) ||
            quantity <= 0 ||
            quantity > 20
        ) {
            return;
        }

        const current =
            consolidated.get(id) || 0;

        const next =
            Math.min(
                current + quantity,
                20
            );

        consolidated.set(
            id,
            next
        );
    });

    return Array
        .from(
            consolidated.entries()
        )
        .map(
            ([id, quantity]) => ({
                id,
                quantity
            })
        );
}


async function buildCartSnapshot(
    requestItems,
    transaction
) {
    const normalizedItems =
        normalizeRequestItems(
            requestItems
        );

    if (!normalizedItems.length) {
        return {
            items: [],
            total: 0
        };
    }

    const productIds =
        normalizedItems.map(
            item => item.id
        );

    const products =
        await Producto.findAll({
            where: {
                id: {
                    [Op.in]:
                        productIds
                }
            },

            transaction
        });

    const productMap =
        new Map();

    products.forEach(instance => {
        const product =
            instance.get({
                plain: true
            });

        productMap.set(
            Number(product.id),
            product
        );
    });


    const items = [];

    for (
        const requestedItem
        of normalizedItems
    ) {
        const product =
            productMap.get(
                requestedItem.id
            );

        /*
         * Si un producto ya no existe,
         * simplemente no lo incluimos.
         */
        if (!product) {
            continue;
        }

        const name =
            normalizeText(
                product.nombre,
                150
            ) ||
            `Producto ${product.id}`;

        const price =
            Number(
                product.precio
            );

        if (
            !Number.isFinite(price) ||
            price < 0
        ) {
            continue;
        }

        const subtotal =
            price *
            requestedItem.quantity;

        items.push({
            productoId:
                Number(product.id),

            nombreProducto:
                name,

            cantidad:
                requestedItem.quantity,

            precioUnitario:
                price,

            subtotal
        });
    }


    const total =
        items.reduce(
            (
                sum,
                item
            ) =>
                sum +
                Number(
                    item.subtotal
                ),
            0
        );


    return {
        items,
        total
    };
}


function createWhatsappMessage({
    codigo,
    items,
    total
}) {
    let message =
        'Hola 👋 Vi sus arreglos en la página de Floristería Magno y quisiera información.';


    if (items.length) {
        const detail =
            items
                .map(
                    item =>
                        `• ${item.nombreProducto} x${item.cantidad}`
                )
                .join('\n');

        message +=
            `\n\nMe interesan:\n${detail}`;

        message +=
            `\n\nTotal estimado de mi carrito: $${Number(total).toFixed(2)} MXN`;
    }


    message +=
        `\n\nReferencia web: ${codigo}`;


    return message;
}


async function crearLeadWhatsapp(
    req,
    res,
    next
) {
    let transaction;

    try {
        const visitorId =
            normalizeText(
                req.body?.visitorId,
                100
            );

        if (
            visitorId.length < 10
        ) {
            throw createHttpError(
                'visitorId no válido'
            );
        }


        const paginaOrigen =
            normalizeText(
                req.body?.page,
                120
            ) || 'desconocida';


        const fuenteClick =
            normalizeText(
                req.body?.source,
                80
            ) || 'whatsapp';


        transaction =
            await sequelize.transaction();


        /*
         * MUY IMPORTANTE:
         * precios y totales salen de MySQL,
         * no de JavaScript.
         */
        const cartSnapshot =
            await buildCartSnapshot(
                req.body?.items,
                transaction
            );


        const codigo =
            await generateUniqueLeadCode(
                transaction
            );


        const ipHash =
            createIpHash(req);


        const lead =
            await WhatsappLead.create(
                {
                    codigo,
                    visitorId,
                    ipHash,

                    origen:
                        'WEB',

                    canal:
                        'WHATSAPP',

                    paginaOrigen,
                    fuenteClick,

                    estado:
                        'CREADO',

                    carritoTotal:
                        cartSnapshot.total
                },
                {
                    transaction
                }
            );


        if (
            cartSnapshot.items.length
        ) {
            const rows =
                cartSnapshot.items.map(
                    item => ({
                        leadId:
                            lead.id,

                        productoId:
                            item.productoId,

                        nombreProducto:
                            item.nombreProducto,

                        cantidad:
                            item.cantidad,

                        precioUnitario:
                            item.precioUnitario,

                        subtotal:
                            item.subtotal
                    })
                );


            await WhatsappLeadItem.bulkCreate(
                rows,
                {
                    transaction
                }
            );
        }


        await WhatsappLeadEvento.create(
            {
                leadId:
                    lead.id,

                tipo:
                    'WHATSAPP_CLICK',

                datosJson:
                    JSON.stringify({
                        paginaOrigen,
                        fuenteClick,

                        productos:
                            cartSnapshot
                                .items
                                .length,

                        carritoTotal:
                            cartSnapshot.total
                    })
            },
            {
                transaction
            }
        );


        await transaction.commit();

        transaction = null;


        const whatsappPhone =
            getWhatsappPhone();


        const message =
            createWhatsappMessage({
                codigo,

                items:
                    cartSnapshot.items,

                total:
                    cartSnapshot.total
            });


        const encodedMessage =
            encodeURIComponent(message);

        const whatsappMobileUrl =
            `https://wa.me/${whatsappPhone}?text=${encodedMessage}`;

        const whatsappWebUrl =
            `https://web.whatsapp.com/send?phone=${whatsappPhone}` +
            `&text=${encodedMessage}`;

        return res
            .status(201)
            .json({
                ok: true,

                leadId:
                    lead.id,

                leadCode:
                    codigo,

                whatsappMobileUrl,
                whatsappWebUrl
            });

    } catch (error) {

        if (transaction) {
            try {
                await transaction.rollback();
            } catch (
            rollbackError
            ) {
                console.error(
                    'Error revirtiendo lead:',
                    rollbackError
                );
            }
        }

        return next(error);
    }
}


module.exports = {
    crearLeadWhatsapp
};