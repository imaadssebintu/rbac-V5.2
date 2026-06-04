import User from '../models/user.js';
import RBAC from '../rbac.js';

class MiddlewareRBAC {
    static async hasPermission(userId, requiredPermissions) {
        return RBAC.hasPermission(userId, requiredPermissions);
    }

    static async isAdmin(userId) {
        return RBAC.isAdmin(userId);
    }

    static async isWalker(userId) {
        return RBAC.isWalker(userId);
    }

    static async isWalkee(userId) {
        return RBAC.isWalkee(userId);
    }

    static async hasRole(userId, roleName) {
        return RBAC.hasRole(userId, roleName);
    }

    static getRoleBasedRedirect(role) {
        return RBAC.getRoleBasedRedirect(role);
    }

    static getDefaultPermissions(roleName) {
        return RBAC.getDefaultPermissions(roleName);
    }
}

export default MiddlewareRBAC;
