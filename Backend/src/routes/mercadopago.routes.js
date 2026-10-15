const express = require('express');

const {
    obtenerConfiguracionPublica,
    cotizarCarrito,
    crearPreferencia,
    crearPagoTarjeta,
    crearPagoOxxo,
    obtenerPago,
    recibirWebhook
} = require('../controllers/mercadopago.controller');

const router = express.Router();

router.get('/public-config', obtenerConfiguracionPublica);
router.post('/quote', cotizarCarrito);
router.post('/create-preference', crearPreferencia);
router.post('/process-card-payment', crearPagoTarjeta);
router.post('/create-oxxo-payment', crearPagoOxxo);
router.get('/payment/:id', obtenerPago);
router.post('/webhook', recibirWebhook);

module.exports = router;
