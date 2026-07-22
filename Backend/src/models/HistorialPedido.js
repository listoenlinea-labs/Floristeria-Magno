const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HistorialPedido = sequelize.define(
    'HistorialPedido',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        pedidoId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'pedido_id'
        },

        estado: {
            type: DataTypes.STRING(50),
            allowNull: false
        },

        descripcion: {
            type: DataTypes.STRING(255),
            allowNull: true
        },

        creadoEn: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'creado_en',
            defaultValue: DataTypes.NOW
        }
    },
    {
        tableName: 'historial_pedido',
        timestamps: false,
        freezeTableName: true
    }
);

module.exports = HistorialPedido;