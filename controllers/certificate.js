import Certificate from '../models/certificate.js';
import User from '../models/user.js';
import { Op } from 'sequelize';

// Upload certificate for authenticated user
export const uploadCertificate = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized - User not authenticated'
            });
        }

        // Verify user exists
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const { name } = req.body;
        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Certificate name is required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Certificate file is required'
            });
        }

        // Create certificate record
        const certificate = await Certificate.create({
            user_id: userId,
            name: name.trim(),
            file_path: `/uploads/certifications/${req.file.filename}`,
            file_type: req.file.mimetype,
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            message: 'Certificate uploaded successfully and is pending verification',
            certificate: {
                id: certificate.id,
                name: certificate.name,
                file_path: certificate.file_path,
                file_type: certificate.file_type,
                status: certificate.status,
                created_at: certificate.created_at
            }
        });
    } catch (error) {
        console.error('Error uploading certificate:', error);
        next(error);
    }
};

// Get user's own certificates
export const getUserCertificates = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized - User not authenticated'
            });
        }

        const certificates = await Certificate.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']]
        });

        res.status(200).json({
            success: true,
            certificates: certificates.map(cert => ({
                id: cert.id,
                name: cert.name,
                file_path: cert.file_path,
                file_type: cert.file_type,
                status: cert.status,
                verified_at: cert.verified_at,
                rejection_reason: cert.rejection_reason,
                created_at: cert.created_at
            }))
        });
    } catch (error) {
        console.error('Error fetching certificates:', error);
        next(error);
    }
};

// Get single certificate by ID
export const getCertificateById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const certificate = await Certificate.findByPk(id, {
            include: [
                { model: User, as: 'User', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'Verifier', attributes: ['id', 'name', 'email'] }
            ]
        });

        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found'
            });
        }

        // Users can only view their own certificates unless they're admin
        const isAdmin = req.user?.role === 'admin';
        if (!isAdmin && certificate.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden - You can only view your own certificates'
            });
        }

        res.status(200).json({
            success: true,
            certificate: {
                id: certificate.id,
                name: certificate.name,
                file_path: certificate.file_path,
                file_type: certificate.file_type,
                status: certificate.status,
                verified_at: certificate.verified_at,
                rejection_reason: certificate.rejection_reason,
                created_at: certificate.created_at,
                user: certificate.User,
                verifier: certificate.Verifier
            }
        });
    } catch (error) {
        console.error('Error fetching certificate:', error);
        next(error);
    }
};

// Admin: Verify certificate
export const verifyCertificate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, rejection_reason } = req.body;
        const adminId = req.user?.id;

        // Verify admin role
        if (req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Forbidden - Admin access required'
            });
        }

        const certificate = await Certificate.findByPk(id);
        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found'
            });
        }

        // Validate status
        if (!['verified', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be "verified" or "rejected"'
            });
        }

        // If rejecting, require a reason
        if (status === 'rejected' && (!rejection_reason || rejection_reason.trim().length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required when rejecting a certificate'
            });
        }

        // Update certificate
        await certificate.update({
            status,
            verified_at: status === 'verified' ? new Date() : null,
            verified_by: adminId,
            rejection_reason: status === 'rejected' ? rejection_reason.trim() : null
        });

        // If verified, update user's is_certified flag
        if (status === 'verified') {
            await User.update(
                { is_certified: true },
                { where: { id: certificate.user_id } }
            );
        }

        res.status(200).json({
            success: true,
            message: `Certificate ${status} successfully`,
            certificate: {
                id: certificate.id,
                name: certificate.name,
                status: certificate.status,
                verified_at: certificate.verified_at,
                rejection_reason: certificate.rejection_reason
            }
        });
    } catch (error) {
        console.error('Error verifying certificate:', error);
        next(error);
    }
};

// Admin: Get all certificates (with optional filters)
export const getAllCertificates = async (req, res, next) => {
    try {
        // Verify admin role
        if (req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Forbidden - Admin access required'
            });
        }

        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        if (status && ['pending', 'verified', 'rejected'].includes(status)) {
            where.status = status;
        }

        const { count, rows } = await Certificate.findAndCountAll({
            where,
            include: [
                { model: User, as: 'User', attributes: ['id', 'name', 'email'] }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.status(200).json({
            success: true,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            },
            certificates: rows.map(cert => ({
                id: cert.id,
                name: cert.name,
                file_path: cert.file_path,
                file_type: cert.file_type,
                status: cert.status,
                verified_at: cert.verified_at,
                rejection_reason: cert.rejection_reason,
                created_at: cert.created_at,
                user: cert.User
            }))
        });
    } catch (error) {
        console.error('Error fetching certificates:', error);
        next(error);
    }
};

// Admin: Get pending certificates count
export const getPendingCertificatesCount = async (req, res, next) => {
    try {
        // Verify admin role
        if (req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Forbidden - Admin access required'
            });
        }

        const count = await Certificate.count({
            where: { status: 'pending' }
        });

        res.status(200).json({
            success: true,
            count
        });
    } catch (error) {
        console.error('Error fetching pending certificates count:', error);
        next(error);
    }
};

// Delete certificate (admin only)
export const deleteCertificate = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verify admin role
        if (req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Forbidden - Admin access required'
            });
        }

        const certificate = await Certificate.findByPk(id);
        if (!certificate) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found'
            });
        }

        await certificate.destroy();

        res.status(200).json({
            success: true,
            message: 'Certificate deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting certificate:', error);
        next(error);
    }
};

export default {
    uploadCertificate,
    getUserCertificates,
    getCertificateById,
    verifyCertificate,
    getAllCertificates,
    getPendingCertificatesCount,
    deleteCertificate
};