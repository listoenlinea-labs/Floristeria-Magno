const express = require('express');

const {
    rastrearPedido
} = require('../controllers/rastreo.controller');

const router = express.Router();

/*
 * Ruta pública.
 * No lleva Basic Auth porque la utilizarán los compradores.
 */
router.get('/:codigoRastreo', rastrearPedido);

module.exports = router;