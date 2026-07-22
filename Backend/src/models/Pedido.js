const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pedido = sequelize.define(
    'Pedido',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        codigoRastreo: {
            type: DataTypes.STRING(30),
            allowNull: false,
            unique: true,
            field: 'codigo_rastreo'
        },

        clienteId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'cliente_id'
        },

        nombreDestinatario: {
            type: DataTypes.STRING(150),
            allowNull: true,
            field: 'nombre_destinatario'
        },

        telefonoDestinatario: {
            type: DataTypes.STRING(30),
            allowNull: true,
            field: 'telefono_destinatario'
        },

        direccionEntrega: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'direccion_entrega'
        },

        referenciasEntrega: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'referencias_entrega'
        },

        total: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0
        },

        estado: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'PENDIENTE'
        },

        tipoPedido: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'tipo_pedido'
        },

        fechaEntrega: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            field: 'fecha_entrega'
        },

        ventanaEntrega: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'ventana_entrega'
        },

        mensajeTarjeta: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'mensaje_tarjeta'
        },

        metodoPago: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'metodo_pago'
        },

        estadoPago: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'PENDIENTE',
            field: 'estado_pago'
        },

        referenciaPago: {
            type: DataTypes.STRING(150),
            allowNull: true,
            field: 'referencia_pago'
        },

        comprobanteUrl: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'comprobante_url'
        },

        creadoEn: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'creado_en',
            defaultValue: DataTypes.NOW
        },

        actualizadoEn: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'actualizado_en',
            defaultValue: DataTypes.NOW
        }
    },
    {
        tableName: 'pedidos',
        timestamps: false,
        freezeTableName: true
    }
);

module.exports = Pedido;