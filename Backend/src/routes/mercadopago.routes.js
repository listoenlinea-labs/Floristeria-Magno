const express = require('express');

const {
    crearPreferencia,
    obtenerPago,
    recibirWebhook
} = require('../controllers/mercadopago.controller');

const router = express.Router();

router.post('/create-preference', crearPreferencia);
router.get('/payment/:id', obtenerPago);
router.post('/webhook', recibirWebhook);

module.exports = router;
