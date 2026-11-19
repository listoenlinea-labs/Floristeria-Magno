const express = require('express');

const {
    obtenerConfiguracion,
    actualizarConfiguracion,
    actualizarOpcionesTienda
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

router.put('/opciones', basicAuth, actualizarOpcionesTienda);

module.exports = router;