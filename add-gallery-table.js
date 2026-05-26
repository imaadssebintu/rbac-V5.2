import mysql2 from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function createGalleryTable() {
  const connection = await mysql2.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rbac_db'
  });

  try {
    console.log('Creating gallery table...');

    const sql = `
      CREATE TABLE IF NOT EXISTS gallery (
        id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        image_url TEXT NOT NULL,
        location_tag VARCHAR(100) NOT NULL,
        description TEXT DEFAULT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        PRIMARY KEY (id),
        KEY idx_location_tag (location_tag),
        KEY idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `;

    await connection.execute(sql);
    console.log('Gallery table created successfully.');

    // Seed some initial data
    console.log('Seeding initial gallery data...');
    
    const seedData = [
      // Global/default images
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        image_url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
        location_tag: 'Global',
        description: 'Beautiful travel destination',
        is_active: 1
      },
      {
        id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
        image_url: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=80',
        location_tag: 'Global',
        description: 'Mountain adventure scene',
        is_active: 1
      },
      {
        id: 'c3d4e5f6-a7b8-9012-cdef-345678901234',
        image_url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
        location_tag: 'Global',
        description: 'Sunset travel moment',
        is_active: 1
      },
      {
        id: 'd4e5f6a7-b8c9-0123-defa-456789012345',
        image_url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
        location_tag: 'Global',
        description: 'City exploration',
        is_active: 1
      },
      // Location-specific images (examples)
      {
        id: 'e5f6a7b8-c9d0-1234-efab-567890123456',
        image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1400&q=80',
        location_tag: 'Nairobi',
        description: 'Nairobi cityscape',
        is_active: 1
      },
      {
        id: 'f6a7b8c9-d0e1-2345-fabc-678901234567',
        image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80',
        location_tag: 'Kigali',
        description: 'Kigali streets',
        is_active: 1
      },
      {
        id: 'a7b8c9d0-e1f2-3456-abcd-789012345678',
        image_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1200&q=80',
        location_tag: 'Entebbe',
        description: 'Entebbe waterfront',
        is_active: 1
      },
      {
        id: 'b8c9d0e1-f2a3-4567-bcde-890123456789',
        image_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1400&q=80',
        location_tag: 'New York',
        description: 'New York city lights',
        is_active: 1
      },
      {
        id: 'c9d0e1f2-a3b4-5678-cdef-901234567890',
        image_url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1400&q=80',
        location_tag: 'Canada',
        description: 'Canadian wilderness',
        is_active: 1
      },
      {
        id: 'd0e1f2a3-b4c5-6789-defa-012345678901',
        image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1400&q=80',
        location_tag: 'America',
        description: 'American landscape',
        is_active: 1
      }
    ];

    for (const item of seedData) {
      const checkSql = 'SELECT id FROM gallery WHERE id = ?';
      const [existing] = await connection.execute(checkSql, [item.id]);
      
      if (existing.length === 0) {
        const insertSql = `
          INSERT INTO gallery (id, image_url, location_tag, description, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        `;
        await connection.execute(insertSql, [
          item.id,
          item.image_url,
          item.location_tag,
          item.description,
          item.is_active
        ]);
        console.log(`Seeded: ${item.location_tag} - ${item.description}`);
      }
    }

    console.log('Gallery table setup complete!');
  } catch (error) {
    console.error('Error creating gallery table:', error);
  } finally {
    await connection.end();
  }
}

createGalleryTable();