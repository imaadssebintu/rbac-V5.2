import { sequelize } from '../db.js';
import Role from '../models/role.js';
import RBAC from '../middleware/rcbac.js';
import User from '../models/user.js';
import bcrypt from 'bcryptjs';

async function seedRoles() {
    try {
        await sequelize.sync({ force: false });

        console.log('Starting role seeding...');

        const defaultRoles = [
            {
                name: 'Admin',
                description: 'System administrator with full access',
                permissions: RBAC.getDefaultPermissions('Admin'),
                is_default: false
            },
            {
                name: 'Walker',
                description: 'Service provider who walks people',
                permissions: RBAC.getDefaultPermissions('Walker'),
                is_default: false
            },
            {
                name: 'Walkee',
                description: 'Customer who needs walking service',
                permissions: RBAC.getDefaultPermissions('Walkee'),
                is_default: true
            }
        ];

        for (const roleData of defaultRoles) {
            const [role, created] = await Role.findOrCreate({
                where: { name: roleData.name },
                defaults: roleData
            });

            if (created) {
                console.log(`Created role: ${role.name}`);
            } else {
                // Update permissions if role exists
                await role.update({ permissions: roleData.permissions });
                console.log(`Updated role: ${role.name}`);
            }
        }

        console.log('Role seeding completed successfully!');

        // Create a default admin user if not exists
        const adminRole = await Role.findOne({ where: { name: 'Admin' } });

        const existingAdmin = await User.findOne({ where: { email: 'admin@walkerapp.com' } });
        if (!existingAdmin && adminRole) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Admin123!', salt);

            await User.create({
                name: 'System Administrator',
                email: 'admin@walkerapp.com',
                phone: '+1234567890',
                password: hashedPassword,
                role_id: adminRole.id,
                is_verified: true,
                wallet_balance: 1000.00
            });
            console.log('Default admin user created (email: admin@walkerapp.com, password: Admin123!)');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error seeding roles:', error);
        process.exit(1);
    }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    seedRoles();
}

export default seedRoles;
