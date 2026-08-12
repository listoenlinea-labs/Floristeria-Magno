const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '../../.env')
});

const sequelize = require('../config/database');

const TABLES = [
    'clientes',
    'productos',
    'producto_imagenes',
    'pedidos',
    'detalle_pedido'
];

async function inspectSchema() {
    try {
        await sequelize.authenticate();

        console.log('\n✅ Conexión establecida.\n');

        for (const tableName of TABLES) {
            console.log(
                '\n=================================================='
            );
            console.log(`TABLA: ${tableName}`);
            console.log(
                '==================================================\n'
            );

            const [columns] = await sequelize.query(
                `SHOW FULL COLUMNS FROM \`${tableName}\``
            );

            console.table(
                columns.map(column => ({
                    Field: column.Field,
                    Type: column.Type,
                    Null: column.Null,
                    Key: column.Key,
                    Default: column.Default,
                    Extra: column.Extra
                }))
            );

            const [createTableResult] = await sequelize.query(
                `SHOW CREATE TABLE \`${tableName}\``
            );

            const createStatement =
                createTableResult[0]['Create Table'];

            console.log('\nSHOW CREATE TABLE:\n');
            console.log(createStatement);
            console.log('\n');
        }

        const [foreignKeys] = await sequelize.query(`
            SELECT
                TABLE_NAME AS tableName,
                COLUMN_NAME AS columnName,
                CONSTRAINT_NAME AS constraintName,
                REFERENCED_TABLE_NAME AS referencedTable,
                REFERENCED_COLUMN_NAME AS referencedColumn
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND REFERENCED_TABLE_NAME IS NOT NULL
            ORDER BY TABLE_NAME, COLUMN_NAME
        `);

        console.log(
            '\n=================================================='
        );
        console.log('RELACIONES / LLAVES FORÁNEAS');
        console.log(
            '==================================================\n'
        );

        console.table(foreignKeys);
    } catch (error) {
        console.error('\n❌ Error inspeccionando el esquema.');
        console.error('Tipo:', error.name);
        console.error('Mensaje:', error.message);

        if (error.original?.code) {
            console.error(
                'Código MySQL:',
                error.original.code
            );
        }

        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

inspectSchema();