import { sequelize } from './db.js';
import './models/index.js'; // Ensure models are loaded

(async () => {
    try {
        console.log('Syncing database schema...');
        await sequelize.sync({ alter: true });
        console.log('Database schema updated successfully!');
        process.exit(0);
    } catch (error) {
        const isKeyLimitError = String(error?.original?.code || '') === 'ER_TOO_MANY_KEYS'
            || /Too many keys specified/i.test(String(error?.message || ''));

        if (isKeyLimitError) {
            console.warn('Alter sync hit MySQL key limit. Retrying with safe sync mode (no alter)...');
            try {
                await sequelize.sync();
                console.log('Database schema is available (safe sync completed).');
                process.exit(0);
            } catch (fallbackError) {
                console.error('Safe sync retry failed:', fallbackError);
                process.exit(1);
            }
        }

        console.error('Error syncing database:', error);
        process.exit(1);
    }
})();