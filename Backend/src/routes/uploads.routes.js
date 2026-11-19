const express = require('express');

const basicAuth = require(
    '../middleware/basic-auth.middleware'
);

const {
    uploadProductImage,
    uploadGalleryImage
} = require('../middleware/upload.middleware');

const {
    subirImagenProducto,
    subirImagenGaleria,
    auditarAlmacenamientoImagenes,
    revisarIntegridadImagenes
} = require('../controllers/uploads.controller');

const { verificarConexionCorreo } = require('../services/email.service');

const router = express.Router();

router.get('/smtp/health', basicAuth, async (req, res) => {
    try {
        await verificarConexionCorreo();
        res.json({ ok: true, message: 'Autenticación SMTP operativa' });
    } catch (error) {
        console.error('SMTP health falló:', { code: error.code || 'CONFIG_ERROR', command: error.command || null });
        res.status(503).json({ ok: false, message: 'No fue posible autenticar con el servidor de correo. Revisa las variables SMTP en Hostinger.' });
    }
});

router.get(
    '/health',
    basicAuth,
    auditarAlmacenamientoImagenes
);

// Las rutas de diagnóstico están protegidas y no exponen fotos ni datos personales.
router.get('/integridad', basicAuth, revisarIntegridadImagenes);
router.post('/integridad/reparar', basicAuth, revisarIntegridadImagenes);

router.post(
    '/producto',
    basicAuth,
    uploadProductImage,
    subirImagenProducto
);

router.post(
    '/galeria',
    basicAuth,
    uploadGalleryImage,
    subirImagenGaleria
);

module.exports = router;