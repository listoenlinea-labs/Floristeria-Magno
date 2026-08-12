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