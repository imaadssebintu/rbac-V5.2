import jwt from "jsonwebtoken";
import User from '../models/user.js';
import RBAC from '../rbac.js';

const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        const user = await User.findByPk(decoded.id, {
            include: User.includeRole()
        });

        if (!user || !user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'User not found or account is inactive'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        next(error);
    }
};

const authorize = (...roles) => {
    // Handle case where roles are passed as an array
    const allowedRoles = Array.isArray(roles[0]) ? roles[0] : roles;
    const normalizedAllowedRoles = allowedRoles.map((role) => RBAC.normalizeRoleName(role));

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userRole = RBAC.normalizeRoleName(req.user?.Role?.name);
        if (!normalizedAllowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: `Insufficient permissions (${req.user?.Role?.name || 'unknown role'})`
            });
        }

        next();
    };
};

const checkPermission = (permission) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            if (!req.user.Role || !Array.isArray(req.user.Role.permissions)) {
                return res.status(403).json({
                    success: false,
                    message: 'No role or permissions assigned'
                });
            }

            const hasPermission = req.user.Role.permissions.includes(permission);

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: `Permission denied: ${permission}`
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

export {
    authenticate,
    authorize,
    checkPermission
};
