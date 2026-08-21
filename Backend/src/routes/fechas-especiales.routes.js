const express =
    require('express');

const basicAuth =
    require('../middleware/basic-auth.middleware');

const {
    listarFechasEspeciales,
    obtenerEstadoActual,
    crearFechaEspecial,
    actualizarFechaEspecial,
    eliminarFechaEspecial
} = require(
    '../controllers/fechas-especiales.controller'
);

const router =
    express.Router();


/*
 * =========================================================
 * RUTA PÚBLICA
 * =========================================================
 *
 * Esta ruta será consultada por carrito.html.
 * NO lleva Basic Auth.
 */
router.get(
    '/estado',
    obtenerEstadoActual
);


/*
 * =========================================================
 * RUTAS ADMINISTRATIVAS
 * =========================================================
 */

router.get(
    '/admin/todas',
    basicAuth,
    listarFechasEspeciales
);


router.post(
    '/',
    basicAuth,
    crearFechaEspecial
);


router.put(
    '/:id',
    basicAuth,
    actualizarFechaEspecial
);


router.delete(
    '/:id',
    basicAuth,
    eliminarFechaEspecial
);


module.exports =
    router;