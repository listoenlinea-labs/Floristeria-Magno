const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WhatsappLeadEvento = sequelize.define(
    'WhatsappLeadEvento',
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

        tipo: {
            type: DataTypes.STRING(80),
            allowNull: false
        },

        /*
         * ID único proveniente de Meta.
         *
         * Ejemplo:
         * wamid.HBgN...
         *
         * Sirve para evitar almacenar dos veces
         * un mismo webhook.
         */
        externalId: {
            type: DataTypes.STRING(200),
            allowNull: true,
            unique: true,
            field: 'external_id'
        },

        telefonoCliente: {
            type: DataTypes.STRING(30),
            allowNull: true,
            field: 'telefono_cliente'
        },

        direccion: {
            type: DataTypes.STRING(20),
            allowNull: true
        },

        tipoMensaje: {
            type: DataTypes.STRING(40),
            allowNull: true,
            field: 'tipo_mensaje'
        },

        texto: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        whatsappTimestamp: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'whatsapp_timestamp'
        },

        datosJson: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'datos_json'
        },

        creadoEn: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'creado_en'
        }
    },
    {
        tableName: 'whatsapp_lead_eventos',
        timestamps: false,
        freezeTableName: true
    }
);

module.exports = WhatsappLeadEvento;