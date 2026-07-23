const express = require('express');

const {
    listarEntregasRepartidor
} = require(
    '../controllers/repartidor-entregas.controller'
);

const repartidorAuth = require(
    '../middleware/repartidor-auth.middleware'
);

const router = express.Router();

/*
 * Todas las rutas de este archivo requieren
 * credenciales del repartidor.
 */
router.use(repartidorAuth);

router.get(
    '/',
    listarEntregasRepartidor
);

module.exports = router;