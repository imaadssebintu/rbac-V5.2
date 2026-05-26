import { sequelize } from './db.js';
import './models/index.js';
import User from './models/user.js';
import Wallet from './models/wallet.js';

function toNonNegativeInteger(value) {
    const parsed = Number(value || 0);
    if (!Number.isFinite(parsed)) {
        return 0;
    }
    return Math.max(Math.floor(parsed), 0);
}

async function bootstrapWallets() {
    try {
        console.log('🔄 Authenticating database...');
        await sequelize.authenticate();

        console.log('🔄 Finding users without wallets...');
        const [rows] = await sequelize.query(`
            SELECT u.id, u.wallet_balance
            FROM \`User\` u
            LEFT JOIN \`Wallet\` w ON w.user_id = u.id
            WHERE w.id IS NULL
        `);

        if (!rows.length) {
            console.log('✅ All users already have wallets. Nothing to do.');
            process.exit(0);
        }

        const bootstrapFromWalletBalance = String(process.env.BOOTSTRAP_WALLET_FROM_USER_BALANCE || 'true').toLowerCase() !== 'false';

        const now = new Date();
        const walletRows = rows.map((row) => ({
            user_id: row.id,
            coin_balance: bootstrapFromWalletBalance ? toNonNegativeInteger(row.wallet_balance) : 0,
            createdAt: now,
            updatedAt: now
        }));

        console.log(`🔄 Creating ${walletRows.length} wallet record(s)...`);
        await Wallet.bulkCreate(walletRows, { ignoreDuplicates: true });

        console.log('✨ Wallet bootstrap completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Wallet bootstrap failed:', error);
        process.exit(1);
    }
}

bootstrapWallets();
