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

async function enviarCorreoConfirmacionPedido({
    email,
    nombreCliente,
    codigoRastreo,
    total,
    fechaEntrega,
    ventanaEntrega,
    direccionEntrega,
    productos = []
}) {
    const transporter = createMailerTransporter();
    const fromEmail = getRequiredEnvironmentVariable('EMAIL_FROM');
    const frontendUrl = String(process.env.FRONTEND_PUBLIC_URL || '')
        .trim()
        .replace(/\/+$/, '');

    const trackingUrl = frontendUrl
        ? `${frontendUrl}/rastreo.html?codigo=${encodeURIComponent(
            codigoRastreo
        )}`
        : '';

    const safeName = escapeHtml(nombreCliente || 'Cliente');
    const safeCode = escapeHtml(codigoRastreo);
    const safeDate = escapeHtml(fechaEntrega);
    const safeSlot = escapeHtml(ventanaEntrega);
    const safeAddress = escapeHtml(direccionEntrega);

    const productText = productos.length
        ? productos.map((producto) => (
            `${producto.cantidad} × ${producto.nombre}: ` +
            formatMoney(producto.subtotal)
        ))
        : ['Detalle de productos no disponible'];

    const productRows = productos.length
        ? productos.map((producto) => `
            <tr>
                <td style="padding:8px 0;border-bottom:1px solid #eadcde;">
                    ${escapeHtml(producto.cantidad)} × ${escapeHtml(producto.nombre)}
                </td>
                <td style="padding:8px 0;border-bottom:1px solid #eadcde;text-align:right;">
                    ${formatMoney(producto.subtotal)}
                </td>
            </tr>
        `).join('')
        : `
            <tr>
                <td style="padding:8px 0;">Detalle de productos no disponible</td>
            </tr>
        `;

    const trackingButton = trackingUrl
        ? `
            <p style="margin:28px 0;">
                <a href="${trackingUrl}"
                    style="display:inline-block;padding:14px 24px;background:#171313;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;">
                    Rastrear mi pedido
                </a>
            </p>
        `
        : '';

    return transporter.sendMail({
        from: `"Floristería Magno" <${fromEmail}>`,
        to: email,
        subject: `Pago confirmado · Pedido ${codigoRastreo}`,
        text: [
            `Hola ${nombreCliente || 'cliente'},`,
            '',
            'Mercado Pago confirmó tu pago. Estos son los datos de tu pedido:',
            `Código de rastreo: ${codigoRastreo}`,
            ...productText,
            `Total: ${formatMoney(total)}`,
            `Entrega: ${fechaEntrega} · ${ventanaEntrega}`,
            `Dirección: ${direccionEntrega}`,
            trackingUrl ? `Rastreo: ${trackingUrl}` : '',
            '',
            'Floristería Magno'
        ].filter(Boolean).join('\n'),
        html: `
            <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;background:#fff8f8;padding:32px;border-radius:20px;color:#2b2022;">
                <p style="text-transform:uppercase;letter-spacing:2px;font-size:12px;font-weight:700;">
                    Pago confirmado
                </p>

                <h1 style="margin-bottom:16px;">Gracias por tu pedido, ${safeName}</h1>
                <p>Mercado Pago confirmó tu pago. Ya comenzamos a preparar tu pedido.</p>

                <div style="background:#ffffff;border:1px solid #eadcde;border-radius:16px;padding:24px;margin:24px 0;text-align:center;">
                    <small style="display:block;margin-bottom:8px;color:#76666a;">Código de rastreo</small>
                    <strong style="font-size:28px;letter-spacing:2px;">${safeCode}</strong>
                </div>

                <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                    <tbody>${productRows}</tbody>
                </table>

                <p><strong>Total:</strong> ${formatMoney(total)}</p>
                <p><strong>Fecha de entrega:</strong> ${safeDate}</p>
                <p><strong>Horario:</strong> ${safeSlot}</p>
                <p><strong>Dirección:</strong> ${safeAddress}</p>

                ${trackingButton}

                <p style="margin-top:32px;color:#76666a;">Floristería Magno</p>
            </div>
        `
    });
}

module.exports = {
    enviarCorreoConfirmacionPedido
};
