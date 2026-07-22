const { Op } = require('sequelize');
const {
    MercadoPagoConfig,
    Preference,
    Payment,
    WebhookSignatureValidator,
    InvalidWebhookSignatureError
} = require('mercadopago');

const { Producto } = require('../models');

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
    const receiverName = normalizeText(delivery?.receiverName, 150);
    const address = normalizeText(delivery?.address, 300);
    const date = normalizeText(delivery?.date, 10);
    const slot = normalizeText(delivery?.slot, 40);

    if (receiverName.length < 2) {
        throw createHttpError('Escribe el nombre de quien recibe');
    }

    if (address.length < 5) {
        throw createHttpError('Escribe una dirección de entrega válida');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw createHttpError('Selecciona una fecha de entrega válida');
    }

    if (!ALLOWED_DELIVERY_SLOTS.has(slot)) {
        throw createHttpError('Selecciona un horario de entrega válido');
    }

    return {
        receiverName,
        address,
        date,
        slot
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
    const accessToken = String(process.env.MP_ACCESS_TOKEN || '');
    const environment = String(process.env.MP_ENVIRONMENT || '').toLowerCase();
    const useSandbox = environment === 'test' || accessToken.startsWith('TEST-');

    if (useSandbox) {
        return preferenceResponse.sandbox_init_point || preferenceResponse.init_point;
    }

    return preferenceResponse.init_point;
}

async function crearPreferencia(req, res, next) {
    try {
        const items = await buildPreferenceItems(req.body?.items);
        const delivery = validateDelivery(req.body?.delivery);
        const frontendUrl = getAbsoluteUrl('FRONTEND_PUBLIC_URL');
        const publicApiUrl = getAbsoluteUrl('PUBLIC_API_URL');

        if (!Number.isFinite(DELIVERY_COST) || DELIVERY_COST < 0) {
            throw configurationError('DELIVERY_COST no es un número válido');
        }

        if (DELIVERY_COST > 0) {
            items.push({
                id: 'delivery',
                title: 'Entrega local',
                description: `${delivery.date} · ${delivery.slot}`,
                category_id: 'shipping',
                currency_id: 'MXN',
                quantity: 1,
                unit_price: DELIVERY_COST
            });
        }

        const externalReference = [
            'JHM',
            Date.now(),
            Math.random().toString(36).slice(2, 10).toUpperCase()
        ].join('-');

        const preferenceClient = new Preference(getClient());
        const preferenceResponse = await preferenceClient.create({
            body: {
                items,
                external_reference: externalReference,
                statement_descriptor: 'JUAN H MAGNO',
                back_urls: {
                    success: `${frontendUrl}/pago.html?resultado=success`,
                    failure: `${frontendUrl}/pago.html?resultado=failure`,
                    pending: `${frontendUrl}/pago.html?resultado=pending`
                },
                auto_return: 'approved',
                notification_url: `${publicApiUrl}/api/mercadopago/webhook`,
                metadata: {
                    receiver_name: delivery.receiverName,
                    delivery_address: delivery.address,
                    delivery_date: delivery.date,
                    delivery_slot: delivery.slot
                }
            }
        });

        const redirectUrl = chooseRedirectUrl(preferenceResponse);

        if (!redirectUrl) {
            throw configurationError(
                'Mercado Pago no devolvió una URL para iniciar el pago'
            );
        }

        return res.status(201).json({
            ok: true,
            preferenceId: preferenceResponse.id,
            externalReference,
            redirectUrl
        });
    } catch (error) {
        console.error('Error creando preferencia de Mercado Pago:', {
            message: error.message,
            status: error.status,
            cause: error.cause
        });

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
