const express = require('express');

const {
    generarAccesoRepartidor,
    iniciarRastreo,
    actualizarUbicacion,
    finalizarRastreo,
    obtenerUbicacionPublica
} = require(
    '../controllers/rastreo-ubicacion.controller'
);

const basicAuth = require(
    '../middleware/basic-auth.middleware'
);

const repartidorAuth = require(
    '../middleware/repartidor-auth.middleware'
);

const router = express.Router();

/*
 * Consulta pública del cliente.
 */
router.get(
    '/publico/:codigoRastreo',
    obtenerUbicacionPublica
);

/*
 * Se conserva por compatibilidad administrativa,
 * aunque el panel nuevo ya no necesita usar el token.
 */
router.post(
    '/admin/:id/generar-acceso',
    basicAuth,
    generarAccesoRepartidor
);

/*
 * Acciones exclusivas del repartidor.
 */
router.post(
    '/repartidor/:id/iniciar',
    repartidorAuth,
    iniciarRastreo
);

router.post(
    '/repartidor/:id/ubicacion',
    repartidorAuth,
    actualizarUbicacion
);

router.post(
    '/repartidor/:id/finalizar',
    repartidorAuth,
    finalizarRastreo
);

module.exports = router;