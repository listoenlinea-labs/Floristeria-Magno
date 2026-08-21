const Cliente = require('./Cliente');
const Producto = require('./Producto');
const ProductoImagen = require('./ProductoImagen');
const Pedido = require('./Pedido');
const DetallePedido = require('./DetallePedido');
const HistorialPedido = require('./HistorialPedido');
const Galeria = require('./Galeria');
const Configuracion = require('./Configuracion');
const RastreoUbicacion = require('./RastreoUbicacion');
const FechaEspecial = require('./FechaEspecial');
const WhatsappLead = require('./WhatsappLead');
const WhatsappLeadItem = require('./WhatsappLeadItem');
const WhatsappLeadEvento = require('./WhatsappLeadEvento');


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
 * productos 1 ─── N producto_imagenes
 */
Producto.hasMany(ProductoImagen, {
    foreignKey: 'productoId',
    as: 'imagenes'
});

ProductoImagen.belongsTo(Producto, {
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


Pedido.hasMany(RastreoUbicacion, {
    foreignKey: 'pedidoId',
    as: 'ubicaciones'
});

RastreoUbicacion.belongsTo(Pedido, {
    foreignKey: 'pedidoId',
    as: 'pedido'
});


/*
 * whatsapp_leads 1 ─── N whatsapp_lead_items
 */
WhatsappLead.hasMany(WhatsappLeadItem, {
    foreignKey: 'leadId',
    as: 'items'
});

WhatsappLeadItem.belongsTo(WhatsappLead, {
    foreignKey: 'leadId',
    as: 'lead'
});


/*
 * productos 1 ─── N whatsapp_lead_items
 */
Producto.hasMany(WhatsappLeadItem, {
    foreignKey: 'productoId',
    as: 'whatsappLeadItems'
});

WhatsappLeadItem.belongsTo(Producto, {
    foreignKey: 'productoId',
    as: 'producto'
});


/*
 * whatsapp_leads 1 ─── N eventos
 */
WhatsappLead.hasMany(WhatsappLeadEvento, {
    foreignKey: 'leadId',
    as: 'eventos'
});

WhatsappLeadEvento.belongsTo(WhatsappLead, {
    foreignKey: 'leadId',
    as: 'lead'
});


/*
 * whatsapp_leads 1 ─── 0/1 pedido
 */
WhatsappLead.hasOne(Pedido, {
    foreignKey: 'whatsappLeadId',
    as: 'pedido'
});

Pedido.belongsTo(WhatsappLead, {
    foreignKey: 'whatsappLeadId',
    as: 'whatsappLead'
});


module.exports = {
    Cliente,
    Producto,
    ProductoImagen,
    Pedido,
    DetallePedido,
    HistorialPedido,
    Galeria,
    Configuracion,
    RastreoUbicacion,
    FechaEspecial,
    WhatsappLead,
    WhatsappLeadItem,
    WhatsappLeadEvento
};