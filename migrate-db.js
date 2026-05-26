import { sequelize } from './db.js';
import './models/index.js';

async function migrateDatabase() {
  try {
    console.log('🔄 Authenticating database...');
    await sequelize.authenticate();
    console.log('✅ Database authenticated successfully');

    console.log('🔄 Dropping old tables...');
    // Drop tables in correct order (handle foreign keys)
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.query('DROP TABLE IF EXISTS Users');
    await sequelize.query('DROP TABLE IF EXISTS Tasks');
    await sequelize.query('DROP TABLE IF EXISTS Payments');
    await sequelize.query('DROP TABLE IF EXISTS Messages');
    await sequelize.query('DROP TABLE IF EXISTS Roles');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Old tables dropped');

    console.log('🔄 Creating new tables...');
    await sequelize.sync({ force: true });
    console.log('✅ New tables created from models');

    console.log('✨ Database migration completed successfully!');
    console.log('📝 You can now register new users with the correct schema');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateDatabase();
