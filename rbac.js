import Role from './models/role.js';
import User from './models/user.js';

class RBAC {
    static async hasPermission(userId, requiredPermissions) {
        try {
            const user = await User.findByPk(userId, {
                include: [{
                    model: Role,
                    attributes: ['name', 'permissions']
                }]
            });

            if (!user || !user.Role) {
                return false;
            }

            const userPermissions = user.Role.permissions || [];
            const requiredPerms = Array.isArray(requiredPermissions)
                ? requiredPermissions
                : [requiredPermissions];

            return requiredPerms.every(perm => userPermissions.includes(perm));
        } catch (error) {
            console.error('RBAC permission check error:', error);
            return false;
        }
    }

    static async isAdmin(userId) {
        return this.hasRole(userId, 'Admin');
    }

    static async isWalker(userId) {
        return this.hasRole(userId, 'Walker');
    }

    static async isWalkee(userId) {
        return this.hasRole(userId, 'Walkee');
    }

    static async hasRole(userId, roleName) {
        try {
            const user = await User.findByPk(userId, {
                include: [{
                    model: Role,
                    attributes: ['name']
                }]
            });

            return user && user.Role && user.Role.name === roleName;
        } catch (error) {
            console.error('RBAC role check error:', error);
            return false;
        }
    }

    static getRoleBasedRedirect(role) {
        switch (role) {
            case 'Admin':
                return '/admin/dashboard';
            case 'Walker':
                return '/walker/dashboard';
            case 'Walkee':
                return '/walkee/dashboard';
            default:
                return '/';
        }
    }

    static getDefaultPermissions(roleName) {
        const permissions = {
            Admin: [
                'view_all_users', 'edit_all_users', 'delete_users',
                'manage_roles', 'view_all_tasks', 'manage_payments',
                'view_analytics', 'send_broadcast_messages',
                'manage_system_settings', 'export_data'
            ],
            Walker: [
                'view_assigned_tasks', 'update_task_status',
                'start_walk_session', 'end_walk_session',
                'view_earnings', 'update_location', 'send_messages',
                'view_walk_history', 'update_availability',
                'rate_walkee', 'view_task_details'
            ],
            Walkee: [
                'create_tasks', 'view_my_tasks', 'pay_for_tasks',
                'rate_walker', 'cancel_tasks', 'view_walk_history',
                'send_messages', 'view_walker_profiles',
                'edit_own_profile', 'manage_payment_methods'
            ]
        };

        return permissions[roleName] || [];
    }

    static async getUserRole(userId) {
        try {
            const user = await User.findByPk(userId, {
                include: [{
                    model: Role,
                    attributes: ['name', 'permissions']
                }]
            });

            return user?.Role?.name || null;
        } catch (error) {
            console.error('Error getting user role:', error);
            return null;
        }
    }

    static async getRolePermissions(roleName) {
        try {
            const role = await Role.findOne({
                where: { name: roleName },
                attributes: ['permissions']
            });

            return role?.permissions || [];
        } catch (error) {
            console.error('Error getting role permissions:', error);
            return [];
        }
    }

    static async canPerformAction(userId, action, resource) {
        try {
            const user = await User.findByPk(userId, {
                include: [{
                    model: Role,
                    attributes: ['name', 'permissions']
                }]
            });

            if (!user || !user.Role) return false;

            // Admin can do everything
            if (user.Role.name === 'Admin') return true;

            const userPermissions = user.Role.permissions || [];
            const requiredPermission = `${action}_${resource}`;

            return userPermissions.includes(requiredPermission);
        } catch (error) {
            console.error('RBAC action check error:', error);
            return false;
        }
    }

    static validatePermissionFormat(permission) {
        // Permission format: action_resource
        const pattern = /^[a-z_]+_[a-z_]+$/;
        return pattern.test(permission);
    }
}

export default RBAC;
