function getRequiredEnvironmentVariable(name) {
    const value = String(process.env[name] || '').trim();

    if (!value) {
        throw new Error(`Falta configurar la variable de entorno ${name}`);
    }

    return value;
}

function formatMoney(value) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(Number(value || 0));
}

function normalizeTemplateValue(value, maxLength = 1000) {
    const text = String(value ?? '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, maxLength);

    return text || '-';
}

async function enviarWhatsappConfirmacionPedido({
    telefono,
    nombreCliente,
    codigoRastreo,
    total,
    fechaEntrega,
    ventanaEntrega,
    direccionEntrega,
    productos = []
}) {
    if (!telefono) {
        return {
            skipped: true,
            reason: 'missing_phone'
        };
    }

    if (!/^\+[1-9]\d{7,14}$/.test(telefono)) {
        throw new Error('El teléfono de WhatsApp no tiene formato E.164 válido');
    }

    const accessToken = getRequiredEnvironmentVariable(
        'WHATSAPP_ACCESS_TOKEN'
    );
    const phoneNumberId = getRequiredEnvironmentVariable(
        'WHATSAPP_PHONE_NUMBER_ID'
    );
    const templateName = getRequiredEnvironmentVariable(
        'WHATSAPP_ORDER_TEMPLATE_NAME'
    );
    const graphVersion = String(
        process.env.WHATSAPP_GRAPH_API_VERSION || 'v24.0'
    ).trim();
    const languageCode = String(
        process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es_MX'
    ).trim();
    const frontendUrl = String(process.env.FRONTEND_PUBLIC_URL || '')
        .trim()
        .replace(/\/+$/, '');
    const trackingUrl = frontendUrl
        ? `${frontendUrl}/rastreo.html?codigo=${encodeURIComponent(
            codigoRastreo
        )}`
        : codigoRastreo;
    const productSummary = productos.length
        ? productos.map((producto) => (
            `${producto.cantidad} x ${producto.nombre}`
        )).join(', ')
        : 'Pedido floral';

    const templateValues = [
        nombreCliente || 'Cliente',
        codigoRastreo,
        productSummary,
        formatMoney(total),
        fechaEntrega,
        ventanaEntrega,
        direccionEntrega,
        trackingUrl
    ].map((value) => ({
        type: 'text',
        text: normalizeTemplateValue(value)
    }));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let response;

    try {
        response = await fetch(
            `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: telefono.replace(/^\+/, ''),
                    type: 'template',
                    template: {
                        name: templateName,
                        language: {
                            code: languageCode
                        },
                        components: [
                            {
                                type: 'body',
                                parameters: templateValues
                            }
                        ]
                    }
                }),
                signal: controller.signal
            }
        );
    } finally {
        clearTimeout(timeout);
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        const apiMessage = result?.error?.message || 'Error desconocido';
        throw new Error(`WhatsApp Cloud API rechazó el mensaje: ${apiMessage}`);
    }

    return {
        skipped: false,
        messageId: result?.messages?.[0]?.id || null
    };
}

module.exports = {
    enviarWhatsappConfirmacionPedido
};
