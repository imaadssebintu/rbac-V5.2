import express from 'express';
import ProfileController from '../controllers/profile.js';
import { authenticate, authorize } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../public/uploads/profiles/');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 4 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const allowedMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const extname = allowedExt.includes(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedMime.includes(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
        }
    }
});

const profileUpdateStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const isCertificate = file.fieldname === 'certificate';
        const dir = isCertificate
            ? path.join(__dirname, '../public/uploads/certifications/')
            : path.join(__dirname, '../public/uploads/profiles/');

        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const prefix = file.fieldname === 'certificate' ? 'cert' : 'profile';
        cb(null, `${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const profileUpdateUpload = multer({
    storage: profileUpdateStorage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const certificateMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];

        if (file.fieldname === 'certificate') {
            if (certificateMimeTypes.includes(file.mimetype)) {
                return cb(null, true);
            }
            return cb(new Error('Certificate must be a PDF or image file'));
        }

        if (imageMimeTypes.includes(file.mimetype)) {
            return cb(null, true);
        }

        return cb(new Error('Profile photo must be an image file'));
    }
});

const certificateStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../public/uploads/certifications/');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'cert-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const certificateUpload = multer({
    storage: certificateStorage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedExt = ['.pdf', '.jpg', '.jpeg', '.png'];
        const allowedMime = ['application/pdf', 'image/jpeg', 'image/png'];
        const extname = allowedExt.includes(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedMime.includes(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        }

        cb(new Error('Only PDF, JPG, and PNG files are allowed'));
    }
});

const galleryStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../public/uploads/gallery/');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'gallery-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const galleryUpload = multer({
    storage: galleryStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const allowedMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const extname = allowedExt.includes(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedMime.includes(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only small image formats are allowed (JPG, PNG, GIF, WEBP)'));
        }
    }
});

/**
 * Custom middleware to wrap Multer uploads and handle errors gracefully
 * Prevents server crash on file upload errors (size, type, etc.)
 * Logs file details for debugging
 */
const handleMulterError = (uploadHandler, uploadName = 'file') => {
    return (req, res, next) => {
        uploadHandler(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                // Multer-specific errors (file too large, too many files, etc.)
                console.error(`[Multer Error - ${uploadName}]`, {
                    code: err.code,
                    message: err.message,
                    field: err.field,
                    timestamp: new Date().toISOString()
                });

                const statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
                const errorMessage = 
                    err.code === 'LIMIT_FILE_SIZE' 
                        ? 'File is too large. Maximum size allowed is 8MB.'
                        : err.message || 'File upload failed';

                return res.status(statusCode).json({
                    success: false,
                    message: errorMessage,
                    error: err.code
                });
            } else if (err) {
                // Custom validation errors or other errors
                console.error(`[Upload Error - ${uploadName}]`, {
                    message: err.message,
                    timestamp: new Date().toISOString()
                });

                return res.status(400).json({
                    success: false,
                    message: err.message || 'File upload failed'
                });
            }

            // Log successful file uploads for debugging
            if (req.file) {
                console.log(`[File Received - ${uploadName}]`, {
                    fieldname: req.file.fieldname,
                    originalname: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: `${(req.file.size / 1024).toFixed(2)} KB`,
                    destination: req.file.destination,
                    filename: req.file.filename,
                    timestamp: new Date().toISOString()
                });
            } else if (req.files) {
                console.log(`[Files Received - ${uploadName}]`, {
                    files: Object.keys(req.files).map(fieldname => ({
                        fieldname,
                        count: req.files[fieldname].length,
                        details: req.files[fieldname].map(f => ({
                            originalname: f.originalname,
                            mimetype: f.mimetype,
                            size: `${(f.size / 1024).toFixed(2)} KB`,
                            filename: f.filename
                        }))
                    })),
                    timestamp: new Date().toISOString()
                });
            }

            next();
        });
    };
};

// All profile routes require authentication
router.use(authenticate);

// Profile CRUD operations
router.get('/:user_id', ProfileController.getProfile);
router.put('/:user_id', handleMulterError(
    profileUpdateUpload.fields([
        { name: 'profilePic', maxCount: 1 },
        { name: 'certificate', maxCount: 1 }
    ]),
    'profileUpdate'
), ProfileController.updateProfile);
router.put('/:user_id/password', ProfileController.changePassword);
router.put('/:user_id/location', ProfileController.updateLocation);
router.put('/:user_id/theme', ProfileController.toggleTheme);
router.put('/:user_id/currency', (req, res) => res.json({ message: "Currency updated" }));
router.put('/:user_id/notification-settings', (req, res) => res.json({ message: "Notification settings updated" }));

// Profile image upload
router.post(
    '/:user_id/upload',
    handleMulterError(
        upload.fields([
            { name: 'profilePic', maxCount: 1 },
            { name: 'profile_image', maxCount: 1 }
        ]),
        'profileImage'
    ),
    (req, res, next) => {
        req.file = req.files?.profilePic?.[0] || req.files?.profile_image?.[0] || null;
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No profile image file uploaded. Use profilePic or profile_image.'
            });
        }
        return next();
    },
    ProfileController.uploadProfileImage
);
router.post('/:user_id/certifications', handleMulterError(certificateUpload.single('certificate'), 'certificate'), ProfileController.uploadCertification);
router.delete('/:user_id/certifications/:cert_id', ProfileController.deleteCertification);
router.post('/:user_id/gallery/upload', handleMulterError(galleryUpload.single('image'), 'galleryImage'), ProfileController.uploadGalleryImage);
router.post('/:user_id/gallery/delete', ProfileController.deleteGalleryImage);
router.put('/:user_id/certify', authorize('Admin'), ProfileController.setCertificationStatus);
router.delete('/:user_id/image', ProfileController.deleteProfileImage);

// Account management
router.put('/:user_id/deactivate', (req, res) => res.json({ message: "Account deactivated" }));
router.put('/:user_id/reactivate', (req, res) => res.json({ message: "Account reactivated" }));
router.delete('/:user_id', (req, res) => res.json({ message: "Account deleted" }));

// Statistics and insights
router.get('/:user_id/stats', (req, res) => res.json({ stats: {} }));
router.get('/:user_id/insights', (req, res) => res.json({ insights: {} }));
router.get('/:user_id/activity', (req, res) => res.json({ activity: [] }));

// Preferences
router.put('/:user_id/preferences', (req, res) => res.json({ message: "Preferences updated" }));

// Verification
router.post('/:user_id/verify-email', (req, res) => res.json({ message: "Verification email sent" }));
router.post('/:user_id/verify-phone', (req, res) => res.json({ message: "Verification SMS sent" }));
router.post('/:user_id/verify/:token', (req, res) => res.json({ message: "Account verified" }));

export default router;
