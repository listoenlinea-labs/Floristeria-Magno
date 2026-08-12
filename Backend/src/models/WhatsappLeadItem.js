const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WhatsappLeadItem = sequelize.define(
    'WhatsappLeadItem',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        leadId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'lead_id'
        },

        productoId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'producto_id'
        },

        nombreProducto: {
            type: DataTypes.STRING(150),
            allowNull: false,
            field: 'nombre_producto'
        },

        cantidad: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        precioUnitario: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            field: 'precio_unitario'
        },

        subtotal: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },

        creadoEn: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'creado_en'
        }
    },
    {
        tableName: 'whatsapp_lead_items',
        timestamps: false,
        freezeTableName: true
    }
);

module.exports = WhatsappLeadItem;