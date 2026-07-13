const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '../.env')
});

console.log(process.env.DB_HOST);
console.log(process.env.DB_NAME);
console.log(process.env.DB_USER);

const sequelize = require('./config/database');

async function testDatabaseConnection() {
    try {
        await sequelize.authenticate();

        console.log('✅ Conexión con MySQL establecida correctamente.');
        console.log(`✅ Base configurada: ${process.env.DB_NAME}`);

        const [result] = await sequelize.query(
            'SELECT DATABASE() AS databaseName, NOW() AS serverTime'
        );

        console.log('✅ Base activa:', result[0].databaseName);
        console.log('✅ Hora del servidor:', result[0].serverTime);
    } catch (error) {
        console.error('❌ No fue posible conectar con MySQL.');
        console.error('Tipo:', error.name);
        console.error('Mensaje:', error.message);

        if (error.original?.code) {
            console.error('Código MySQL:', error.original.code);
        }

        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

testDatabaseConnection();