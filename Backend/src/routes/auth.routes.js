const express = require('express');

const {
    login
} = require('../controllers/auth.controller');

const basicAuth = require(
    '../middleware/basic-auth.middleware'
);

const repartidorAuth = require(
    '../middleware/repartidor-auth.middleware'
);

const router = express.Router();

/*
 * Se conserva por compatibilidad.
 * Actualmente admin.html usa Basic Auth.
 */
router.post('/login', login);

/*
 * Verifica credenciales administrativas.
 */
router.get(
    '/admin/verificar',
    basicAuth,
    (req, res) => {
        return res.status(200).json({
            ok: true,
            data: {
                role: 'admin',
                email: req.auth.email
            }
        });
    }
);

/*
 * Verifica credenciales de repartidor.
 */
router.get(
    '/repartidor/verificar',
    repartidorAuth,
    (req, res) => {
        return res.status(200).json({
            ok: true,
            data: {
                role: 'repartidor',
                email: req.auth.email
            }
        });
    }
);

module.exports = router;