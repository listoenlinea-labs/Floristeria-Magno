const crypto = require('crypto');

const {
    Op
} = require('sequelize');

const sequelize = require('../config/database');

const {
    MercadoPagoConfig,
    Preference,
    Payment,
    Order,
    WebhookSignatureValidator,
    InvalidWebhookSignatureError
} = require('mercadopago');

const {
    Cliente,
    Producto,
    Pedido,
    DetallePedido,
    HistorialPedido,
    FechaEspecial
} = require('../models');

const {
    enviarCorreoCodigoRastreo
} = require('../services/email.service');

const {
    buildCardOrderBody,
    buildOxxoOrderBody,
    getOrderChallengeUrl,
    getOrderPayment,
    getOrderStatusDetail,
    getOrderTicketUrl,
    normalizeOrderAsPayment,
    normalizeOrderStatus
} = require('../services/mercadopago-orders.service');

const DELIVERY_COST = Number(process.env.DELIVERY_COST || 120);

const ALLOWED_DELIVERY_SLOTS = new Set([
    '11:00 am – 1:00 pm',
    '1:00 pm – 3:00 pm',
    '3:00 pm – 7:00 pm'
]);

const DELIVERY_AREA_UNAVAILABLE_MESSAGE =
    'Actualmente solo realizamos entregas dentro del Área Metropolitana de Guadalajara. ' +
    'Sin embargo, dependiendo de tu pedido, podríamos hacer una excepción. ' +
    'Contáctanos mediante el botón de WhatsApp para revisar qué podemos hacer por ti. ¡Gracias!';

const ALLOWED_DELIVERY_MUNICIPALITIES = new Map([
    ['guadalajara', 'Guadalajara'],
    ['zapopan', 'Zapopan'],
    ['san pedro tlaquepaque', 'San Pedro Tlaquepaque'],
    ['tonala', 'Tonalá'],
    ['tlajomulco de zuniga', 'Tlajomulco de Zúñiga'],
    ['el salto', 'El Salto'],
    ['juanacatlan', 'Juanacatlán'],
    [
        'ixtlahuacan de los membrillos',
        'Ixtlahuacán de los Membrillos'
    ],
    ['zapotlanejo', 'Zapotlanejo']
]);

function createHttpError(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function configurationError(message) {
    return createHttpError(message, 500);
}

async function verificarCierreDePedidos() {

    const now =
        new Date();

    const fechaBloqueada =
        await FechaEspecial.findOne({
            where: {
                activo:
                    true,

                fechaCorte: {
                    [Op.lte]:
                        now
                },

                finBloqueo: {
                    [Op.gte]:
                        now
                }
            },

            order: [
                [
                    'fechaCorte',
                    'ASC'
                ]
            ]
        });


    if (!fechaBloqueada) {
        return;
    }


    const message =
        fechaBloqueada.mensajeBloqueo ||
        `Los pedidos para ${fechaBloqueada.nombre} se encuentran cerrados temporalmente debido a la alta demanda.`;


    throw createHttpError(
        message,
        409
    );
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

function getPublicKey() {
    const publicKey = String(
        process.env.MP_PUBLIC_KEY || ''
    ).trim();

    if (!publicKey) {
        throw configurationError(
            'Falta configurar MP_PUBLIC_KEY en las variables de entorno'
        );
    }

    return publicKey;
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

function normalizeForComparison(value) {
    return normalizeText(
        value,
        80
    )
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ');
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
        220
    );

    const municipalityInput = normalizeText(
        delivery?.municipality,
        80
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

    if (!municipalityInput) {
        throw createHttpError(
            'Selecciona el municipio de entrega'
        );
    }

    const municipality =
        ALLOWED_DELIVERY_MUNICIPALITIES.get(
            normalizeForComparison(
                municipalityInput
            )
        );

    if (!municipality) {
        throw createHttpError(
            DELIVERY_AREA_UNAVAILABLE_MESSAGE,
            422
        );
    }

    const fullAddress =
        `${address}, ${municipality}, Jalisco`;

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
        address: fullAddress,
        municipality,
        date,
        slot
    };
}

function generarCodigoRastreo() {
    const numero =
        crypto.randomInt(
            0,
            1000000
        );

    return `JHM-${String(numero).padStart(6, '0')}`;
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
    total,
    transaction,
    paymentMethod = 'MERCADO_PAGO'
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
            codigoRastreo: null,
            clienteId: cliente.id,

            nombreDestinatario:
                delivery.receiverName,

            direccionEntrega:
                delivery.address,

            total,

            estado:
                'PENDIENTE',

            tipoPedido:
                'CATALOGO_WEB',

            /*
             * IMPORTANTE PARA REPORTES DE VENTAS.
             */
            origen:
                'WEB',

            canalCierre:
                'MERCADO_PAGO',

            fechaEntrega:
                delivery.date,

            ventanaEntrega:
                delivery.slot,

            metodoPago:
                paymentMethod,

            estadoPago:
                'PENDIENTE'
        },
        {
            transaction
        }
    );

    const codigoRastreo =
        `JHM-${String(pedido.id).padStart(6, '0')}`;

    await pedido.update(
        {
            codigoRastreo
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
        pedido,
        codigoRastreo
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

function getPaymentMethodForOrder(payment) {
    const paymentMethodId = normalizeText(
        payment?.payment_method_id,
        50
    ).toLowerCase();

    const paymentTypeId = normalizeText(
        payment?.payment_type_id,
        50
    ).toLowerCase();

    if (
        paymentMethodId === 'oxxo' ||
        paymentTypeId === 'ticket'
    ) {
        return 'OXXO_MERCADO_PAGO';
    }

    if (
        paymentTypeId === 'credit_card' ||
        paymentTypeId === 'debit_card' ||
        paymentTypeId === 'prepaid_card'
    ) {
        return 'TARJETA_MERCADO_PAGO';
    }

    return 'MERCADO_PAGO';
}

function getCheckoutAttemptId(value) {
    const attemptId = normalizeText(value, 80);

    if (
        attemptId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            attemptId
        )
    ) {
        return attemptId;
    }

    return crypto.randomUUID();
}

function validateCardPaymentData(paymentData) {
    const token = normalizeText(
        paymentData?.token,
        500
    );

    const paymentMethodId = normalizeText(
        paymentData?.payment_method_id ||
            paymentData?.paymentMethodId,
        50
    ).toLowerCase();

    const paymentTypeId = normalizeText(
        paymentData?.payment_type_id ||
            paymentData?.paymentTypeId,
        50
    ).toLowerCase();

    const installments = Number(
        paymentData?.installments
    );

    const identificationType = normalizeText(
        paymentData?.payer?.identification?.type,
        20
    );

    const identificationNumber = normalizeText(
        paymentData?.payer?.identification?.number,
        40
    );

    if (token.length < 10) {
        throw createHttpError(
            'Mercado Pago no pudo tokenizar la tarjeta. Revisa los datos e inténtalo nuevamente.'
        );
    }

    if (!/^[a-z0-9_-]+$/.test(paymentMethodId)) {
        throw createHttpError(
            'El método de la tarjeta no es válido'
        );
    }

    if (
        ![
            'credit_card',
            'debit_card',
            'prepaid_card'
        ].includes(paymentTypeId)
    ) {
        throw createHttpError(
            'Mercado Pago no identificó el tipo de tarjeta'
        );
    }

    if (
        !Number.isInteger(installments) ||
        installments < 1 ||
        installments > 24
    ) {
        throw createHttpError(
            'Selecciona un número de mensualidades válido'
        );
    }

    return {
        token,
        paymentMethodId,
        paymentTypeId,
        installments,
        identification:
            identificationType && identificationNumber
                ? {
                    type: identificationType,
                    number: identificationNumber
                }
                : null
    };
}

async function createPendingOrderFromCart({
    body,
    paymentMethod
}) {
    await verificarCierreDePedidos();

    const productItems = await buildPreferenceItems(
        body?.items
    );

    const delivery = validateDelivery(
        body?.delivery
    );

    if (
        !Number.isFinite(DELIVERY_COST) ||
        DELIVERY_COST < 0
    ) {
        throw configurationError(
            'DELIVERY_COST no es un número válido'
        );
    }

    const subtotal = calcularSubtotalProductos(
        productItems
    );

    const total = subtotal + DELIVERY_COST;
    const transaction = await sequelize.transaction();

    try {
        const orderData =
            await crearClientePedidoYDetalles({
                items: productItems,
                delivery,
                total,
                transaction,
                paymentMethod
            });

        await transaction.commit();

        return {
            ...orderData,
            productItems,
            delivery,
            total
        };
    } catch (error) {
        try {
            await transaction.rollback();
        } catch (rollbackError) {
            console.error(
                'Error revirtiendo pedido pendiente:',
                rollbackError
            );
        }

        throw error;
    }
}

async function enviarCorreoPedidoPagado(pedido) {
    const correoYaEnviado =
        await HistorialPedido.findOne({
            where: {
                pedidoId:
                    pedido.id,

                estado:
                    'CONFIRMACION_EMAIL'
            }
        });

    if (correoYaEnviado) {
        console.log(
            'Correo de confirmación previamente enviado:',
            pedido.codigoRastreo
        );

        return;
    }

    const cliente =
        await Cliente.findByPk(
            pedido.clienteId
        );

    if (!cliente?.email) {
        console.warn(
            'Pedido pagado sin correo de cliente:',
            pedido.codigoRastreo
        );

        return;
    }

    try {
        console.log('------------------------------------');
        console.log('Pago aprobado. Intentando enviar correo...');
        console.log('Cliente:', cliente.nombre);
        console.log('Correo:', cliente.email);
        console.log('Código:', pedido.codigoRastreo);
        console.log('------------------------------------');

        await enviarCorreoCodigoRastreo({
            email:
                cliente.email,

            nombreCliente:
                pedido.nombreDestinatario ||
                cliente.nombre,

            codigoRastreo:
                pedido.codigoRastreo,

            total:
                pedido.total,

            fechaEntrega:
                pedido.fechaEntrega,

            ventanaEntrega:
                pedido.ventanaEntrega
        });

        await HistorialPedido.create({
            pedidoId:
                pedido.id,

            estado:
                'CONFIRMACION_EMAIL',

            descripcion:
                'Confirmación enviada por correo después de aprobarse el pago'
        });

        console.log('Correo de pago aprobado enviado correctamente.');
    } catch (emailError) {
        console.error('====================================');
        console.error('ERROR ENVIANDO CORREO DE PAGO APROBADO');
        console.error('Mensaje:', emailError.message);
        console.error('Código:', emailError.code);
        console.error('Comando:', emailError.command);
        console.error('Respuesta:', emailError.response);
        console.error('Stack:', emailError.stack);
        console.error('====================================');
    }
}

async function applyMercadoPagoPaymentToOrder(payment) {
    const codigoRastreo = normalizeText(
        payment?.external_reference,
        30
    );

    if (!codigoRastreo) {
        console.warn(
            'Pago Mercado Pago sin external_reference:',
            payment?.id
        );

        return null;
    }

    const pedido = await Pedido.findOne({
        where: {
            codigoRastreo
        }
    });

    if (!pedido) {
        console.warn(
            'No existe pedido para el pago:',
            {
                paymentId: payment?.id,
                codigoRastreo
            }
        );

        return null;
    }

    const paymentStatus = normalizeText(
        payment?.status,
        50
    ).toLowerCase();

    const detectedPaymentMethod = getPaymentMethodForOrder(
        payment
    );

    const paymentMethod =
        detectedPaymentMethod === 'MERCADO_PAGO' &&
        pedido.metodoPago
            ? pedido.metodoPago
            : detectedPaymentMethod;

    const paymentAmount = Number(
        payment?.transaction_amount
    );

    const orderAmount = Number(
        pedido.total
    );

    const currencyId = normalizeText(
        payment?.currency_id,
        10
    ).toUpperCase();

    if (
        paymentStatus === 'approved' &&
        (
            !Number.isFinite(paymentAmount) ||
            Math.abs(paymentAmount - orderAmount) > 0.01 ||
            currencyId !== 'MXN'
        )
    ) {
        console.error(
            'Pago aprobado con importe o moneda inesperados:',
            {
                pedidoId: pedido.id,
                paymentId: payment?.id,
                paymentAmount,
                orderAmount,
                currencyId
            }
        );

        await pedido.update({
            estadoPago: 'REVISION',
            referenciaPago: String(payment?.id || ''),
            metodoPago: paymentMethod,
            actualizadoEn: new Date()
        });

        return pedido;
    }

    if (paymentStatus === 'approved') {
        const paymentDate =
            pedido.pagadoEn ||
            (
                payment?.date_approved
                    ? new Date(payment.date_approved)
                    : new Date()
            );

        await pedido.update({
            estadoPago: 'PAGADO',
            pagadoEn: paymentDate,
            referenciaPago: String(payment?.id || ''),
            origen: 'WEB',
            canalCierre: 'MERCADO_PAGO',
            metodoPago: paymentMethod,
            estado:
                pedido.estado === 'PENDIENTE'
                    ? 'RECIBIDO'
                    : pedido.estado,
            actualizadoEn: new Date()
        });

        console.log(
            '✅ Venta Mercado Pago confirmada:',
            {
                pedidoId: pedido.id,
                codigoRastreo: pedido.codigoRastreo,
                total: pedido.total,
                paymentId: payment?.id,
                paymentMethod
            }
        );

        await enviarCorreoPedidoPagado(
            pedido
        );

        return pedido;
    }

    if (
        paymentStatus === 'pending' ||
        paymentStatus === 'in_process'
    ) {
        await pedido.update({
            estadoPago: 'PENDIENTE',
            referenciaPago: String(payment?.id || ''),
            metodoPago: paymentMethod,
            actualizadoEn: new Date()
        });

        return pedido;
    }

    if (
        [
            'rejected',
            'cancelled',
            'refunded',
            'charged_back'
        ].includes(paymentStatus)
    ) {
        await pedido.update({
            estadoPago: paymentStatus.toUpperCase(),
            referenciaPago: String(payment?.id || ''),
            metodoPago: paymentMethod,
            actualizadoEn: new Date()
        });

        return pedido;
    }

    return pedido;
}

async function applyMercadoPagoOrderToPedido(order) {
    return applyMercadoPagoPaymentToOrder(
        normalizeOrderAsPayment(order)
    );
}

function obtenerConfiguracionPublica(req, res, next) {
    try {
        return res.status(200).json({
            ok: true,
            publicKey: getPublicKey()
        });
    } catch (error) {
        return next(error);
    }
}

async function cotizarCarrito(req, res, next) {
    try {
        await verificarCierreDePedidos();

        const productItems = await buildPreferenceItems(
            req.body?.items
        );

        validateDelivery(
            req.body?.delivery
        );

        if (
            !Number.isFinite(DELIVERY_COST) ||
            DELIVERY_COST < 0
        ) {
            throw configurationError(
                'DELIVERY_COST no es un número válido'
            );
        }

        const subtotal = calcularSubtotalProductos(
            productItems
        );

        return res.status(200).json({
            ok: true,
            currencyId: 'MXN',
            subtotal,
            deliveryCost: DELIVERY_COST,
            total: subtotal + DELIVERY_COST
        });
    } catch (error) {
        return next(error);
    }
}

async function crearPagoTarjeta(req, res, next) {
    let pedido;
    let orderCreated = false;

    try {
        const cardPayment = validateCardPaymentData(
            req.body?.payment
        );

        const orderData = await createPendingOrderFromCart({
            body: req.body,
            paymentMethod: 'TARJETA_MERCADO_PAGO'
        });

        pedido = orderData.pedido;

        const frontendUrl = getAbsoluteUrl(
            'FRONTEND_PUBLIC_URL'
        );

        const orderClient = new Order(
            getClient()
        );

        const mercadoPagoOrder = await orderClient.create({
            body: buildCardOrderBody({
                amount: orderData.total,
                externalReference:
                    orderData.codigoRastreo,
                payerEmail:
                    orderData.delivery.customerEmail,
                identification:
                    cardPayment.identification,
                paymentMethodId:
                    cardPayment.paymentMethodId,
                paymentTypeId:
                    cardPayment.paymentTypeId,
                token: cardPayment.token,
                installments:
                    cardPayment.installments
            }),
            requestOptions: {
                idempotencyKey:
                    getCheckoutAttemptId(
                        req.body?.checkoutAttemptId
                    )
            }
        });

        orderCreated = true;

        await applyMercadoPagoOrderToPedido(
            mercadoPagoOrder
        );

        const payment = getOrderPayment(
            mercadoPagoOrder
        );

        const status = normalizeOrderStatus(
            mercadoPagoOrder
        );

        const statusDetail = getOrderStatusDetail(
            mercadoPagoOrder
        );

        const resultUrl =
            `${frontendUrl}/pago.html?order_id=${encodeURIComponent(
                mercadoPagoOrder.id
            )}&resultado=${encodeURIComponent(
                status
            )}`;

        const challengeUrl = getOrderChallengeUrl(
            mercadoPagoOrder
        );

        const requiresChallenge =
            statusDetail === 'pending_challenge' &&
            Boolean(challengeUrl);

        return res.status(201).json({
            ok: true,
            orderId: mercadoPagoOrder.id,
            paymentId: payment?.id || null,
            status,
            statusDetail,
            codigoRastreo: orderData.codigoRastreo,
            resultUrl,
            redirectUrl:
                requiresChallenge
                    ? null
                    : resultUrl,
            challenge:
                requiresChallenge
                    ? {
                        url: challengeUrl
                    }
                    : null
        });
    } catch (error) {
        if (pedido && !orderCreated) {
            try {
                await pedido.update({
                    estadoPago: 'ERROR',
                    actualizadoEn: new Date()
                });
            } catch (updateError) {
                console.error(
                    'No fue posible marcar el pedido con error de pago:',
                    updateError
                );
            }
        }

        console.error(
            'Error procesando tarjeta con Mercado Pago:',
            {
                message: error.message,
                status: error.status,
                cause: error.cause
            }
        );

        return next(error);
    }
}

async function crearPagoOxxo(req, res, next) {
    let pedido;
    let orderCreated = false;

    try {
        const orderData = await createPendingOrderFromCart({
            body: req.body,
            paymentMethod: 'OXXO_MERCADO_PAGO'
        });

        pedido = orderData.pedido;

        const orderClient = new Order(
            getClient()
        );

        const mercadoPagoOrder = await orderClient.create({
            body: buildOxxoOrderBody({
                amount: orderData.total,
                externalReference:
                    orderData.codigoRastreo,
                payerEmail:
                    orderData.delivery.customerEmail,
                payerName:
                    orderData.delivery.receiverName
            }),
            requestOptions: {
                idempotencyKey:
                    getCheckoutAttemptId(
                        req.body?.checkoutAttemptId
                    )
            }
        });

        orderCreated = true;

        await applyMercadoPagoOrderToPedido(
            mercadoPagoOrder
        );

        const payment = getOrderPayment(
            mercadoPagoOrder
        );

        const ticketUrl = getOrderTicketUrl(
            mercadoPagoOrder
        );

        return res.status(201).json({
            ok: true,
            orderId: mercadoPagoOrder.id,
            paymentId: payment?.id || null,
            status: normalizeOrderStatus(
                mercadoPagoOrder
            ),
            statusDetail: getOrderStatusDetail(
                mercadoPagoOrder
            ),
            codigoRastreo: orderData.codigoRastreo,
            ticketUrl
        });
    } catch (error) {
        if (pedido && !orderCreated) {
            try {
                await pedido.update({
                    estadoPago: 'ERROR',
                    actualizadoEn: new Date()
                });
            } catch (updateError) {
                console.error(
                    'No fue posible marcar el pedido OXXO con error:',
                    updateError
                );
            }
        }

        console.error(
            'Error creando pago OXXO con Mercado Pago:',
            {
                message: error.message,
                status: error.status,
                cause: error.cause
            }
        );

        return next(error);
    }
}

async function crearPreferencia(
    req,
    res,
    next
) {
    let transaction;

    try {

        /*
         * Antes de consultar productos,
         * crear pedidos o comunicarnos
         * con Mercado Pago comprobamos
         * si las ventas están cerradas.
         */
        await verificarCierreDePedidos();

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

        const {
            pedido,
            codigoRastreo
        } =
            await crearClientePedidoYDetalles({
                items: productItems,
                delivery,
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
                        delivery_municipality:
                            delivery.municipality,
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

        return res.status(201).json({
            ok: true,
            preferenceId:
                preferenceResponse.id,
            externalReference,
            codigoRastreo,
            pedidoId: pedido.id,
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
        const operationId = normalizeText(req.params.id, 80);

        if (/^ORD[A-Z0-9_-]+$/i.test(operationId)) {
            const orderClient = new Order(getClient());
            const mercadoPagoOrder = await orderClient.get({
                id: operationId
            });

            await applyMercadoPagoOrderToPedido(
                mercadoPagoOrder
            );

            const payment = getOrderPayment(
                mercadoPagoOrder
            );

            const normalizedPayment = normalizeOrderAsPayment(
                mercadoPagoOrder
            );

            return res.status(200).json({
                ok: true,
                data: {
                    id: mercadoPagoOrder.id,
                    paymentId: payment?.id || null,
                    status: normalizedPayment.status,
                    statusDetail:
                        normalizedPayment.status_detail,
                    externalReference:
                        normalizedPayment.external_reference,
                    transactionAmount:
                        normalizedPayment.transaction_amount,
                    currencyId:
                        normalizedPayment.currency_id,
                    dateApproved:
                        normalizedPayment.date_approved,
                    ticketUrl: getOrderTicketUrl(
                        mercadoPagoOrder
                    )
                }
            });
        }

        if (!/^\d+$/.test(operationId)) {
            return res.status(400).json({
                ok: false,
                message: 'El identificador de la operación no es válido'
            });
        }

        const paymentClient = new Payment(getClient());
        const payment = await paymentClient.get({ id: operationId });

        await applyMercadoPagoPaymentToOrder(
            payment
        );

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
        const type = normalizeText(
            req.query.type || req.body?.type,
            50
        ).toLowerCase();

        const resourceId = normalizeText(
            req.query['data.id'] || req.body?.data?.id,
            80
        );

        if (type && !['payment', 'order'].includes(type)) {
            return res.sendStatus(200);
        }

        if (!resourceId) {
            return res.sendStatus(200);
        }

        const webhookSecret = String(process.env.MP_WEBHOOK_SECRET || '').trim();

        if (webhookSecret) {
            WebhookSignatureValidator.validate({
                xSignature: req.headers['x-signature'],
                xRequestId: req.headers['x-request-id'],
                dataId: resourceId,
                secret: webhookSecret
            });
        } else if (process.env.NODE_ENV === 'production') {
            throw configurationError(
                'Falta configurar MP_WEBHOOK_SECRET para validar webhooks'
            );
        }

        const isOrderEvent =
            type === 'order' ||
            /^ORD[A-Z0-9_-]+$/i.test(resourceId);

        if (isOrderEvent) {
            const orderClient = new Order(getClient());
            const mercadoPagoOrder = await orderClient.get({
                id: resourceId
            });

            console.log(
                'Webhook de orden Mercado Pago verificado:',
                {
                    orderId: mercadoPagoOrder.id,
                    status: mercadoPagoOrder.status,
                    statusDetail:
                        mercadoPagoOrder.status_detail,
                    externalReference:
                        mercadoPagoOrder.external_reference,
                    amount:
                        mercadoPagoOrder.total_amount
                }
            );

            await applyMercadoPagoOrderToPedido(
                mercadoPagoOrder
            );
        } else {
            const paymentClient = new Payment(getClient());
            const payment = await paymentClient.get({
                id: resourceId
            });

            console.log(
                'Webhook de pago Mercado Pago verificado:',
                {
                    paymentId: payment.id,
                    status: payment.status,
                    statusDetail: payment.status_detail,
                    externalReference:
                        payment.external_reference,
                    amount: payment.transaction_amount,
                    liveMode: payment.live_mode
                }
            );

            await applyMercadoPagoPaymentToOrder(
                payment
            );
        }

        return res.sendStatus(200);
    } catch (error) {
        if (error instanceof InvalidWebhookSignatureError) {
            return res.sendStatus(401);
        }

        return next(error);
    }
}

module.exports = {
    obtenerConfiguracionPublica,
    cotizarCarrito,
    crearPreferencia,
    crearPagoTarjeta,
    crearPagoOxxo,
    obtenerPago,
    recibirWebhook
};
