import { sequelize } from './db.js';

async function getCurrentDatabase() {
    const [rows] = await sequelize.query('SELECT DATABASE() AS db');
    return rows?.[0]?.db;
}

async function tableExists(schemaName, tableName) {
    const [rows] = await sequelize.query(
        `SELECT 1
         FROM information_schema.tables
         WHERE table_schema = :schemaName AND table_name = :tableName
         LIMIT 1`,
        {
            replacements: { schemaName, tableName }
        }
    );

    return rows.length > 0;
}

async function resolveTableName(schemaName, candidates) {
    for (const candidate of candidates) {
        if (await tableExists(schemaName, candidate)) {
            return candidate;
        }
    }
    return null;
}

async function getTableColumns(schemaName, tableName) {
    const [rows] = await sequelize.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = :schemaName AND table_name = :tableName`,
        {
            replacements: { schemaName, tableName }
        }
    );

    return new Set(rows.map((row) => row.column_name));
}

function pickExistingColumn(columns, candidates) {
    for (const candidate of candidates) {
        if (columns.has(candidate)) {
            return candidate;
        }
    }
    return null;
}

async function indexExists(schemaName, tableName, indexName) {
    const [rows] = await sequelize.query(
        `SELECT 1
         FROM information_schema.statistics
         WHERE table_schema = :schemaName
           AND table_name = :tableName
           AND index_name = :indexName
         LIMIT 1`,
        {
            replacements: { schemaName, tableName, indexName }
        }
    );

    return rows.length > 0;
}

async function ensureIndex(schemaName, tableName, indexName, columns) {
    if (await indexExists(schemaName, tableName, indexName)) {
        console.log(`ℹ️  Index already exists: ${tableName}.${indexName}`);
        return;
    }

    const quotedColumns = columns.map((column) => `\`${column}\``).join(', ');
    await sequelize.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`${indexName}\` (${quotedColumns})`);
    console.log(`✅ Created index: ${tableName}.${indexName}`);
}

async function addPaymentCheckoutIndexes(schemaName, tableName) {
    const columns = await getTableColumns(schemaName, tableName);

    const userColumn = pickExistingColumn(columns, ['user_id', 'userId']);
    const tripColumn = pickExistingColumn(columns, ['task_id', 'trip_id', 'tripId', 'taskId']);
    const statusColumn = pickExistingColumn(columns, ['status']);
    const amountColumn = pickExistingColumn(columns, ['amount', 'final_payable_amount', 'finalPayableAmount']);
    const createdColumn = pickExistingColumn(columns, ['created_at', 'createdAt']);

    if (!userColumn || !tripColumn || !statusColumn || !amountColumn || !createdColumn) {
        console.warn(
            `⚠️  Skipped ${tableName}: required checkout lookup columns are missing ` +
            `(user=${userColumn || 'x'}, trip=${tripColumn || 'x'}, status=${statusColumn || 'x'}, amount=${amountColumn || 'x'}, created=${createdColumn || 'x'})`
        );
        return;
    }

    await ensureIndex(
        schemaName,
        tableName,
        'idx_checkout_pending_lookup',
        [userColumn, tripColumn, statusColumn, amountColumn, createdColumn]
    );

    await ensureIndex(
        schemaName,
        tableName,
        'idx_checkout_user_status_created',
        [userColumn, statusColumn, createdColumn]
    );
}

async function run() {
    try {
        await sequelize.authenticate();
        const schemaName = await getCurrentDatabase();

        if (!schemaName) {
            throw new Error('No database selected for current connection');
        }

        console.log(`🔄 Applying checkout indexes in database: ${schemaName}`);

        const paymentLikeTable = await resolveTableName(schemaName, [
            'Payment',
            'Payments',
            'payment',
            'payments',
            'Transaction',
            'Transactions',
            'transaction',
            'transactions'
        ]);

        if (!paymentLikeTable) {
            console.warn('⚠️  No Payment/Transaction table found. Nothing to index.');
            process.exit(0);
        }

        await addPaymentCheckoutIndexes(schemaName, paymentLikeTable);

        console.log('✨ Checkout index migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Checkout index migration failed:', error);
        process.exit(1);
    }
}

run();
