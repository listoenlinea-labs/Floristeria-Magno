const { Sequelize } = require('sequelize');

const requiredVariables = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD'
];

for (const variable of requiredVariables) {
    if (!process.env[variable]) {
        throw new Error(
            `Falta la variable de entorno requerida: ${variable}`
        );
    }
}

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        dialect: 'mysql',

        logging:
            process.env.NODE_ENV === 'development'
                ? console.log
                : false,

        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        },

        dialectOptions:
            process.env.DB_SSL === 'true'
                ? {
                    ssl: {
                        require: true,
                        rejectUnauthorized: false
                    }
                }
                : {}
    }
);

module.exports = sequelize;