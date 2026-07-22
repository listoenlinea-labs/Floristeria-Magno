const express = require('express');

const {
    obtenerConfiguracion,
    actualizarConfiguracion
} = require('../controllers/configuracion.controller');

const basicAuth = require(
    '../middleware/basic-auth.middleware'
);

const router = express.Router();

/*
 * Lectura pública para index.html.
 */
router.get(
    '/',
    obtenerConfiguracion
);

/*
 * Escritura protegida para admin.html.
 */
router.put(
    '/',
    basicAuth,
    actualizarConfiguracion
);

module.exports = router;