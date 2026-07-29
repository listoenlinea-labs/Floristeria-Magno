const express = require('express');

const {
    listarEntregasRepartidor
} = require(
    '../controllers/repartidor-entregas.controller'
);

const adminORepartidorAuth = require(
    '../middleware/admin-o-repartidor-auth.middleware'
);

const router = express.Router();

/*
 * Todas las rutas de este archivo requieren
 * credenciales del repartidor.
 */
router.use(adminORepartidorAuth);

router.get(
    '/',
    listarEntregasRepartidor
);

module.exports = router;