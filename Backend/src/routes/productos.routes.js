const express = require('express');

const {
    listarProductos,
    reordenarProductos,
    obtenerProducto,
    crearProducto,
    actualizarProducto,
    cambiarEstadoProducto
} = require('../controllers/productos.controller');

const basicAuth = require(
    '../middleware/basic-auth.middleware'
);

const router = express.Router();

function allowInactive(req, res, next) {
    req.allowInactive = true;
    next();
}

/*
 * Rutas públicas.
 */
router.get('/', listarProductos);

/*
 * Ruta administrativa.
 * Debe estar antes de /:id.
 */
router.get(
    '/admin/todos',
    basicAuth,
    allowInactive,
    listarProductos
);

router.put('/admin/orden', basicAuth, reordenarProductos);

router.get('/:id', obtenerProducto);

/*
 * Rutas administrativas.
 */
router.post(
    '/',
    basicAuth,
    crearProducto
);

router.put(
    '/:id',
    basicAuth,
    actualizarProducto
);

router.patch(
    '/:id/estado',
    basicAuth,
    cambiarEstadoProducto
);

module.exports = router;