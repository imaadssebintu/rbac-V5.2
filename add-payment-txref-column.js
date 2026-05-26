import { sequelize } from './db.js';

async function resolvePaymentTable(schemaName) {
    const [rows] = await sequelize.query(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = :schema
           AND table_name IN ('Payment', 'Payments', 'payment', 'payments')
         ORDER BY FIELD(table_name, 'Payment', 'Payments', 'payment', 'payments')
         LIMIT 1`,
        { replacements: { schema: schemaName } }
    );

    return rows?.[0]?.table_name || null;
}

async function columnExists(schemaName, tableName, columnName) {
    const [rows] = await sequelize.query(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_schema = :schema
           AND table_name = :table
           AND column_name = :column
         LIMIT 1`,
        { replacements: { schema: schemaName, table: tableName, column: columnName } }
    );

    return rows.length > 0;
}

async function main() {
    const schemaName = process.env.DB_NAME || 'rbac_db';
    const tableName = await resolvePaymentTable(schemaName);

    if (!tableName) {
        throw new Error('Payment table not found (expected one of Payment/Payments/payment/payments).');
    }

    const hasTxRef = await columnExists(schemaName, tableName, 'tx_ref');
    if (hasTxRef) {
        console.log(`tx_ref already exists on ${tableName}`);
        return;
    }

    await sequelize.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`tx_ref\` VARCHAR(120) NULL AFTER \`transaction_id\``);
    console.log(`Added tx_ref column to ${tableName}`);
}

main()
    .catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await sequelize.close();
    });
