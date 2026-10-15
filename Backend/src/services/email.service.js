const {
    createMailerTransporter,
    getRequiredEnvironmentVariable
} = require('../config/mailer');

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function formatMoney(value) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(Number(value || 0));
}

async function enviarCorreoCodigoRastreo({
    email,
    nombreCliente,
    codigoRastreo,
    total,
    fechaEntrega,
    ventanaEntrega
}) {
    // No registrar correo del cliente ni código de rastreo en logs.
    const transporter =
        createMailerTransporter();

    const fromEmail =
        getRequiredEnvironmentVariable(
            'EMAIL_FROM'
        );

    const frontendUrl = String(
        process.env.FRONTEND_PUBLIC_URL || ''
    )
        .trim()
        .replace(/\/+$/, '');

    const trackingUrl = frontendUrl
        ? `${frontendUrl}/rastreo.html?codigo=${encodeURIComponent(
            codigoRastreo
        )}`
        : '';

    const safeName = escapeHtml(
        nombreCliente || 'Cliente'
    );

    const safeCode = escapeHtml(codigoRastreo);
    const safeDate = escapeHtml(fechaEntrega);
    const safeSlot = escapeHtml(ventanaEntrega);

    const trackingButton = trackingUrl
        ? `
            <p style="margin:28px 0;">
                <a
                    href="${trackingUrl}"
                    style="
                        display:inline-block;
                        padding:14px 24px;
                        background:#171313;
                        color:#ffffff;
                        text-decoration:none;
                        border-radius:999px;
                        font-weight:700;
                    "
                >
                    Rastrear mi pedido
                </a>
            </p>
        `
        : '';

    const info = await transporter.sendMail({
        from: `"Floristería Magno" <${fromEmail}>`,
        to: email,

        subject:
            `Tu código de rastreo es ${codigoRastreo}`,

        text: [
            `Hola ${nombreCliente || 'cliente'},`,
            '',
            'Tu pedido fue registrado correctamente.',
            `Código de rastreo: ${codigoRastreo}`,
            `Total: ${formatMoney(total)}`,
            `Fecha de entrega: ${fechaEntrega}`,
            `Horario: ${ventanaEntrega}`,
            '',
            trackingUrl
                ? `Rastrea tu pedido aquí: ${trackingUrl}`
                : '',
            '',
            'Floristería Magno'
        ]
            .filter(Boolean)
            .join('\n'),

        html: `
            <div
                style="
                    font-family:Arial,sans-serif;
                    max-width:620px;
                    margin:auto;
                    background:#fff8f8;
                    padding:32px;
                    border-radius:20px;
                    color:#2b2022;
                "
            >
                <p
                    style="
                        text-transform:uppercase;
                        letter-spacing:2px;
                        font-size:12px;
                        font-weight:700;
                    "
                >
                    Pedido floral
                </p>

                <h1 style="margin-bottom:16px;">
                    Gracias por tu pedido, ${safeName}
                </h1>

                <p>
                    Tu pedido fue registrado. Guarda el siguiente
                    código para consultar su avance:
                </p>

                <div
                    style="
                        background:#ffffff;
                        border:1px solid #eadcde;
                        border-radius:16px;
                        padding:24px;
                        margin:24px 0;
                        text-align:center;
                    "
                >
                    <small
                        style="
                            display:block;
                            margin-bottom:8px;
                            color:#76666a;
                        "
                    >
                        Código de rastreo
                    </small>

                    <strong
                        style="
                            font-size:28px;
                            letter-spacing:2px;
                        "
                    >
                        ${safeCode}
                    </strong>
                </div>

                <p>
                    <strong>Total:</strong>
                    ${formatMoney(total)}
                </p>

                <p>
                    <strong>Fecha de entrega:</strong>
                    ${safeDate}
                </p>

                <p>
                    <strong>Horario:</strong>
                    ${safeSlot}
                </p>

                ${trackingButton}

                <p style="margin-top:32px;color:#76666a;">
                    Floristería Magno
                </p>
            </div>
        `
    });
    console.info('Confirmación de pedido aceptada por servidor SMTP.');
    return info;
}


/**
 * Aviso interno independiente del correo al cliente. No usamos CC para evitar
 * revelar la dirección administrativa ni depender del éxito del primer envío.
 */
async function enviarAvisoAdministrador({
    emailCliente, nombreCliente, codigoRastreo, total, fechaEntrega, ventanaEntrega
}) {
    const destinatario = String(
        process.env.ORDER_ADMIN_EMAIL || 'soluciones@listoenlinea.com'
    ).trim();
    if (!destinatario || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)) {
        throw new Error('ORDER_ADMIN_EMAIL debe ser un correo válido');
    }
    const frontendUrl = String(process.env.FRONTEND_PUBLIC_URL || '')
        .trim().replace(/\/+$/, '');
    const trackingUrl = frontendUrl
        ? `${frontendUrl}/rastreo.html?codigo=${encodeURIComponent(codigoRastreo)}`
        : '';
    const lines = [
        'Nuevo pedido pagado - Floristería Magno',
        `Código de rastreo: ${codigoRastreo}`,
        `Cliente: ${nombreCliente || 'Sin nombre'}`,
        `Correo del cliente: ${emailCliente || 'No proporcionado'}`,
        `Total: ${formatMoney(total)}`,
        `Entrega: ${fechaEntrega || 'Por confirmar'}`,
        `Horario: ${ventanaEntrega || 'Por confirmar'}`,
        trackingUrl ? `Seguimiento: ${trackingUrl}` : ''
    ].filter(Boolean);
    const transporter = createMailerTransporter();
    const fromEmail = getRequiredEnvironmentVariable('EMAIL_FROM');
    const info = await transporter.sendMail({
        from: `"Floristería Magno" <${fromEmail}>`,
        to: destinatario,
        subject: `Nuevo pedido pagado · ${codigoRastreo}`,
        text: lines.join('\n'),
        html: '<div style="font-family:Arial,sans-serif;color:#2b2022;line-height:1.7">' +
            '<h2>Nuevo pedido pagado</h2>' +
            lines.map(line => `<p>${escapeHtml(line)}</p>`).join('') +
            '</div>'
    });
    console.info('Aviso administrativo aceptado por servidor SMTP.');
    return info;
}

async function verificarConexionCorreo() {
    const transporter = createMailerTransporter();
    await transporter.verify();
    return { ok: true, message: 'Conexión y autenticación SMTP verificadas' };
}

module.exports = {
    enviarCorreoCodigoRastreo,
    enviarAvisoAdministrador,
    verificarConexionCorreo
};