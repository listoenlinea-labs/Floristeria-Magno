const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Configuracion = sequelize.define(
    'Configuracion',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        nombreNegocio: {
            type: DataTypes.STRING(150),
            allowNull: false,
            field: 'nombre_negocio'
        },

        whatsapp: {
            type: DataTypes.STRING(30),
            allowNull: true
        },

        telefono: {
            type: DataTypes.STRING(30),
            allowNull: true
        },

        direccion: {
            type: DataTypes.STRING(255),
            allowNull: true
        },

        horario: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        heroTitulo: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'hero_titulo'
        },

        heroSubtitulo: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'hero_subtitulo'
        },

        heroBotonTexto: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'hero_boton_texto'
        },

        instagramUrl: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'instagram_url'
        },

        facebookUrl: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'facebook_url'
        },

        tiktokUrl: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'tiktok_url'
        },

        googleMapsUrl: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'google_maps_url'
        },

        activo: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
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
        tableName: 'configuracion',
        timestamps: false,
        freezeTableName: true
    }
);

module.exports = Configuracion;