import { Op } from 'sequelize';
import User from '../models/user.js';
import Role from '../models/role.js';

class GuideController {
    static async listGuides(req, res, next) {
        try {
            const { page = 1, limit = 20, certified, search } = req.query;
            const offset = (page - 1) * limit;

            const roleRecord = await Role.findOne({ where: { name: 'Walker' } });
            if (!roleRecord) {
                return res.status(404).json({
                    success: false,
                    message: 'Guide role not configured'
                });
            }

            const where = {
                role_id: roleRecord.id,
                is_active: true
            };

            if (certified !== undefined) {
                where.is_certified = certified === 'true';
            }

            if (search) {
                where.name = { [Op.like]: `%${search}%` };
            }

            const guides = await User.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                attributes: [
                    'id',
                    'name',
                    'profile_image',
                    'location',
                    'certificateUrl',
                    'isVerified',
                    'is_certified',
                    'certifications'
                ],
                include: [{
                    model: Role,
                    as: 'Role',
                    attributes: ['name', 'description']
                }]
            });

            res.json({
                success: true,
                guides: guides.rows,
                pagination: {
                    total: guides.count,
                    page: parseInt(page),
                    pages: Math.ceil(guides.count / limit),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static async getGuideById(req, res, next) {
        try {
            const { id } = req.params;

            const roleRecord = await Role.findOne({ where: { name: 'Walker' } });
            if (!roleRecord) {
                return res.status(404).json({
                    success: false,
                    message: 'Guide role not configured'
                });
            }

            const guide = await User.findOne({
                where: { id, role_id: roleRecord.id, is_active: true },
                attributes: [
                    'id',
                    'name',
                    'profile_image',
                    'location',
                    'certificateUrl',
                    'isVerified',
                    'is_certified',
                    'certifications',
                    'gallery'
                ],
                include: [{
                    model: Role,
                    as: 'Role',
                    attributes: ['name', 'description']
                }]
            });

            if (!guide) {
                return res.status(404).json({
                    success: false,
                    message: 'Guide not found'
                });
            }

            res.json({
                success: true,
                guide
            });
        } catch (error) {
            next(error);
        }
    }
}

export default GuideController;
