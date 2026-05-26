import User from '../models/user.js';
import Role from '../models/role.js';

class AdminController {
    static async verifyGuide(req, res, next) {
        try {
            const { id } = req.params;

            const walkerRole = await Role.findOne({ where: { name: 'Walker' } });
            if (!walkerRole) {
                return res.status(500).json({ success: false, message: 'Guide role is not configured' });
            }

            const guide = await User.findOne({ where: { id, role_id: walkerRole.id } });
            if (!guide) {
                return res.status(404).json({ success: false, message: 'Guide not found' });
            }

            const certifications = Array.isArray(guide.certifications) ? guide.certifications : [];
            const firstCertificateUrl = (() => {
                if (!certifications.length) return null;
                const first = certifications[0];
                if (typeof first === 'string') return first;
                if (typeof first === 'object' && first !== null) {
                    return first.file_url || first.url || first.path || null;
                }
                return null;
            })();

            await guide.update({
                isVerified: true,
                is_certified: true,
                certificateUrl: guide.certificateUrl || firstCertificateUrl
            });

            return res.json({
                success: true,
                message: 'Guide verified successfully',
                guide: {
                    id: guide.id,
                    isVerified: Boolean(guide.isVerified),
                    certificateUrl: guide.certificateUrl || firstCertificateUrl || null
                }
            });
        } catch (error) {
            return next(error);
        }
    }
}

export default AdminController;
