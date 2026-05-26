import Role from '../models/role.js';
import User from '../models/user.js';

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
                'view_analytics', 'send_broadcast_messages'
            ],
            Walker: [
                'view_assigned_tasks', 'update_task_status',
                'start_walk_session', 'end_walk_session',
                'view_earnings', 'update_location', 'send_messages'
            ],
            Walkee: [
                'create_tasks', 'view_my_tasks', 'pay_for_tasks',
                'rate_walker', 'cancel_tasks', 'view_walk_history',
                'send_messages'
            ]
        };

        return permissions[roleName] || [];
    }
}

export default RBAC;
