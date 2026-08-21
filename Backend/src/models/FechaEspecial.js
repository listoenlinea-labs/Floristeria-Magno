const {
    DataTypes
} = require('sequelize');

const sequelize =
    require('../config/database');

const FechaEspecial =
    sequelize.define(
        'FechaEspecial',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },

            nombre: {
                type: DataTypes.STRING(120),
                allowNull: false
            },

            fechaEspecial: {
                type: DataTypes.DATE,
                allowNull: false,
                field: 'fecha_especial'
            },

            inicioAviso: {
                type: DataTypes.DATE,
                allowNull: true,
                field: 'inicio_aviso'
            },

            fechaCorte: {
                type: DataTypes.DATE,
                allowNull: false,
                field: 'fecha_corte'
            },

            finBloqueo: {
                type: DataTypes.DATE,
                allowNull: false,
                field: 'fin_bloqueo'
            },

            mensajeAviso: {
                type: DataTypes.STRING(500),
                allowNull: true,
                field: 'mensaje_aviso'
            },

            mensajeBloqueo: {
                type: DataTypes.STRING(500),
                allowNull: true,
                field: 'mensaje_bloqueo'
            },

            activo: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },

            creadoEn: {
                type: DataTypes.DATE,
                allowNull: true,
                field: 'creado_en',
                defaultValue: DataTypes.NOW
            },

            actualizadoEn: {
                type: DataTypes.DATE,
                allowNull: true,
                field: 'actualizado_en',
                defaultValue: DataTypes.NOW
            }
        },
        {
            tableName:
                'fechas_especiales',

            timestamps:
                false,

            freezeTableName:
                true
        }
    );

module.exports =
    FechaEspecial;