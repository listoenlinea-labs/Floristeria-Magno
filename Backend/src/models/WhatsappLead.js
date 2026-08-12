const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WhatsappLead = sequelize.define(
    'WhatsappLead',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        codigo: {
            type: DataTypes.STRING(40),
            allowNull: false,
            unique: true
        },

        visitorId: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'visitor_id'
        },

        ipHash: {
            type: DataTypes.STRING(64),
            allowNull: true,
            field: 'ip_hash'
        },

        origen: {
            type: DataTypes.STRING(30),
            allowNull: false,
            defaultValue: 'WEB'
        },

        canal: {
            type: DataTypes.STRING(30),
            allowNull: false,
            defaultValue: 'WHATSAPP'
        },

        paginaOrigen: {
            type: DataTypes.STRING(120),
            allowNull: true,
            field: 'pagina_origen'
        },

        fuenteClick: {
            type: DataTypes.STRING(80),
            allowNull: true,
            field: 'fuente_click'
        },

        estado: {
            type: DataTypes.STRING(40),
            allowNull: false,
            defaultValue: 'CREADO'
        },

        carritoTotal: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
            field: 'carrito_total'
        },

        telefonoCliente: {
            type: DataTypes.STRING(30),
            allowNull: true,
            field: 'telefono_cliente'
        },

        creadoEn: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'creado_en'
        },

        contactadoEn: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'contactado_en'
        },

        convertidoEn: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'convertido_en'
        }
    },
    {
        tableName: 'whatsapp_leads',
        timestamps: false,
        freezeTableName: true
    }
);

module.exports = WhatsappLead;