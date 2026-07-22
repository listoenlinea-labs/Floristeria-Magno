const Cliente = require('./Cliente');
const Producto = require('./Producto');
const Pedido = require('./Pedido');
const DetallePedido = require('./DetallePedido');
const HistorialPedido = require('./HistorialPedido');
const Galeria = require('./Galeria');
const Configuracion = require('./Configuracion');

/*
 * clientes 1 ─── N pedidos
 */
Cliente.hasMany(Pedido, {
    foreignKey: 'clienteId',
    as: 'pedidos'
});

Pedido.belongsTo(Cliente, {
    foreignKey: 'clienteId',
    as: 'cliente'
});

/*
 * pedidos 1 ─── N detalle_pedido
 */
Pedido.hasMany(DetallePedido, {
    foreignKey: 'pedidoId',
    as: 'detalles'
});

DetallePedido.belongsTo(Pedido, {
    foreignKey: 'pedidoId',
    as: 'pedido'
});

/*
 * productos 1 ─── N detalle_pedido
 */
Producto.hasMany(DetallePedido, {
    foreignKey: 'productoId',
    as: 'detallesPedido'
});

DetallePedido.belongsTo(Producto, {
    foreignKey: 'productoId',
    as: 'producto'
});

/*
 * pedidos 1 ─── N historial_pedido
 */
Pedido.hasMany(HistorialPedido, {
    foreignKey: 'pedidoId',
    as: 'historial'
});

HistorialPedido.belongsTo(Pedido, {
    foreignKey: 'pedidoId',
    as: 'pedido'
});

module.exports = {
    Cliente,
    Producto,
    Pedido,
    DetallePedido,
    HistorialPedido,
    Galeria,
    Configuracion
};