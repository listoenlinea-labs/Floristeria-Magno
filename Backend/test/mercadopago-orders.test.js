'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildCardOrderBody,
    buildOxxoOrderBody,
    getOrderChallengeUrl,
    getOrderTicketUrl,
    normalizeOrderAsPayment,
    normalizeOrderStatus
} = require('../src/services/mercadopago-orders.service');

test('construye una orden de tarjeta con token y 3DS administrado por Mercado Pago', () => {
    const body = buildCardOrderBody({
        amount: 1120,
        externalReference: 'JHM-000051',
        payerEmail: 'comprador@example.com',
        identification: {
            type: 'RFC',
            number: 'XAXX010101000'
        },
        paymentMethodId: 'visa',
        paymentTypeId: 'credit_card',
        token: 'token-seguro-de-prueba',
        installments: 3
    });

    assert.equal(body.total_amount, '1120.00');
    assert.equal(body.transactions.payments[0].amount, '1120.00');
    assert.deepEqual(
        body.transactions.payments[0].payment_method,
        {
            id: 'visa',
            type: 'credit_card',
            token: 'token-seguro-de-prueba',
            installments: 3
        }
    );
    assert.equal(
        body.config.online.transaction_security.validation,
        'on_fraud_risk'
    );
});

test('construye una orden OXXO de tipo ticket con expiración', () => {
    const body = buildOxxoOrderBody({
        amount: 620.5,
        externalReference: 'JHM-000052',
        payerEmail: 'comprador@example.com',
        payerName: 'Juan Antonio Olvera Robles'
    });

    assert.equal(body.total_amount, '620.50');
    assert.equal(body.expiration_time, 'P3D');
    assert.equal(body.payer.first_name, 'Juan');
    assert.equal(body.payer.last_name, 'Antonio Olvera Robles');
    assert.deepEqual(
        body.transactions.payments[0].payment_method,
        {
            id: 'oxxo',
            type: 'ticket'
        }
    );
});

test('normaliza los estados de Orders API al modelo actual del pedido', () => {
    assert.equal(
        normalizeOrderStatus({ status: 'processed' }),
        'approved'
    );
    assert.equal(
        normalizeOrderStatus({
            status: 'action_required',
            transactions: {
                payments: [
                    {
                        status: 'action_required',
                        status_detail: 'pending_challenge'
                    }
                ]
            }
        }),
        'pending'
    );
    assert.equal(
        normalizeOrderStatus({ status: 'failed' }),
        'rejected'
    );
});

test('extrae las URLs de OXXO y del desafío 3DS', () => {
    const order = {
        transactions: {
            payments: [
                {
                    payment_method: {
                        ticket_url: 'https://mercadopago.test/oxxo',
                        transaction_security: {
                            url: 'https://mercadopago.test/3ds'
                        }
                    }
                }
            ]
        }
    };

    assert.equal(
        getOrderTicketUrl(order),
        'https://mercadopago.test/oxxo'
    );
    assert.equal(
        getOrderChallengeUrl(order),
        'https://mercadopago.test/3ds'
    );
});

test('convierte una orden acreditada al contrato interno de pago', () => {
    const payment = normalizeOrderAsPayment({
        id: 'ORDTST-123',
        status: 'processed',
        external_reference: 'JHM-000053',
        total_amount: '740.00',
        currency: 'MXN',
        last_updated_date: '2026-10-15T12:00:00.000Z',
        transactions: {
            payments: [
                {
                    id: 'PAY-123',
                    status: 'processed',
                    paid_amount: '740.00',
                    payment_method: {
                        id: 'visa',
                        type: 'credit_card'
                    }
                }
            ]
        }
    });

    assert.equal(payment.id, 'ORDTST-123');
    assert.equal(payment.status, 'approved');
    assert.equal(payment.transaction_amount, 740);
    assert.equal(payment.payment_type_id, 'credit_card');
});
