const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductoImagen = sequelize.define(
    'ProductoImagen',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        productoId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'producto_id'
        },

        imagenUrl: {
            type: DataTypes.STRING(500),
            allowNull: false,
            field: 'imagen_url'
        },

        orden: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        },

        creadoEn: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'creado_en',
            defaultValue: DataTypes.NOW
        }
    },
    {
        tableName: 'producto_imagenes',
        timestamps: false,
        freezeTableName: true
    }
);

module.exports = ProductoImagen;