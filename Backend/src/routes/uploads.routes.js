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
    auditarAlmacenamientoImagenes
} = require('../controllers/uploads.controller');

const router = express.Router();

router.get(
    '/health',
    basicAuth,
    auditarAlmacenamientoImagenes
);

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