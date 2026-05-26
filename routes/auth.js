import express from 'express';
import passport from 'passport';
import AuthController from '../controllers/auth.js'; // Ensure this matches your file name
import { authenticate } from '../middleware/auth.js';
import { User, Role } from '../models/index.js';
import AuditLog from '../models/auditLog.js';
import { getConfiguredOAuthProviders } from '../services/oauthProviders.js';

const router = express.Router();
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

const recordUserVisit = async (req, user, endpoint) => {
    try {
        if (user?.id) {
            await user.update({ last_login: new Date() });
        }

        await AuditLog.create({
            action: 'USER_VISIT',
            details: JSON.stringify({
                endpoint,
                user_id: user?.id || null,
                user_name: user?.name || null,
                user_email: user?.email || null,
                role: user?.Role?.name || null,
                method: req.method,
                path: req.originalUrl,
                visited_at: new Date().toISOString()
            }),
            ip_address: req.ip,
            severity: 'info'
        });
    } catch (error) {
        console.error('VISIT LOG ERROR:', error?.message || error);
    }
};

// 1. Signup/Register - Using the controller (both /register and /signup work)
router.post('/register', AuthController.signup);
router.post('/signup', AuthController.signup);
router.post('/social', AuthController.socialLogin);
router.get('/oauth/providers', (req, res) => {
    res.json({
        success: true,
        providers: getConfiguredOAuthProviders()
    });
});

const providerConfig = {
    google: { scope: ['profile', 'email'] },
    facebook: { scope: ['email', 'public_profile'] },
    linkedin: { scope: ['r_liteprofile', 'r_emailaddress'] },
    github: { scope: ['user:email'] },
    twitter: {}
};

const isProviderConfigured = (provider) => getConfiguredOAuthProviders().includes(provider);

router.get('/oauth/:provider', (req, res, next) => {
    const provider = String(req.params.provider || '').toLowerCase();
    if (!providerConfig[provider]) {
        return res.status(400).json({ success: false, message: 'Unsupported OAuth provider' });
    }

    if (!isProviderConfigured(provider)) {
        return res.status(400).json({
            success: false,
            message: `${provider} OAuth is not configured on the server`
        });
    }

    const requestedRole = String(req.query.role || 'walkee').toLowerCase();
    const options = {
        ...providerConfig[provider],
        session: false,
        state: requestedRole
    };

    return passport.authenticate(provider, options)(req, res, next);
});

router.get('/oauth/:provider/callback', (req, res, next) => {
    const provider = String(req.params.provider || '').toLowerCase();
    if (!providerConfig[provider]) {
        return res.redirect(`${FRONTEND_URL}/login?oauth=error&message=Unsupported%20provider`);
    }

    return passport.authenticate(provider, { session: false }, async (error, socialProfile) => {
        if (error || !socialProfile) {
            const message = encodeURIComponent(error?.message || 'OAuth authentication failed');
            return res.redirect(`${FRONTEND_URL}/login?oauth=error&message=${message}`);
        }

        try {
            const user = await AuthController.findOrCreateSocialUser({
                provider: socialProfile.provider,
                providerId: socialProfile.providerId,
                email: socialProfile.email,
                name: socialProfile.name,
                role_name: socialProfile.role_name
            });

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.Role?.name },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '7d' }
            );

            return res.redirect(`${FRONTEND_URL}/login?oauth=success&token=${encodeURIComponent(token)}`);
        } catch (callbackError) {
            const message = encodeURIComponent(callbackError?.message || 'Social login failed');
            return res.redirect(`${FRONTEND_URL}/login?oauth=error&message=${message}`);
        }
    })(req, res, next);
});

// 2. Login
router.post('/login', AuthController.login);

// 3. Get Current User - /me endpoint
router.get('/me', authenticate, async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        const user = await User.findByPk(req.user.id, {
            include: [{
                model: Role,
                as: 'Role',
                attributes: ['name', 'permissions']
            }],
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await recordUserVisit(req, user, 'auth_me');

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.Role?.name,
            bio: user.bio,
            location: user.location,
            social_links: user.social_links,
            is_verified: user.is_verified,
            is_active: user.is_active,
            wallet_balance: user.wallet_balance,
            profile_image: user.profile_image,
            profilePicture: user.profile_image,
            certificateUrl: user.certificateUrl,
            isVerified: Boolean(user.isVerified),
            is_verified: Boolean(user.isVerified),
            is_certified: user.is_certified,
            certifications: user.certifications,
            gallery: user.gallery || []
        });
    } catch (error) {
        console.error('GET /me ERROR:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// 4. Logout - Check if AuthController.logout actually exists
if (AuthController.logout) {
    router.post('/logout', authenticate, AuthController.logout);
} else {
    router.post('/logout', authenticate, (req, res) => {
        res.json({ success: true, message: 'Logged out' });
    });
}

// 5. Verify - A simple inline check to replace the broken verify call
router.get('/verify', authenticate, async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    await recordUserVisit(req, req.user, 'auth_verify');
    res.json({
        success: true,
        user: req.user
    });
});

export default router;
