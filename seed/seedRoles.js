import { sequelize } from '../db.js';
import Role from '../models/role.js';
import RBAC from '../rbac.js';
import User from '../models/user.js';
import bcrypt from 'bcryptjs';

async function seedRoles() {
    try {
        await sequelize.sync({ force: false });

        console.log('Starting role seeding...');

        const defaultRoles = [
            {
                name: 'admin',
                description: 'System administrator with full access',
                permissions: RBAC.getDefaultPermissions('admin'),
                is_default: false
            },
            {
                name: 'guide',
                description: 'Service provider who guides travelers',
                permissions: RBAC.getDefaultPermissions('guide'),
                is_default: false
            },
            {
                name: 'traveler',
                description: 'Customer who needs guiding service',
                permissions: RBAC.getDefaultPermissions('traveler'),
                is_default: true
            }
        ];

        for (const roleData of defaultRoles) {
            // Find existing role by normalized name to avoid duplicates
            const allRoles = await Role.findAll();
            const existingRole = allRoles.find(r => RBAC.normalizeRoleName(r.name) === roleData.name);

            if (existingRole) {
                const oldName = existingRole.name;
                await existingRole.update({
                    name: roleData.name,
                    permissions: roleData.permissions
                });
                if (oldName !== roleData.name) {
                    console.log(`Renamed role: ${oldName} → ${roleData.name}`);
                } else {
                    console.log(`Updated role: ${oldName}`);
                }
            } else {
                await Role.create(roleData);
                console.log(`Created role: ${roleData.name}`);
            }
        }

        console.log('Role seeding completed successfully!');

        // Create a default admin user if not exists
        const adminRole = await Role.findOne({ where: { name: 'admin' } });

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

        console.log('Role seeding completed successfully!');
    } catch (error) {
        console.error('Error seeding roles:', error);
    }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    seedRoles();
}

export default seedRoles;
