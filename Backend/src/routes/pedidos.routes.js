const express = require('express');

const {
    listarPedidos,
    obtenerPedido,
    obtenerCalendarioPedidos
} = require('../controllers/pedidos.controller');

const {
    actualizarEstadoPedido
} = require('../controllers/estado-pedido.controller');

const basicAuth = require(
    '../middleware/basic-auth.middleware'
);

const router = express.Router();

/*
 * Todas estas rutas son administrativas.
 */
router.use(basicAuth);

router.get('/', listarPedidos);

/*
 * Esta ruta debe ir antes de /:id.
 */
router.get(
    '/calendario',
    obtenerCalendarioPedidos
);

router.patch(
    '/:id/estado',
    actualizarEstadoPedido
);

router.get('/:id', obtenerPedido);

module.exports = router;