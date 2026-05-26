import { sequelize } from './db.js';

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
    const tableName = 'payment';

    const hasBookingStatus = await columnExists(schemaName, tableName, 'booking_status');
    if (hasBookingStatus) {
        console.log('booking_status already exists on payment');
        return;
    }

    await sequelize.query(
        "ALTER TABLE `payment` ADD COLUMN `booking_status` VARCHAR(30) NULL DEFAULT NULL AFTER `metadata`"
    );

    console.log('Added booking_status column to payment');
}

main()
    .catch((error) => {
        console.error(error.message || error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await sequelize.close();
    });
