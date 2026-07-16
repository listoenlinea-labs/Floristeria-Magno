const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const sequelize = require('./config/database');
const authRoutes = require('./routes/auth.routes');
const productosRoutes = require('./routes/productos.routes');

const app = express();

app.disable('x-powered-by');

app.use(
    helmet({
        crossOriginResourcePolicy: {
            policy: 'cross-origin'
        }
    })
);

const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_WWW,
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://vlad04.github.io'
].filter(Boolean);

app.use(
    cors({
        origin(origin, callback) {
            /*
             * Permite herramientas como Postman y solicitudes
             * sin encabezado Origin.
             */
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            const corsError = new Error(
                `Origen no permitido por CORS: ${origin}`
            );

            corsError.status = 403;

            return callback(corsError);
        },
        methods: [
            'GET',
            'POST',
            'PUT',
            'PATCH',
            'DELETE',
            'OPTIONS'
        ],
        allowedHeaders: [
            'Content-Type',
            'Authorization'
        ],
        credentials: false
    })
);

app.use(express.json({ limit: '1mb' }));

app.use(
    express.urlencoded({
        extended: true,
        limit: '1mb'
    })
);

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        ok: false,
        message: 'Demasiadas solicitudes. Intenta nuevamente más tarde.'
    }
});

app.use('/api', apiLimiter);

/*
 * Prueba básica de que Express está encendido.
 */
app.get('/api/health', (req, res) => {
    res.status(200).json({
        ok: true,
        service: 'Floristería Juan H Magno API',
        environment: process.env.NODE_ENV
    });
});

app.get('/', (req, res) => {
    res.status(200).json({
        ok: true,
        service: 'Floristería Juan H Magno API',
        documentation: '/api/health'
    });
});

/*
 * Prueba real de que Express puede consultar MySQL.
 */
app.get('/api/health/database', async (req, res, next) => {
    try {
        const [result] = await sequelize.query(`
            SELECT
                DATABASE() AS databaseName,
                NOW() AS serverTime
        `);

        res.status(200).json({
            ok: true,
            database: result[0].databaseName,
            serverTime: result[0].serverTime
        });
    } catch (error) {
        next(error);
    }
});

/*
 * Rutas de autenticación.
 */
app.use('/api/auth', authRoutes);
/*
 * Rutas funcionales.
 */
app.use(
    '/api/floristeria-magno/productos',
    productosRoutes
);


/*
 * 404 siempre después de las rutas.
 */
app.use((req, res) => {
    res.status(404).json({
        ok: false,
        message: 'Ruta no encontrada'
    });
});

/*
 * Manejador central de errores.
 */
app.use((error, req, res, next) => {
    console.error('Error API:', error);

    res.status(error.status || 500).json({
        ok: false,
        message:
            process.env.NODE_ENV === 'production'
                ? 'Ocurrió un error en el servidor'
                : error.message
    });
});

module.exports = app;