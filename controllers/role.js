import Role from '../models/role.js';
import RBAC from '../rbac.js';

class RoleController {
    static async getAllRoles(req, res, next) {
        try {
            const roles = await Role.findAll({
                order: [['id', 'ASC']]
            });

            res.json({
                success: true,
                roles
            });
        } catch (error) {
            next(error);
        }
    }

    static async getRoleById(req, res, next) {
        try {
            const { id } = req.params;

            const role = await Role.findByPk(id);
            if (!role) {
                return res.status(404).json({
                    success: false,
                    message: 'Role not found'
                });
            }

            res.json({
                success: true,
                role
            });
        } catch (error) {
            next(error);
        }
    }

    static async createRole(req, res, next) {
        try {
            const { name, description, permissions = [] } = req.body;

            // Check if role exists
            const existingRole = await Role.findOne({ where: { name } });
            if (existingRole) {
                return res.status(400).json({
                    success: false,
                    message: 'Role with this name already exists'
                });
            }

            const role = await Role.create({
                name,
                description,
                permissions
            });

            res.status(201).json({
                success: true,
                message: 'Role created successfully',
                role
            });
        } catch (error) {
            next(error);
        }
    }

    static async updateRole(req, res, next) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const role = await Role.findByPk(id);
            if (!role) {
                return res.status(404).json({
                    success: false,
                    message: 'Role not found'
                });
            }

            // Don't allow changing default roles' names
            if (updates.name && role.is_default) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot rename default roles'
                });
            }

            await role.update(updates);

            res.json({
                success: true,
                message: 'Role updated successfully',
                role
            });
        } catch (error) {
            next(error);
        }
    }

    static async deleteRole(req, res, next) {
        try {
            const { id } = req.params;

            const role = await Role.findByPk(id);
            if (!role) {
                return res.status(404).json({
                    success: false,
                    message: 'Role not found'
                });
            }

            // Don't allow deleting default roles
            if (role.is_default) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete default roles'
                });
            }

            // Check if any users have this role
            const User = await import('../models/user.js').then(m => m.default);
            const usersWithRole = await User.count({ where: { role_id: id } });

            if (usersWithRole > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot delete role. ${usersWithRole} user(s) have this role.`
                });
            }

            await role.destroy();

            res.json({
                success: true,
                message: 'Role deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    static async updateRolePermissions(req, res, next) {
        try {
            const { id } = req.params;
            const { permissions } = req.body;

            const role = await Role.findByPk(id);
            if (!role) {
                return res.status(404).json({
                    success: false,
                    message: 'Role not found'
                });
            }

            await role.update({ permissions });

            res.json({
                success: true,
                message: 'Role permissions updated successfully',
                role
            });
        } catch (error) {
            next(error);
        }
    }
}

export default RoleController;
