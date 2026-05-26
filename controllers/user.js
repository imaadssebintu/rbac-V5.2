import User from '../models/user.js';
import Role from '../models/role.js';
import { Op } from 'sequelize';

class UserController {
    static async getAllUsers(req, res, next) {
        try {
            const { page = 1, limit = 20, role, is_active } = req.query;
            const offset = (page - 1) * limit;

            const where = {};
            if (role) {
                const roleRecord = await Role.findOne({ where: { name: role } });
                if (roleRecord) {
                    where.role_id = roleRecord.id;
                }
            }

            if (is_active !== undefined) {
                where.is_active = is_active === 'true';
            }

            const users = await User.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                include: [{
                    model: Role,
                    as: 'Role',
                    attributes: ['name', 'description']
                }],
                attributes: { exclude: ['password'] }
            });

            res.json({
                success: true,
                users: users.rows,
                pagination: {
                    total: users.count,
                    page: parseInt(page),
                    pages: Math.ceil(users.count / limit),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static async getUserById(req, res, next) {
        try {
            const { id } = req.params;

            const user = await User.findByPk(id, {
                include: [{
                    model: Role,
                    as: 'Role',
                    attributes: ['name', 'description', 'permissions']
                }],
                attributes: { exclude: ['password'] }
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                user
            });
        } catch (error) {
            next(error);
        }
    }

    static async createUser(req, res, next) {
        try {
            const { name, email, phone, password, role_name, wallet_balance = 0 } = req.body;

            // Check if user exists
            const existingUser = await User.findOne({
                where: {
                    [Op.or]: [{ email }, { phone }]
                }
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User with this email or phone already exists'
                });
            }

            // Get role
            const role = await Role.findOne({ where: { name: role_name } });
            if (!role) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role specified'
                });
            }

            const user = await User.create({
                name,
                email,
                phone,
                password,
                role_id: role.id,
                wallet_balance,
                is_verified: true
            });

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                user: user.getSafeData()
            });
        } catch (error) {
            next(error);
        }
    }

    static async updateUser(req, res, next) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Don't allow password update here (use separate endpoint)
            delete updates.password;

            // If changing role
            if (updates.role_name) {
                const role = await Role.findOne({ where: { name: updates.role_name } });
                if (role) {
                    updates.role_id = role.id;
                }
                delete updates.role_name;
            }

            await user.update(updates);

            res.json({
                success: true,
                message: 'User updated successfully',
                user: user.getSafeData()
            });
        } catch (error) {
            next(error);
        }
    }

    static async deleteUser(req, res, next) {
        try {
            const { id } = req.params;

            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Soft delete (deactivate) instead of hard delete
            await user.update({ is_active: false });

            res.json({
                success: true,
                message: 'User deactivated successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    static async changeUserRole(req, res, next) {
        try {
            const { id } = req.params;
            const { role_name } = req.body;

            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const role = await Role.findOne({ where: { name: role_name } });
            if (!role) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role specified'
                });
            }

            await user.update({ role_id: role.id });

            res.json({
                success: true,
                message: `User role changed to ${role_name}`,
                user: user.getSafeData()
            });
        } catch (error) {
            next(error);
        }
    }

    static async toggleUserStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { is_active } = req.body;

            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            await user.update({ is_active });

            res.json({
                success: true,
                message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
                user: user.getSafeData()
            });
        } catch (error) {
            next(error);
        }
    }

    static async getMyProfile(req, res, next) {
        try {
            const user = req.user;

            res.json({
                success: true,
                user: user.getSafeData()
            });
        } catch (error) {
            next(error);
        }
    }

    static async updateMyProfile(req, res, next) {
        try {
            const user = req.user;
            const updates = req.body;

            // Don't allow password or role updates here
            delete updates.password;
            delete updates.role_id;
            delete updates.wallet_balance;
            delete updates.is_verified; // Prevent self-verification

            await user.update(updates);

            res.json({
                success: true,
                message: 'Profile updated successfully',
                user: user.getSafeData()
            });
        } catch (error) {
            next(error);
        }
    }
}

export default UserController;
