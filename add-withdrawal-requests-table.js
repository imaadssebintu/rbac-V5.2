import mysql2 from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function createWithdrawalRequestsTable() {
  const connection = await mysql2.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rbac_db'
  });

  try {
    console.log('Creating withdrawal_requests table...');

    const sql = `
      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        guide_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'UGX',
        status ENUM('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
        bank_name VARCHAR(100) NOT NULL,
        account_number VARCHAR(50) NOT NULL,
        account_name VARCHAR(200) DEFAULT NULL,
        payment_method ENUM('bank_transfer','mobile_money') NOT NULL DEFAULT 'bank_transfer',
        flutterwave_transfer_id VARCHAR(100) DEFAULT NULL,
        flutterwave_status VARCHAR(50) DEFAULT NULL,
        reason TEXT DEFAULT NULL,
        admin_notes TEXT DEFAULT NULL,
        processed_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
        processed_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        PRIMARY KEY (id),
        KEY idx_guide_id (guide_id),
        KEY idx_status (status),
        KEY idx_flutterwave_transfer_id (flutterwave_transfer_id),
        CONSTRAINT withdrawal_requests_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES user (id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT withdrawal_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES user (id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `;

    await connection.execute(sql);
    console.log('withdrawal_requests table created successfully.');

    console.log('Withdrawal requests table setup complete!');
  } catch (error) {
    console.error('Error creating withdrawal_requests table:', error);
  } finally {
    await connection.end();
  }
}

createWithdrawalRequestsTable();