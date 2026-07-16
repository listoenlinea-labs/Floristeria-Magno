const path = require('path');

/*
 * Hostinger proporciona NODE_ENV y las demás variables directamente.
 *
 * En local, si NODE_ENV no está definido, usamos development
 * y cargamos Backend/.env.development.
 */
const environment = process.env.NODE_ENV || 'development';

if (environment !== 'production') {
    const result = require('dotenv').config({
        path: path.resolve(
            __dirname,
            `../.env.${environment}`
        )
    });

    if (result.error) {
        console.error(
            `❌ No se pudo cargar .env.${environment}:`,
            result.error.message
        );

        process.exit(1);
    }
}

const app = require('./app');
const sequelize = require('./config/database');

const PORT = Number(process.env.PORT || 3000);

let server;

async function startServer() {
    try {
        await sequelize.authenticate();

        console.log('✅ Conexión con MySQL establecida correctamente.');
        console.log(`✅ Base configurada: ${process.env.DB_NAME}`);

        server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`✅ API ejecutándose en el puerto ${PORT}`);
            console.log(
                `✅ Entorno: ${process.env.NODE_ENV || environment}`
            );
        });
    } catch (error) {
        console.error('❌ No fue posible iniciar la API.');
        console.error('Tipo:', error.name);
        console.error('Mensaje:', error.message);

        if (error.original?.code) {
            console.error('Código MySQL:', error.original.code);
        }

        process.exit(1);
    }
}

async function shutdown(signal) {
    console.log(`\n${signal} recibido. Cerrando servidor...`);

    try {
        if (server) {
            await new Promise((resolve, reject) => {
                server.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                });
            });
        }

        await sequelize.close();

        console.log(
            '✅ Servidor y conexión MySQL cerrados correctamente.'
        );

        process.exit(0);
    } catch (error) {
        console.error(
            '❌ Error cerrando el servidor:',
            error.message
        );

        process.exit(1);
    }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (error) => {
    console.error(
        '❌ Promesa rechazada no controlada:',
        error
    );
});

process.on('uncaughtException', (error) => {
    console.error(
        '❌ Excepción no controlada:',
        error
    );

    process.exit(1);
});

startServer();