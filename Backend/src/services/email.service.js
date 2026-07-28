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
    console.log('====================================');
    console.log('INICIANDO ENVÍO DE CORREO');
    console.log('Destino:', email);
    console.log('Nombre:', nombreCliente);
    console.log('Código:', codigoRastreo);
    console.log('====================================');
    const transporter =
        createMailerTransporter();
    console.log('Transporter SMTP creado correctamente.');

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

    console.log('Enviando correo...');
    const info = await transporter.sendMail({
        from: `"Floristería Juan H Magno" <${fromEmail}>`,
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
            'Floristería Juan H Magno'
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
                    Floristería Juan H Magno
                </p>
            </div>
        `
    });
    console.log('====================================');
    console.log('CORREO ENVIADO EXITOSAMENTE');
    console.log('Message ID:', info.messageId);
    console.log('Respuesta SMTP:', info.response);
    console.log('====================================');
}

module.exports = {
    enviarCorreoCodigoRastreo
};