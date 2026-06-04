import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import Role from "../models/role.js";
import RBAC from "../rbac.js";
import { Op } from "sequelize";

class AuthController {
    static generateToken(user, roleName) {
        return jwt.sign(
            { id: user.id, email: user.email, role: roleName || user.Role?.name },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );
    }

    static getSyntheticEmail(provider, providerId) {
        const safeProvider = String(provider || 'social').toLowerCase().replace(/[^a-z0-9]/g, '');
        const safeId = String(providerId || Date.now()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
        return `${safeProvider}.${safeId}@social.voya.local`;
    }

    static async generateUniquePhone() {
        for (let i = 0; i < 6; i += 1) {
            const candidate = `9${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 10)}`;
            const existing = await User.findOne({ where: { phone: candidate } });
            if (!existing) {
                return candidate;
            }
        }
        return `9${Date.now().toString().slice(-9)}`;
    }

    static async findOrCreateSocialUser({ provider, providerId, email, name, phone, role_name }) {
        const normalizedEmail = email?.toLowerCase().trim() || AuthController.getSyntheticEmail(provider, providerId);

        // 1. Look up by provider+providerId first (deduplication)
        let user = null;
        if (provider && providerId) {
            user = await User.findOne({
                where: {
                    auth_provider: provider,
                    auth_provider_id: String(providerId)
                },
                include: User.includeRole()
            });
        }

        // 2. Fall back to email lookup
        if (!user) {
            user = await User.findOne({
                where: { email: normalizedEmail },
                include: User.includeRole()
            });

            // 3. Found by email but missing provider info — link provider to existing user
            if (user && provider && providerId) {
                await user.update({
                    auth_provider: provider,
                    auth_provider_id: String(providerId)
                });
            }
        }

        // 4. Create new user if not found
        if (!user) {
            const normalizedRoleName = RBAC.normalizeRoleName(role_name);
            let role = await Role.findOne({ where: { name: normalizedRoleName } });
            if (!role) {
                // Fallback: find by normalizing existing role names (handles legacy DB)
                const allRoles = await Role.findAll({ attributes: ['id', 'name'] });
                role = allRoles.find(r => RBAC.normalizeRoleName(r.name) === normalizedRoleName);
            }
            if (!role) {
                throw new Error('Invalid role specified');
            }

            let finalPhone = phone?.trim();
            if (finalPhone) {
                const existingPhone = await User.findOne({ where: { phone: finalPhone } });
                if (existingPhone) {
                    finalPhone = await AuthController.generateUniquePhone();
                }
            } else {
                finalPhone = await AuthController.generateUniquePhone();
            }

            const randomPassword = `social_${provider || 'oauth'}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

            user = await User.create({
                name: name || normalizedEmail.split('@')[0],
                email: normalizedEmail,
                phone: finalPhone,
                password: randomPassword,
                role_id: role.id,
                auth_provider: provider || null,
                auth_provider_id: providerId ? String(providerId) : null,
                is_active: true,
                is_verified: true
            });

            user = await User.findByPk(user.id, {
                include: User.includeRole()
            });
        }

        if (!user.is_active) {
            throw new Error('Account is deactivated');
        }

        await user.update({ last_login: new Date() });
        return user;
    }

    static async signup(req, res, next) {
        try {
            // 1. Normalize input
            const { name, phone, password, role_name = 'traveler', location } = req.body;
            const email = req.body.email.toLowerCase().trim();

            // 2. Check if user already exists
            const existingEmail = await User.findOne({ where: { email } });
            if (existingEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }

            const existingPhone = await User.findOne({ where: { phone } });
            if (existingPhone) {
                return res.status(400).json({
                    success: false,
                    message: 'Phone already exists'
                });
            }

            // 3. Get role — try exact match first, then fallback to normalized lookup
            const normalizedRoleName = RBAC.normalizeRoleName(role_name || 'traveler');
            let role = await Role.findOne({ where: { name: normalizedRoleName } });
            if (!role) {
                // Fallback: find by normalizing existing role names (handles legacy DB)
                const allRoles = await Role.findAll({ attributes: ['id', 'name'] });
                role = allRoles.find(r => RBAC.normalizeRoleName(r.name) === normalizedRoleName);
            }
            if (!role) {
                return res.status(400).json({ success: false, message: 'Invalid role specified' });
            }

            /**
             * NOTE: If your models/user.js ALREADY hashes the password in a hook,
             * you should remove the bcrypt lines below and just pass 'password' to User.create.
             * I am leaving it here as a safe standard.
             */
            //const salt = await bcrypt.genSalt(10);
           // const hashedPassword = await bcrypt.hash(password, salt);

            // 4. Create user
            const user = await User.create({
                name,
                email,
                phone,
                password: password,
                role_id: role.id,
                location,
                is_active: true, // Ensure users are active by default
                is_verified: false
            });

            // 5. Generate token
            const token = AuthController.generateToken(user, role.name);

            await user.update({ last_login: new Date() });

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                token,
                user: user.getSafeData(),
                redirect: RBAC.getRoleBasedRedirect(role.name)
            });
        } catch (error) {
            console.error("SIGNUP ERROR:", error);
            next(error);
        }
    }

    static async login(req, res, next) {
        try {
            // 1. Normalize input
            const identifier = req.body.email.toLowerCase().trim();
            const { password } = req.body;

            // 2. Find user with Role by Email OR Phone
            const user = await User.findOne({
                where: {
                    [Op.or]: [
                        { email: identifier },
                        { phone: identifier }
                    ]
                },
                include: User.includeRole()
            });

            // Debugging log for your terminal
            if (!user) {
                console.log(`Login failed: No user found with identifier ${identifier}`);
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            // 3. Check password using the model method
            const isValidPassword = await user.checkPassword(password);

            if (!isValidPassword) {
                console.log(`Login failed: Password mismatch for ${identifier}`);
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            // 4. Check status
            if (!user.is_active) {
                return res.status(403).json({ success: false, message: 'Account is deactivated' });
            }

            // 5. Success - Generate Token
            const token = AuthController.generateToken(user);

            await user.update({ last_login: new Date() });

            res.json({
                success: true,
                message: 'Login successful',
                token,
                user: user.getSafeData(),
                redirect: RBAC.getRoleBasedRedirect(user.Role.name)
            });
        } catch (error) {
            console.error("LOGIN ERROR:", error);
            next(error);
        }
    }

    static async socialLogin(req, res, next) {
        try {
            const { provider, providerId, email, name, phone, role_name = 'traveler' } = req.body;

            if (!provider || !email) {
                return res.status(400).json({
                    success: false,
                    message: 'Provider and email are required'
                });
            }

            const user = await AuthController.findOrCreateSocialUser({
                provider,
                providerId: providerId || `${provider}_${Date.now()}`,
                email,
                name,
                phone,
                role_name
            });

            const token = AuthController.generateToken(user);

            res.json({
                success: true,
                message: 'Login successful',
                token,
                user: user.getSafeData(),
                redirect: RBAC.getRoleBasedRedirect(user.Role?.name)
            });
        } catch (error) {
            console.error('SOCIAL LOGIN ERROR:', error);
            next(error);
        }
    }
}

export default AuthController;
