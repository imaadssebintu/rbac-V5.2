import { sequelize } from './db.js';
import './models/index.js';

async function fixCertificationsColumn() {
  try {
    await sequelize.authenticate();

    const dialect = sequelize.getDialect();
    if (dialect !== 'mysql') {
      console.log(`Skipping fix: unsupported dialect ${dialect}.`);
      process.exit(0);
    }

    console.log('Updating User.certifications column...');
    await sequelize.query("ALTER TABLE `User` MODIFY `certifications` TEXT NOT NULL DEFAULT '[]'");

    console.log('Normalizing User.certifications data...');
    await sequelize.query(
      "UPDATE `User` SET `certifications` = '[]' WHERE `certifications` IS NULL OR `certifications` = '' OR JSON_VALID(`certifications`) = 0"
    );

    console.log('Certifications column fix complete.');
    process.exit(0);
  } catch (error) {
    console.error('Certifications fix failed:', error);
    process.exit(1);
  }
}

fixCertificationsColumn();
