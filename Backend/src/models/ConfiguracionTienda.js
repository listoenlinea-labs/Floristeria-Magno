const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Tabla independiente: no requiere modificar las columnas existentes de configuracion.
const ConfiguracionTienda = sequelize.define('ConfiguracionTienda', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    opcionesJson: { type: DataTypes.TEXT('long'), allowNull: false, field: 'opciones_json' }
}, {
    tableName: 'configuracion_tienda',
    timestamps: false,
    freezeTableName: true
});

module.exports = ConfiguracionTienda;
