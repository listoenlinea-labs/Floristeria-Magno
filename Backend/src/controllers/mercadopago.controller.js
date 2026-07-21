const {
    MercadoPagoConfig,
    Preference,
    Payment,
    WebhookSignatureValidator,
    InvalidWebhookSignatureError
} = require('mercadopago');

const DELIVERY_COST = Number(process.env.DELIVERY_COST || 120);

/*
 * Catálogo confiable del servidor.
 *
 * El navegador solo envía el ID y la cantidad. Los nombres y precios se
 * obtienen aquí para impedir que alguien modifique localStorage y pague un
 * precio distinto.
 *
 * Cuando el catálogo se alimente completamente desde MySQL, sustituye este
 * objeto por una consulta a Producto usando los IDs de la base de datos.
 */
const SERVER_CATALOG = Object.freeze({
    detalle: {
        title: 'Detalle Sorpresa',
        description: 'Ramo chico o mediano con empaque premium.',
        unitPrice: 350
    },
    premium: {
        title: 'Ramo Premium',
        description: 'Diseño protagonista con flores seleccionadas.',
        unitPrice: 750
    },
    evento: {
        title: 'Evento Floral',
        description: 'Decoración y propuesta floral para eventos.',
        unitPrice: 1200
    },
    rosas: {
        title: 'Rosas Eternas',
        description: 'Arreglo romántico de rosas y follaje.',
        unitPrice: 680
    },
    girasol: {
        title: 'Girasol Luminoso',
        description: 'Flores cálidas para celebraciones.',
        unitPrice: 520
    },
    tulipan: {
        title: 'Tulipán Pastel',
        description: 'Diseño delicado y moderno.',
        unitPrice: 890
    },
    lirio: {
        title: 'Lirio Sereno',
        description: 'Composición elegante con lirios.',
        unitPrice: 720
    },
    box: {
        title: 'Flower Box',
        description: 'Caja floral estilo boutique.',
        unitPrice: 950
    },
    mesa: {
        title: 'Centro de Mesa',
        description: 'Centro floral para reuniones y eventos.',
        unitPrice: 1100
    }
});

const ALLOWED_DELIVERY_SLOTS = new Set([
    '11:00 am – 1:00 pm',
    '1:00 pm – 3:00 pm',
    '3:00 pm – 7:00 pm'
]);

function configurationError(message) {
    const error = new Error(message);
    error.status = 500;
    return error;
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
        .replace(/\/$/, '');

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
    return String(value || '').trim().slice(0, maxLength);
}

function validateDelivery(delivery) {
    const receiverName = normalizeText(delivery?.receiverName, 150);
    const address = normalizeText(delivery?.address, 300);
    const date = normalizeText(delivery?.date, 10);
    const slot = normalizeText(delivery?.slot, 40);

    if (receiverName.length < 2) {
        const error = new Error('Escribe el nombre de quien recibe');
        error.status = 400;
        throw error;
    }

    if (address.length < 5) {
        const error = new Error('Escribe una dirección de entrega válida');
        error.status = 400;
        throw error;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const error = new Error('Selecciona una fecha de entrega válida');
        error.status = 400;
        throw error;
    }

    if (!ALLOWED_DELIVERY_SLOTS.has(slot)) {
        const error = new Error('Selecciona un horario de entrega válido');
        error.status = 400;
        throw error;
    }

    return {
        receiverName,
        address,
        date,
        slot
    };
}

function buildPreferenceItems(requestItems) {
    if (!Array.isArray(requestItems) || requestItems.length === 0) {
        const error = new Error('El carrito está vacío');
        error.status = 400;
        throw error;
    }

    if (requestItems.length > 30) {
        const error = new Error('El carrito contiene demasiados productos');
        error.status = 400;
        throw error;
    }

    const consolidated = new Map();

    requestItems.forEach((item) => {
        const id = normalizeText(item?.id, 50);
        const quantity = Number(item?.quantity);

        if (!SERVER_CATALOG[id]) {
            const error = new Error(`Producto no válido: ${id || 'sin ID'}`);
            error.status = 400;
            throw error;
        }

        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
            const error = new Error(
                `Cantidad no válida para ${SERVER_CATALOG[id].title}`
            );
            error.status = 400;
            throw error;
        }

        const previousQuantity = consolidated.get(id) || 0;
        const newQuantity = previousQuantity + quantity;

        if (newQuantity > 20) {
            const error = new Error(
                `La cantidad máxima para ${SERVER_CATALOG[id].title} es 20`
            );
            error.status = 400;
            throw error;
        }

        consolidated.set(id, newQuantity);
    });

    return Array.from(consolidated.entries()).map(([id, quantity]) => {
        const product = SERVER_CATALOG[id];

        return {
            id,
            title: product.title,
            description: product.description,
            category_id: 'flowers',
            currency_id: 'MXN',
            quantity,
            unit_price: product.unitPrice
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
        const items = buildPreferenceItems(req.body?.items);
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

        res.status(201).json({
            ok: true,
            preferenceId: preferenceResponse.id,
            externalReference,
            redirectUrl
        });
    } catch (error) {
        next(error);
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

        res.status(200).json({
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
        next(error);
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

        /*
         * Aquí puedes actualizar pedidos.estado en MySQL usando
         * payment.external_reference. Por ahora se registra el resultado
         * verificado para que el pago ya pueda probarse de extremo a extremo.
         */
        console.log('✅ Webhook Mercado Pago verificado:', {
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
