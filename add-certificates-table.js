import sequelize from './db.js';
import { QueryTypes } from 'sequelize';

async function addCertificatesTable() {
  try {
    // Check if table already exists
    const tables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'certificates'",
      { type: QueryTypes.SELECT }
    );

    if (tables.length > 0) {
      console.log('Certificates table already exists.');
      return;
    }

    // Create certificates table
    await sequelize.query(`
      CREATE TABLE certificates (
        id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin PRIMARY KEY,
        user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending' NOT NULL,
        verified_at DATETIME NULL,
        verified_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
        rejection_reason TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
        FOREIGN KEY (verified_by) REFERENCES user(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    console.log('Certificates table created successfully.');
  } catch (error) {
    console.error('Error creating certificates table:', error);
    throw error;
  }
}

// Run migration
addCertificatesTable()
  .then(() => {
    console.log('Migration completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });