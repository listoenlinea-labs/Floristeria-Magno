const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

/*
 * Hostinger proporciona NODE_ENV y las variables
 * directamente en producción.
 */
const environment =
    process.env.NODE_ENV || 'development';

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

/*
 * La zona horaria debe establecerse antes de importar
 * la aplicación, Sequelize y los modelos.
 */
process.env.TZ =
    process.env.APP_TIME_ZONE ||
    'America/Mexico_City';

const {
    initializeImageStorage
} = require(
    './services/image-storage.service'
);

const app = require('./app');
const sequelize = require('./config/database');

const PORT = Number(
    process.env.PORT || 3000
);

const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_WWW,
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://vlad04.github.io',
    'https://listoenlinea-labs.github.io'
].filter(Boolean);

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin(origin, callback) {
            /*
             * Permite conexiones sin Origin desde
             * herramientas internas.
             */
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(
                new Error(
                    `Origen no permitido en Socket.IO: ${origin}`
                )
            );
        },

        methods: [
            'GET',
            'POST'
        ],

        credentials: false
    },

    /*
     * Mantiene compatibilidad con proveedores que
     * administran WebSocket detrás de un proxy.
     */
    transports: [
        'websocket',
        'polling'
    ]
});

io.on('connection', (socket) => {
    socket.on(
        'rastreo:unirse',
        ({ codigoRastreo } = {}) => {
            const codigo = String(
                codigoRastreo || ''
            )
                .trim()
                .toUpperCase();

            if (!/^JHM-[A-Z0-9-]+$/.test(codigo)) {
                return;
            }

            socket.join(
                `pedido:${codigo}`
            );
        }
    );

    socket.on(
        'rastreo:salir',
        ({ codigoRastreo } = {}) => {
            const codigo = String(
                codigoRastreo || ''
            )
                .trim()
                .toUpperCase();

            if (!codigo) {
                return;
            }

            socket.leave(
                `pedido:${codigo}`
            );
        }
    );
});

/*
 * Permite que los controladores recuperen Socket.IO
 * mediante req.app.get('io').
 */
app.set('io', io);

async function startServer() {
    try {
        /*
         * Las carpetas persistentes y su respaldo deben estar
         * disponibles antes de aceptar tráfico o subir imágenes.
         */
        await initializeImageStorage();

        await sequelize.authenticate();

        console.log(
            '✅ Conexión con MySQL establecida correctamente.'
        );

        console.log(
            `✅ Base configurada: ${process.env.DB_NAME}`
        );

        server.listen(PORT, () => {
            console.log(
                `✅ Servidor ejecutándose en puerto ${PORT}`
            );
        });
    } catch (error) {
        console.error(
            '❌ No fue posible iniciar la API.'
        );

        console.error(
            'Tipo:',
            error.name
        );

        console.error(
            'Mensaje:',
            error.message
        );

        if (error.original?.code) {
            console.error(
                'Código MySQL:',
                error.original.code
            );
        }

        process.exit(1);
    }
}

async function shutdown(signal) {
    console.log(
        `\n${signal} recibido. Cerrando servidor...`
    );

    try {
        io.close();

        await new Promise(
            (resolve, reject) => {
                server.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                });
            }
        );

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

process.on(
    'SIGINT',
    () => shutdown('SIGINT')
);

process.on(
    'SIGTERM',
    () => shutdown('SIGTERM')
);

process.on(
    'unhandledRejection',
    (error) => {
        console.error(
            '❌ Promesa rechazada no controlada:',
            error
        );
    }
);

process.on(
    'uncaughtException',
    (error) => {
        console.error(
            '❌ Excepción no controlada:',
            error
        );

        process.exit(1);
    }
);

startServer();