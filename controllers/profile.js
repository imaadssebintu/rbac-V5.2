import User from '../models/user.js';
import Task from '../models/task.js';
import Payment from '../models/payment.js';
import Role from '../models/role.js';
import bcrypt from 'bcryptjs';
import { fn, col } from 'sequelize';
import path from 'path';
import fs from 'fs';
import { uploadImage } from '../services/cloudinaryUpload.js';

const RECENT_GALLERY_UPLOAD_WINDOW_MS = 5000;
const recentGalleryUploads = new Map();

class ProfileController {
    static toStoredUploadPath(inputPath) {
        if (!inputPath || typeof inputPath !== 'string') {
            return null;
        }

        const normalized = inputPath.replace(/\\/g, '/');
        if (normalized.startsWith('/uploads/')) {
            return normalized;
        }

        const marker = '/uploads/';
        const markerIndex = normalized.indexOf(marker);
        if (markerIndex >= 0) {
            return normalized.slice(markerIndex);
        }

        return null;
    }

    static deleteUploadFile(uploadPath) {
        const storedPath = ProfileController.toStoredUploadPath(uploadPath);
        if (!storedPath) {
            return;
        }

        const relative = storedPath.replace(/^\/uploads\/?/, '');
        const diskPath = path.join(process.cwd(), 'public', 'uploads', ...relative.split('/'));

        if (fs.existsSync(diskPath)) {
            fs.unlinkSync(diskPath);
        }
    }

    static getRelativeUploadPath(filePath) {
        if (!filePath) {
            return null;
        }

        const relativePath = path.relative(path.join(process.cwd(), 'public'), filePath);
        return relativePath.split(path.sep).join('/');
    }

    static getPublicFileUrl(req, relativePath) {
        if (!relativePath) {
            return null;
        }

        const host = req.get('host');
        return `${req.protocol}://${host}/${relativePath.replace(/^\/+/, '')}`;
    }

    static async getProfile(req, res, next) {
        try {
            const { user_id } = req.params;

            const user = await User.findByPk(user_id, {
                attributes: { exclude: ['password'] },
                include: [{
                    model: Role,
                    as: 'Role',
                    attributes: ['name', 'description']
                }]
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.json({
                success: true,
                user
            });
        } catch (error) {
            next(error);
        }
    }

    static async updateProfile(req, res, next) {
        try {
            const { user_id } = req.params;
            const updates = { ...req.body };

            // Log incoming request details
            console.log(`[UpdateProfile] Starting profile update for user_id: ${user_id}`, {
                bodyFields: Object.keys(updates),
                hasFiles: !!req.files,
                timestamp: new Date().toISOString()
            });

            const user = await User.findByPk(user_id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Remove password and certification from updates (use separate endpoints)
            delete updates.password;
            delete updates.role_id; // Role should be changed by admin only
            delete updates.is_certified;
            delete updates.certifications;

            const profilePicFile = req.files?.profilePic?.[0];
            const certificateFile = req.files?.certificate?.[0];

            if (profilePicFile) {
                console.log(`[UpdateProfile] Profile picture received:`, {
                    originalname: profilePicFile.originalname,
                    mimetype: profilePicFile.mimetype,
                    size: `${(profilePicFile.size / 1024).toFixed(2)} KB`,
                    destination: profilePicFile.destination,
                    filename: profilePicFile.filename
                });
            }

            if (certificateFile) {
                console.log(`[UpdateProfile] Certificate received:`, {
                    originalname: certificateFile.originalname,
                    mimetype: certificateFile.mimetype,
                    size: `${(certificateFile.size / 1024).toFixed(2)} KB`,
                    destination: certificateFile.destination,
                    filename: certificateFile.filename
                });
            }

            const profileImagePath = profilePicFile
                ? ProfileController.getRelativeUploadPath(profilePicFile.path)
                : null;

            const certificatePath = certificateFile
                ? ProfileController.getRelativeUploadPath(certificateFile.path)
                : null;

            if (!profileImagePath && !certificatePath && Object.keys(updates).length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No profile fields or files were provided'
                });
            }

            const nextUpdates = { ...updates };
            if (profileImagePath) {
                nextUpdates.profile_image = profileImagePath;
                console.log(`[UpdateProfile] Profile image path set to:`, profileImagePath);
            }

            if (certificatePath) {
                const existingCerts = Array.isArray(user.certifications) ? user.certifications : [];
                nextUpdates.certifications = [...existingCerts, certificatePath];
                nextUpdates.is_certified = true;
                console.log(`[UpdateProfile] Certificate added, total certifications: ${nextUpdates.certifications.length}`);
            }

            await user.update(nextUpdates);
            console.log(`[UpdateProfile] User record updated successfully for user_id: ${user_id}`);

            const response = {
                success: true,
                message: 'Profile updated successfully',
                user: user.getSafeData()
            };

            if (profileImagePath) {
                response.profileImageUrl = ProfileController.getPublicFileUrl(req, profileImagePath);
                response.profile_image = profileImagePath;
            }

            if (certificatePath) {
                response.certificateUrl = ProfileController.getPublicFileUrl(req, certificatePath);
                response.certificate = certificatePath;
            }

            console.log(`[UpdateProfile] Profile update completed successfully`, {
                user_id,
                hasProfileImage: !!profileImagePath,
                hasCertificate: !!certificatePath,
                timestamp: new Date().toISOString()
            });

            res.json(response);
        } catch (error) {
            console.error(`[UpdateProfile] Error updating profile for user_id: ${req.params.user_id}`, {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            next(error);
        }
    }

    static async changePassword(req, res, next) {
        try {
            const { user_id } = req.params;
            const { current_password, new_password } = req.body;

            const user = await User.findByPk(user_id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Verify current password
            const isValid = await user.checkPassword(current_password);
            if (!isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            // Update password
            user.password = new_password;
            await user.save();

            res.json({
                success: true,
                message: 'Password changed successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    static async updateLocation(req, res, next) {
        try {
            const { user_id } = req.params;
            const { location } = req.body;

            const user = await User.findByPk(user_id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            await user.update({ location });

            res.json({
                success: true,
                message: 'Location updated successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    static async toggleTheme(req, res, next) {
        try {
            const { user_id } = req.params;

            const user = await User.findByPk(user_id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const newTheme = user.theme === 'light' ? 'dark' : 'light';
            await user.update({ theme: newTheme });

            res.json({
                success: true,
                message: `Theme changed to ${newTheme}`,
                theme: newTheme
            });
        } catch (error) {
            next(error);
        }
    }

    static async uploadProfileImage(req, res, next) {
        try {
            const { user_id } = req.params;

            if (!req.file) {
                console.warn(`[UploadProfileImage] No file received for user_id: ${user_id}`);
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            console.log(`[UploadProfileImage] File received for user_id: ${user_id}`, {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: `${(req.file.size / 1024).toFixed(2)} KB`,
                filename: req.file.filename
            });

            const user = await User.findByPk(user_id);
            if (!user) {
                console.error(`[UploadProfileImage] User not found for user_id: ${user_id}`);
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            let imageUrl;

            try {
                imageUrl = await uploadImage(req.file.path, {
                    folder: 'voya_profiles',
                    transformation: [{ width: 500, height: 500, crop: 'limit' }]
                });
            } catch (uploadError) {
                console.warn('[UploadProfileImage] Cloudinary upload failed, using local fallback path.', {
                    user_id,
                    message: uploadError.message
                });
                imageUrl = `/uploads/profiles/${req.file.filename}`;
            }

            await user.update({ profile_image: imageUrl });
            console.log(`[UploadProfileImage] Profile image updated successfully for user_id: ${user_id}`, {
                imageUrl,
                timestamp: new Date().toISOString()
            });

            if (imageUrl.startsWith('http') && req.file?.path && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            res.json({
                success: true,
                message: 'Profile image updated successfully',
                imageUrl,
                filename: req.file.filename
            });
        } catch (error) {
            console.error(`[UploadProfileImage] Error uploading profile image for user_id: ${req.params.user_id}`, {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            next(error);
        }
    }

    static async uploadCertification(req, res, next) {
        try {
            const { user_id } = req.params;

            if (!req.file) {
                console.warn(`[UploadCertification] No file received for user_id: ${user_id}`);
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            console.log(`[UploadCertification] Certificate file received for user_id: ${user_id}`, {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: `${(req.file.size / 1024).toFixed(2)} KB`,
                filename: req.file.filename
            });

            const targetUser = await User.findByPk(user_id, {
                include: [{
                    model: Role,
                    as: 'Role',
                    attributes: ['name']
                }]
            });

            if (!targetUser) {
                console.error(`[UploadCertification] User not found for user_id: ${user_id}`);
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const isAdmin = req.user?.Role?.name === 'Admin';
            const isSelf = req.user?.id === targetUser.id;

            if (!isAdmin && !isSelf) {
                console.warn(`[UploadCertification] Unauthorized attempt - user ${req.user?.id} tried to upload cert for ${user_id}`);
                return res.status(403).json({
                    success: false,
                    message: 'Not allowed to upload certificates for this user'
                });
            }

            const roleName = targetUser.Role?.name;
            if (roleName !== 'Walker') {
                console.warn(`[UploadCertification] Invalid role for certification - user_id: ${user_id}, role: ${roleName}`);
                return res.status(400).json({
                    success: false,
                    message: 'Certificates can only be uploaded for guides'
                });
            }

            const currentCerts = Array.isArray(targetUser.certifications)
                ? targetUser.certifications
                : [];

            const certification = {
                id: `cert_${Date.now()}_${Math.round(Math.random() * 1E6)}`,
                name: req.body?.name || req.file.originalname,
                original_name: req.file.originalname,
                file_url: `/uploads/certifications/${req.file.filename}`,
                uploaded_at: new Date().toISOString(),
                status: 'submitted'
            };

            const updatedCerts = [...currentCerts, certification];

            await targetUser.update({
                certifications: updatedCerts,
                is_certified: true,
                isVerified: false,
                certificateUrl: certification.file_url
            });

            console.log(`[UploadCertification] Certificate uploaded successfully for user_id: ${user_id}`, {
                certificationId: certification.id,
                totalCertifications: updatedCerts.length,
                timestamp: new Date().toISOString()
            });

            res.json({
                success: true,
                message: 'Certificate uploaded successfully',
                certifications: updatedCerts,
                is_certified: targetUser.is_certified,
                newCertificate: certification
            });
        } catch (error) {
            console.error(`[UploadCertification] Error uploading certification for user_id: ${req.params.user_id}`, {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            next(error);
        }
    }

    static async deleteCertification(req, res, next) {
        try {
            const { user_id, cert_id } = req.params;

            const targetUser = await User.findByPk(user_id, {
                include: [{
                    model: Role,
                    as: 'Role',
                    attributes: ['name']
                }]
            });

            if (!targetUser) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const isAdmin = req.user?.Role?.name === 'Admin';
            const isSelf = req.user?.id === targetUser.id;
            if (!isAdmin && !isSelf) {
                return res.status(403).json({
                    success: false,
                    message: 'Not allowed to delete certificates for this user'
                });
            }

            const currentCerts = Array.isArray(targetUser.certifications) ? targetUser.certifications : [];
            const decodedCertId = decodeURIComponent(cert_id || '');

            const certIndex = currentCerts.findIndex((cert) => {
                if (typeof cert === 'string') {
                    return cert === decodedCertId;
                }

                return cert?.id === decodedCertId
                    || cert?.file_url === decodedCertId
                    || cert?.url === decodedCertId
                    || cert?.path === decodedCertId;
            });

            if (certIndex < 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Certificate not found'
                });
            }

            const removedCert = currentCerts[certIndex];
            const removedPath = typeof removedCert === 'string'
                ? removedCert
                : (removedCert?.file_url || removedCert?.url || removedCert?.path || null);

            if (removedPath) {
                ProfileController.deleteUploadFile(removedPath);
            }

            const updatedCerts = currentCerts.filter((_, index) => index !== certIndex);
            await targetUser.update({
                certifications: updatedCerts,
                is_certified: updatedCerts.length > 0
            });

            return res.json({
                success: true,
                message: 'Certificate deleted successfully',
                certifications: updatedCerts,
                is_certified: updatedCerts.length > 0
            });
        } catch (error) {
            return next(error);
        }
    }

    static async setCertificationStatus(req, res, next) {
        try {
            const { user_id } = req.params;
            const { is_certified } = req.body;

            const targetUser = await User.findByPk(user_id, {
                include: [{
                    model: Role,
                    as: 'Role',
                    attributes: ['name']
                }]
            });

            if (!targetUser) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (targetUser.Role?.name !== 'Walker') {
                return res.status(400).json({
                    success: false,
                    message: 'Certification only applies to guides'
                });
            }

            await targetUser.update({
                is_certified: Boolean(is_certified)
            });

            res.json({
                success: true,
                message: `Guide marked as ${Boolean(is_certified) ? 'certified' : 'not certified'}`,
                is_certified: targetUser.is_certified
            });
        } catch (error) {
            next(error);
        }
    }

    static async uploadGalleryImage(req, res, next) {
        try {
            const { user_id } = req.params;

            const user = await User.findByPk(user_id);
            if (!user) {
                console.error(`[UploadGalleryImage] User not found for user_id: ${user_id}`);
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            if (!req.file) {
                console.warn(`[UploadGalleryImage] No file received for user_id: ${user_id}`);
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            console.log(`[UploadGalleryImage] Gallery image received for user_id: ${user_id}`, {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: `${(req.file.size / 1024).toFixed(2)} KB`,
                filename: req.file.filename
            });

            const imageUrl = `/uploads/gallery/${req.file.filename}`;

            // Guard against accidental duplicate submissions from repeated UI events.
            const uploadSignature = `${user_id}:${req.file.originalname}:${req.file.size}:${req.file.mimetype}`;
            const now = Date.now();
            const lastSeen = recentGalleryUploads.get(uploadSignature) || 0;
            recentGalleryUploads.set(uploadSignature, now);

            for (const [signature, timestamp] of recentGalleryUploads.entries()) {
                if (now - timestamp > RECENT_GALLERY_UPLOAD_WINDOW_MS) {
                    recentGalleryUploads.delete(signature);
                }
            }

            const gallery = Array.isArray(user.gallery) ? user.gallery : [];
            const seen = new Set();
            const normalizedGallery = [];
            for (const item of gallery) {
                const normalized = ProfileController.toStoredUploadPath(item);
                if (!normalized || seen.has(normalized)) {
                    continue;
                }
                seen.add(normalized);
                normalizedGallery.push(normalized);
            }

            if (now - lastSeen < RECENT_GALLERY_UPLOAD_WINDOW_MS) {
                ProfileController.deleteUploadFile(imageUrl);

                if (normalizedGallery.length !== gallery.length) {
                    await user.update({ gallery: normalizedGallery });
                }

                return res.json({
                    success: true,
                    message: 'Duplicate upload ignored',
                    gallery: normalizedGallery,
                    duplicateIgnored: true
                });
            }

            const newGallery = [...normalizedGallery, imageUrl];
            
            await user.update({ gallery: newGallery });

            console.log(`[UploadGalleryImage] Gallery image added successfully for user_id: ${user_id}`, {
                imageUrl,
                totalGalleryItems: newGallery.length,
                timestamp: new Date().toISOString()
            });

            res.json({
                success: true,
                message: 'File added to gallery',
                gallery: newGallery,
                newImageUrl: imageUrl
            });
        } catch (error) {
            console.error(`[UploadGalleryImage] Error uploading gallery image for user_id: ${req.params.user_id}`, {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            next(error);
        }
    }

    static async deleteGalleryImage(req, res, next) {
        try {
            const { user_id } = req.params;
            const { imageUrl } = req.body;

            const user = await User.findByPk(user_id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const incomingPath = ProfileController.toStoredUploadPath(imageUrl);
            if (!incomingPath) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid image URL provided'
                });
            }

            const gallery = Array.isArray(user.gallery) ? user.gallery : [];
            const newGallery = gallery.filter((img) => ProfileController.toStoredUploadPath(img) !== incomingPath);

            if (newGallery.length === gallery.length) {
                return res.status(404).json({
                    success: false,
                    message: 'Image not found in gallery'
                });
            }

            ProfileController.deleteUploadFile(incomingPath);
            
            await user.update({ gallery: newGallery });

            res.json({
                success: true,
                message: 'Image removed from gallery',
                gallery: newGallery
            });
        } catch (error) {
            next(error);
        }
    }

    static async deleteProfileImage(req, res, next) {
        try {
            const { user_id } = req.params;
            const user = await User.findByPk(user_id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const isAdmin = req.user?.Role?.name === 'Admin';
            const isSelf = req.user?.id === user.id;
            if (!isAdmin && !isSelf) {
                return res.status(403).json({
                    success: false,
                    message: 'Not allowed to delete profile image for this user'
                });
            }

            const currentImage = ProfileController.toStoredUploadPath(user.profile_image);
            if (currentImage) {
                ProfileController.deleteUploadFile(currentImage);
            }

            await user.update({ profile_image: null });

            return res.json({
                success: true,
                message: 'Profile image deleted successfully',
                profile_image: null
            });
        } catch (error) {
            return next(error);
        }
    }

    static async deactivateAccount(req, res, next) {
        try {
            const { user_id } = req.params;
            const { reason } = req.body;

            const user = await User.findByPk(user_id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            await user.update({
                is_active: false,
                deactivation_reason: reason
            });

            res.json({
                success: true,
                message: 'Account deactivated successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    static async getStats(req, res, next) {
        try {
            const { user_id } = req.params;

            const user = await User.findByPk(user_id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            let stats = {
                wallet_balance: user.wallet_balance,
                preferred_currency: user.preferred_currency
            };

            // Get role-based stats
            const role = await user.getRole();

            if (role.name === 'Walker') {
                const [taskStats, paymentStats] = await Promise.all([
                    Task.findAll({
                        where: { walker_id: user_id },
                        attributes: [
                            [fn('COUNT', col('id')), 'total_tasks'],
                            [fn('SUM', col('price')), 'total_earnings'],
                            [fn('AVG', col('walker_rating')), 'avg_rating']
                        ],
                        raw: true
                    }),
                    Payment.findAll({
                        where: {
                            user_id,
                            payment_type: 'task_payment',
                            status: 'completed'
                        },
                        attributes: [
                            [fn('SUM', col('amount')), 'total_paid']
                        ],
                        raw: true
                    })
                ]);

                stats = {
                    ...stats,
                    total_tasks: taskStats[0]?.total_tasks || 0,
                    total_earnings: taskStats[0]?.total_earnings || 0,
                    avg_rating: taskStats[0]?.avg_rating || 0,
                    total_paid: paymentStats[0]?.total_paid || 0
                };
            } else if (role.name === 'Walkee') {
                const [taskStats, paymentStats] = await Promise.all([
                    Task.findAll({
                        where: { walkee_id: user_id },
                        attributes: [
                            [fn('COUNT', col('id')), 'total_tasks'],
                            [fn('SUM', col('price')), 'total_spent'],
                            [fn('AVG', col('walkee_rating')), 'avg_rating']
                        ],
                        raw: true
                    }),
                    Payment.findAll({
                        where: {
                            user_id,
                            payment_type: 'task_payment'
                        },
                        attributes: [
                            [fn('COUNT', require('sequelize').col('id')), 'total_payments']
                        ],
                        raw: true
                    })
                ]);

                stats = {
                    ...stats,
                    total_tasks: taskStats[0]?.total_tasks || 0,
                    total_spent: taskStats[0]?.total_spent || 0,
                    avg_rating: taskStats[0]?.avg_rating || 0,
                    total_payments: paymentStats[0]?.total_payments || 0
                };
            }

            res.json({
                success: true,
                stats
            });
        } catch (error) {
            next(error);
        }
    }
}

export default ProfileController;
