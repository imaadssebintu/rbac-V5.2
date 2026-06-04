import { sequelize } from '../db.js';
import User from '../models/user.js';
import Role from '../models/role.js';

async function createAdmin() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Find the admin role
        const adminRole = await Role.findOne({ where: { name: 'admin' } });
        if (!adminRole) {
            console.error('Admin role not found! Run seed first.');
            process.exit(1);
        }

        // Check if user already exists
        const existing = await User.findOne({ where: { email: 'imaad.ssebintu@gmail.com' } });
        if (existing) {
            console.log('User already exists with this email. Updating password...');
            await existing.update({ password: 'Ertdfgx@0', role_id: adminRole.id, is_verified: true, is_active: true });
            console.log('Admin user updated successfully!');
        } else {
            await User.create({
                name: 'Imaad Ssebintu',
                email: 'imaad.ssebintu@gmail.com',
                phone: '+256700000001',
                password: 'Ertdfgx@0',
                role_id: adminRole.id,
                is_verified: true,
                is_active: true,
                wallet_balance: 1000.00
            });
            console.log('Admin user created successfully!');
        }

        console.log('Email: imaad.ssebintu@gmail.com');
        console.log('Password: Ertdfgx@0');
        console.log('Role: admin');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

createAdmin();
