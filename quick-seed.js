import { sequelize } from './db.js';
import Role from './models/role.js';
import './models/index.js';

async function seedRoles() {
  try {
    console.log('🔍 Checking if roles exist...');
    
    const roles = [
      { name: 'Admin', description: 'Administrator' },
      { name: 'Walker', description: 'Service provider' },
      { name: 'Walkee', description: 'Customer' }
    ];

    for (const roleData of roles) {
      const exists = await Role.findOne({ where: { name: roleData.name } });
      if (!exists) {
        await Role.create({
          ...roleData,
          permissions: JSON.stringify({}),
          is_default: roleData.name === 'Walkee'
        });
        console.log(`✅ Created role: ${roleData.name}`);
      } else {
        console.log(`ℹ️  Role already exists: ${roleData.name}`);
      }
    }
    
    console.log('✨ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedRoles();
