const express = require('express');

const {
    authenticateToken
} = require('../middleware/auth.middleware');

const {
    listarProductos,
    obtenerProducto
} = require('../controllers/productos.controller');

const router = express.Router();

router.use(authenticateToken);
router.get('/', listarProductos);
router.get('/:id', obtenerProducto);

module.exports = router;