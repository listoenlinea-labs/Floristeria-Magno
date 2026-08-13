const express =
    require('express');

const {
    obtenerDashboardVentas
} = require(
    '../controllers/ventas.controller'
);

const basicAuth =
    require(
        '../middleware/basic-auth.middleware'
    );

const router =
    express.Router();


/*
 * Solo administración.
 */
router.use(
    basicAuth
);


router.get(
    '/dashboard',
    obtenerDashboardVentas
);


module.exports =
    router;