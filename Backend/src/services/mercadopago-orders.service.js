'use strict';

function formatAmount(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount) || amount <= 0) {
        throw new TypeError('El importe de la orden no es válido');
    }

    return amount.toFixed(2);
}

function getOrderPayment(order) {
    const payments = order?.transactions?.payments;

    return Array.isArray(payments)
        ? payments[0] || null
        : null;
}

function normalizeOrderStatus(order) {
    const payment = getOrderPayment(order);
    const rawStatus = String(
        payment?.status || order?.status || ''
    ).toLowerCase();

    if (rawStatus === 'processed' || rawStatus === 'accredited') {
        return 'approved';
    }

    if (
        [
            'created',
            'processing',
            'action_required',
            'pending',
            'in_process',
            'waiting_payment'
        ].includes(rawStatus)
    ) {
        return 'pending';
    }

    if (rawStatus === 'failed') {
        return 'rejected';
    }

    if (rawStatus === 'canceled' || rawStatus === 'expired') {
        return 'cancelled';
    }

    return rawStatus || 'pending';
}

function getOrderStatusDetail(order) {
    const payment = getOrderPayment(order);

    return payment?.status_detail || order?.status_detail || null;
}

function getOrderTicketUrl(order) {
    const payment = getOrderPayment(order);

    return (
        payment?.payment_method?.ticket_url ||
        payment?.payment_method?.transaction_details?.external_resource_url ||
        null
    );
}

function getOrderChallengeUrl(order) {
    const payment = getOrderPayment(order);

    return (
        payment?.payment_method?.transaction_security?.url ||
        payment?.payment_method?.transaction_security?.redirect_url ||
        null
    );
}

function normalizeOrderAsPayment(order) {
    const payment = getOrderPayment(order) || {};
    const paymentMethod = payment.payment_method || {};
    const normalizedStatus = normalizeOrderStatus(order);

    return {
        id: order?.id,
        mercado_pago_payment_id: payment.id || null,
        external_reference: order?.external_reference,
        status: normalizedStatus,
        status_detail: getOrderStatusDetail(order),
        transaction_amount: Number(
            payment.paid_amount ??
            payment.amount ??
            order?.total_paid_amount ??
            order?.total_amount
        ),
        currency_id: order?.currency || order?.currency_id || 'MXN',
        date_approved:
            normalizedStatus === 'approved'
                ? order?.last_updated_date || order?.created_date || new Date().toISOString()
                : null,
        payment_method_id: paymentMethod.id || null,
        payment_type_id: paymentMethod.type || null
    };
}

function buildCardOrderBody({
    amount,
    externalReference,
    payerEmail,
    identification,
    paymentMethodId,
    paymentTypeId,
    token,
    installments
}) {
    const formattedAmount = formatAmount(amount);
    const payer = {
        email: payerEmail
    };

    if (identification) {
        payer.identification = identification;
    }

    return {
        type: 'online',
        processing_mode: 'automatic',
        capture_mode: 'automatic',
        total_amount: formattedAmount,
        external_reference: externalReference,
        description: `Pedido floral ${externalReference}`,
        payer,
        transactions: {
            payments: [
                {
                    amount: formattedAmount,
                    payment_method: {
                        id: paymentMethodId,
                        type: paymentTypeId,
                        token,
                        installments
                    }
                }
            ]
        },
        config: {
            statement_descriptor: 'JH MAGNO',
            online: {
                transaction_security: {
                    validation: 'on_fraud_risk',
                    liability_shift: 'required'
                }
            }
        }
    };
}

function splitPayerName(fullName) {
    const parts = String(fullName || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    return {
        firstName: parts.shift() || undefined,
        lastName: parts.join(' ') || undefined
    };
}

function buildOxxoOrderBody({
    amount,
    externalReference,
    payerEmail,
    payerName
}) {
    const formattedAmount = formatAmount(amount);
    const { firstName, lastName } = splitPayerName(payerName);
    const payer = {
        email: payerEmail
    };

    if (firstName) {
        payer.first_name = firstName;
    }

    if (lastName) {
        payer.last_name = lastName;
    }

    return {
        type: 'online',
        processing_mode: 'automatic',
        total_amount: formattedAmount,
        external_reference: externalReference,
        description: `Pedido floral ${externalReference}`,
        expiration_time: 'P3D',
        payer,
        transactions: {
            payments: [
                {
                    amount: formattedAmount,
                    payment_method: {
                        id: 'oxxo',
                        type: 'ticket'
                    }
                }
            ]
        }
    };
}

module.exports = {
    buildCardOrderBody,
    buildOxxoOrderBody,
    getOrderChallengeUrl,
    getOrderPayment,
    getOrderStatusDetail,
    getOrderTicketUrl,
    normalizeOrderAsPayment,
    normalizeOrderStatus
};

