const crypto = require('crypto');

const {
    Op
} = require('sequelize');

const sequelize = require('../config/database');

const {
    MercadoPagoConfig,
    Preference,
    Payment,
    WebhookSignatureValidator,
    InvalidWebhookSignatureError
} = require('mercadopago');

const {
    Cliente,
    Producto,
    Pedido,
    DetallePedido,
    HistorialPedido
} = require('../models');

const {
    enviarCorreoCodigoRastreo
} = require('../services/email.service');

const DELIVERY_COST = Number(process.env.DELIVERY_COST || 120);

const ALLOWED_DELIVERY_SLOTS = new Set([
    '11:00 am – 1:00 pm',
    '1:00 pm – 3:00 pm',
    '3:00 pm – 7:00 pm'
]);

function createHttpError(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function configurationError(message) {
    return createHttpError(message, 500);
}

function getClient() {
    const accessToken = String(process.env.MP_ACCESS_TOKEN || '').trim();

    if (!accessToken) {
        throw configurationError(
            'Falta configurar MP_ACCESS_TOKEN en las variables de entorno'
        );
    }

    return new MercadoPagoConfig({
        accessToken,
        options: {
            timeout: 8000
        }
    });
}

function getAbsoluteUrl(variableName) {
    const rawValue = String(process.env[variableName] || '')
        .trim()
        .replace(/\/+$/, '');

    if (!rawValue) {
        throw configurationError(
            `Falta configurar ${variableName} en las variables de entorno`
        );
    }

    let parsed;

    try {
        parsed = new URL(rawValue);
    } catch (error) {
        throw configurationError(`${variableName} no contiene una URL válida`);
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw configurationError(`${variableName} debe comenzar con http o https`);
    }

    return rawValue;
}

function normalizeText(value, maxLength) {
    return String(value ?? '').trim().slice(0, maxLength);
}

function validateDelivery(delivery) {
    const receiverName = normalizeText(
        delivery?.receiverName,
        150
    );

    const customerEmail = normalizeText(
        delivery?.customerEmail,
        150
    ).toLowerCase();

    const address = normalizeText(
        delivery?.address,
        300
    );

    const date = normalizeText(
        delivery?.date,
        10
    );

    const slot = normalizeText(
        delivery?.slot,
        40
    );

    if (receiverName.length < 2) {
        throw createHttpError(
            'Escribe el nombre de quien recibe'
        );
    }

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(customerEmail)) {
        throw createHttpError(
            'Escribe un correo electrónico válido'
        );
    }

    if (address.length < 5) {
        throw createHttpError(
            'Escribe una dirección de entrega válida'
        );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw createHttpError(
            'Selecciona una fecha de entrega válida'
        );
    }

    if (!ALLOWED_DELIVERY_SLOTS.has(slot)) {
        throw createHttpError(
            'Selecciona un horario de entrega válido'
        );
    }

    return {
        receiverName,
        customerEmail,
        address,
        date,
        slot
    };
}

function generarCodigoRastreo() {
    const datePart = new Date()
        .toISOString()
        .slice(2, 10)
        .replaceAll('-', '');

    const randomPart = crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase();

    return `JHM-${datePart}-${randomPart}`;
}

async function generarCodigoRastreoUnico(
    transaction
) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const codigoRastreo =
            generarCodigoRastreo();

        const existingOrder =
            await Pedido.findOne({
                where: {
                    codigoRastreo
                },
                transaction
            });

        if (!existingOrder) {
            return codigoRastreo;
        }
    }

    throw configurationError(
        'No fue posible generar un código de rastreo único'
    );
}

function calcularSubtotalProductos(items) {
    return items.reduce(
        (total, item) =>
            total +
            (
                Number(item.unit_price) *
                Number(item.quantity)
            ),
        0
    );
}

async function crearClientePedidoYDetalles({
    items,
    delivery,
    codigoRastreo,
    total,
    transaction
}) {
    let cliente = await Cliente.findOne({
        where: {
            email: delivery.customerEmail
        },
        transaction
    });

    if (cliente) {
        await cliente.update(
            {
                nombre: delivery.receiverName,
                direccion: delivery.address
            },
            {
                transaction
            }
        );
    } else {
        cliente = await Cliente.create(
            {
                nombre: delivery.receiverName,
                email: delivery.customerEmail,
                direccion: delivery.address
            },
            {
                transaction
            }
        );
    }

    const pedido = await Pedido.create(
        {
            codigoRastreo,
            clienteId: cliente.id,
            nombreDestinatario:
                delivery.receiverName,
            direccionEntrega:
                delivery.address,
            total,
            estado: 'PENDIENTE',
            tipoPedido: 'CATALOGO_WEB',
            fechaEntrega: delivery.date,
            ventanaEntrega: delivery.slot,
            metodoPago: 'MERCADO_PAGO',
            estadoPago: 'PENDIENTE'
        },
        {
            transaction
        }
    );

    const detailRows = items.map(item => ({
        pedidoId: pedido.id,
        productoId: Number(item.id),
        cantidad: Number(item.quantity),
        precioUnitario:
            Number(item.unit_price),
        subtotal:
            Number(item.unit_price) *
            Number(item.quantity)
    }));

    await DetallePedido.bulkCreate(
        detailRows,
        {
            transaction
        }
    );

    await HistorialPedido.create(
        {
            pedidoId: pedido.id,
            estado: 'PENDIENTE',
            descripcion:
                'Pedido creado desde el carrito web'
        },
        {
            transaction
        }
    );

    return {
        cliente,
        pedido
    };
}

function getPlainProduct(product) {
    if (product && typeof product.get === 'function') {
        return product.get({ plain: true });
    }

    return product || {};
}

function getFirstDefined(object, fieldNames) {
    for (const fieldName of fieldNames) {
        const value = object?.[fieldName];

        if (value !== undefined && value !== null && value !== '') {
            return value;
        }
    }

    return undefined;
}

function isInactiveProduct(product) {
    const activeValue = getFirstDefined(product, [
        'activo',
        'activa',
        'active',
        'habilitado',
        'disponible'
    ]);

    if (activeValue === undefined) {
        return false;
    }

    return (
        activeValue === false ||
        activeValue === 0 ||
        activeValue === '0' ||
        String(activeValue).toLowerCase() === 'false'
    );
}

function normalizeRequestItems(requestItems) {
    if (!Array.isArray(requestItems) || requestItems.length === 0) {
        throw createHttpError('El carrito está vacío');
    }

    if (requestItems.length > 30) {
        throw createHttpError('El carrito contiene demasiados productos');
    }

    const consolidated = new Map();

    requestItems.forEach((item) => {
        const id = Number(item?.id);
        const quantity = Number(item?.quantity);

        if (!Number.isInteger(id) || id <= 0) {
            throw createHttpError(
                `Producto no válido: ${normalizeText(item?.id, 50) || 'sin ID'}`
            );
        }

        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
            throw createHttpError(`Cantidad no válida para el producto ${id}`);
        }

        const newQuantity = (consolidated.get(id) || 0) + quantity;

        if (newQuantity > 20) {
            throw createHttpError(
                `La cantidad máxima para el producto ${id} es 20`
            );
        }

        consolidated.set(id, newQuantity);
    });

    return Array.from(consolidated.entries()).map(([id, quantity]) => ({
        id,
        quantity
    }));
}

async function buildPreferenceItems(requestItems) {
    const normalizedItems = normalizeRequestItems(requestItems);
    const productIds = normalizedItems.map((item) => item.id);
    const primaryKey = Producto.primaryKeyAttribute || 'id';

    const databaseProducts = await Producto.findAll({
        where: {
            [primaryKey]: {
                [Op.in]: productIds
            }
        }
    });

    const productMap = new Map();

    databaseProducts.forEach((productInstance) => {
        const product = getPlainProduct(productInstance);
        const productId = Number(product[primaryKey]);

        if (Number.isInteger(productId)) {
            productMap.set(productId, product);
        }
    });

    const missingIds = productIds.filter((id) => !productMap.has(id));

    if (missingIds.length > 0) {
        throw createHttpError(
            `No se encontraron productos con ID: ${missingIds.join(', ')}`
        );
    }

    return normalizedItems.map(({ id, quantity }) => {
        const product = productMap.get(id);

        if (isInactiveProduct(product)) {
            throw createHttpError(`El producto ${id} no está disponible`);
        }

        const title = normalizeText(
            getFirstDefined(product, ['nombre', 'name', 'titulo', 'title']),
            120
        );

        const description = normalizeText(
            getFirstDefined(product, [
                'descripcion',
                'description',
                'detalle',
                'details'
            ]),
            250
        );

        const unitPrice = Number(
            getFirstDefined(product, [
                'precio',
                'price',
                'precio_unitario',
                'unit_price'
            ])
        );

        const stockValue = getFirstDefined(product, [
            'stock',
            'existencia',
            'inventario'
        ]);

        if (!title) {
            throw configurationError(
                `El producto ${id} no tiene nombre en la base de datos`
            );
        }

        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
            throw configurationError(
                `El producto ${id} tiene un precio inválido en la base de datos`
            );
        }

        if (
            stockValue !== undefined &&
            Number.isFinite(Number(stockValue)) &&
            Number(stockValue) < quantity
        ) {
            throw createHttpError(
                `No hay suficiente existencia de ${title}`
            );
        }

        return {
            id: String(id),
            title,
            description: description || 'Arreglo floral',
            category_id: 'flowers',
            currency_id: 'MXN',
            quantity,
            unit_price: unitPrice
        };
    });
}

function chooseRedirectUrl(preferenceResponse) {
    const redirectUrl = preferenceResponse?.init_point;

    if (!redirectUrl) {
        throw configurationError(
            'Mercado Pago no devolvió init_point para iniciar el pago'
        );
    }

    return redirectUrl;
}

async function crearPreferencia(req, res, next) {
    let transaction;

    try {
        const productItems =
            await buildPreferenceItems(
                req.body?.items
            );

        const delivery =
            validateDelivery(
                req.body?.delivery
            );

        const frontendUrl =
            getAbsoluteUrl(
                'FRONTEND_PUBLIC_URL'
            );

        const publicApiUrl =
            getAbsoluteUrl(
                'PUBLIC_API_URL'
            );

        if (
            !Number.isFinite(DELIVERY_COST) ||
            DELIVERY_COST < 0
        ) {
            throw configurationError(
                'DELIVERY_COST no es un número válido'
            );
        }

        const subtotal =
            calcularSubtotalProductos(
                productItems
            );

        const total =
            subtotal + DELIVERY_COST;

        transaction =
            await sequelize.transaction();

        const codigoRastreo =
            await generarCodigoRastreoUnico(
                transaction
            );

        const {
            cliente,
            pedido
        } =
            await crearClientePedidoYDetalles({
                items: productItems,
                delivery,
                codigoRastreo,
                total,
                transaction
            });

        /*
         * Mercado Pago recibirá una copia porque
         * después agregaremos el concepto de envío.
         */
        const preferenceItems =
            productItems.map(item => ({
                ...item
            }));

        if (DELIVERY_COST > 0) {
            preferenceItems.push({
                id: 'delivery',
                title: 'Entrega local',
                description:
                    `${delivery.date} · ${delivery.slot}`,
                category_id: 'shipping',
                currency_id: 'MXN',
                quantity: 1,
                unit_price: DELIVERY_COST
            });
        }

        /*
         * Usamos el código de rastreo como
         * external_reference de Mercado Pago.
         */
        const externalReference =
            codigoRastreo;

        const preferenceClient =
            new Preference(getClient());

        const preferenceResponse =
            await preferenceClient.create({
                body: {
                    items: preferenceItems,

                    payer: {
                        name: delivery.receiverName,
                        email: delivery.customerEmail
                    },

                    external_reference:
                        externalReference,

                    statement_descriptor:
                        'JUAN H MAGNO',

                    back_urls: {
                        success:
                            `${frontendUrl}/pago.html?resultado=success&codigo=${encodeURIComponent(
                                codigoRastreo
                            )}`,

                        failure:
                            `${frontendUrl}/pago.html?resultado=failure&codigo=${encodeURIComponent(
                                codigoRastreo
                            )}`,

                        pending:
                            `${frontendUrl}/pago.html?resultado=pending&codigo=${encodeURIComponent(
                                codigoRastreo
                            )}`
                    },

                    auto_return: 'approved',

                    notification_url:
                        `${publicApiUrl}/api/mercadopago/webhook`,

                    metadata: {
                        pedido_id: pedido.id,
                        codigo_rastreo:
                            codigoRastreo,
                        customer_email:
                            delivery.customerEmail,
                        receiver_name:
                            delivery.receiverName,
                        delivery_address:
                            delivery.address,
                        delivery_date:
                            delivery.date,
                        delivery_slot:
                            delivery.slot
                    }
                }
            });

        const redirectUrl =
            chooseRedirectUrl(
                preferenceResponse
            );

        await pedido.update(
            {
                referenciaPago:
                    String(
                        preferenceResponse.id || ''
                    )
            },
            {
                transaction
            }
        );

        await transaction.commit();
        transaction = null;

        /*
         * Implementación temporal:
         * envía el correo antes de confirmar el pago.
         *
         * Después moveremos esta llamada al webhook
         * cuando payment.status sea approved.
         */
        let emailSent = true;
        let emailWarning = null;

        try {
            await enviarCorreoCodigoRastreo({
                email:
                    delivery.customerEmail,

                nombreCliente:
                    cliente.nombre,

                codigoRastreo,

                total,

                fechaEntrega:
                    delivery.date,

                ventanaEntrega:
                    delivery.slot
            });
        } catch (emailError) {
            emailSent = false;

            emailWarning =
                'El pedido fue creado, pero no se pudo enviar el correo.';

            console.error(
                'Error enviando correo de rastreo:',
                emailError
            );
        }

        return res.status(201).json({
            ok: true,
            preferenceId:
                preferenceResponse.id,
            externalReference,
            codigoRastreo,
            pedidoId: pedido.id,
            emailSent,
            emailWarning,
            redirectUrl
        });
    } catch (error) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error(
                    'Error revirtiendo pedido:',
                    rollbackError
                );
            }
        }

        console.error(
            'Error creando preferencia de Mercado Pago:',
            {
                message: error.message,
                status: error.status,
                cause: error.cause
            }
        );

        return next(error);
    }
}

async function obtenerPago(req, res, next) {
    try {
        const paymentId = normalizeText(req.params.id, 60);

        if (!/^\d+$/.test(paymentId)) {
            return res.status(400).json({
                ok: false,
                message: 'El identificador del pago no es válido'
            });
        }

        const paymentClient = new Payment(getClient());
        const payment = await paymentClient.get({ id: paymentId });

        return res.status(200).json({
            ok: true,
            data: {
                id: payment.id,
                status: payment.status,
                statusDetail: payment.status_detail,
                externalReference: payment.external_reference,
                transactionAmount: payment.transaction_amount,
                currencyId: payment.currency_id,
                dateApproved: payment.date_approved || null
            }
        });
    } catch (error) {
        return next(error);
    }
}

async function recibirWebhook(req, res, next) {
    try {
        const type = normalizeText(req.query.type || req.body?.type, 50);
        const paymentId = normalizeText(
            req.query['data.id'] || req.body?.data?.id,
            60
        );

        if (type && type !== 'payment') {
            return res.sendStatus(200);
        }

        if (!paymentId) {
            return res.sendStatus(200);
        }

        const webhookSecret = String(process.env.MP_WEBHOOK_SECRET || '').trim();

        if (webhookSecret) {
            WebhookSignatureValidator.validate({
                xSignature: req.headers['x-signature'],
                xRequestId: req.headers['x-request-id'],
                dataId: paymentId,
                secret: webhookSecret
            });
        } else if (process.env.NODE_ENV === 'production') {
            throw configurationError(
                'Falta configurar MP_WEBHOOK_SECRET para validar webhooks'
            );
        }

        const paymentClient = new Payment(getClient());
        const payment = await paymentClient.get({ id: paymentId });

        console.log('Webhook Mercado Pago verificado:', {
            paymentId: payment.id,
            status: payment.status,
            statusDetail: payment.status_detail,
            externalReference: payment.external_reference,
            amount: payment.transaction_amount,
            liveMode: payment.live_mode
        });

        return res.sendStatus(200);
    } catch (error) {
        if (error instanceof InvalidWebhookSignatureError) {
            return res.sendStatus(401);
        }

        return next(error);
    }
}

module.exports = {
    crearPreferencia,
    obtenerPago,
    recibirWebhook
};
