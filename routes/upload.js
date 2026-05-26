import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import User from '../models/user.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// FORCE create uploads folder if it doesn't exist
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Remove colons for Windows compatibility
        const safeDate = new Date().toISOString().replace(/:/g, '-');
        const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${safeDate}-${safeOriginalName}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedMime = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf'
        ];

        if (!allowedMime.includes(file.mimetype)) {
            return cb(new Error('Only images (JPG, PNG, GIF, WEBP) and PDF files are allowed'));
        }

        cb(null, true);
    }
}).fields([
    { name: 'profilePic', maxCount: 1 },
    { name: 'profile_image', maxCount: 1 }
]);

// Safety wrapper to prevent crashes
const safeUpload = (req, res, next) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: `Multer Error: ${err.message}`
            });
        }

        if (err) {
            return res.status(500).json({
                success: false,
                message: `Unknown Error: ${err.message}`
            });
        }

        const normalizedFile = req.files?.profilePic?.[0] || req.files?.profile_image?.[0] || null;
        req.file = normalizedFile;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file was received by the server. Use profilePic or profile_image.'
            });
        }

        // Log uploaded file to verify it reached server
        console.log('[Upload Success] req.file =', req.file);
        next();
    });
};

router.post('/upload', authenticate, safeUpload, async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized user session'
            });
        }

        // Normalize Windows file paths before deriving the public URL path.
        const normalizedDiskPath = String(req.file.path || '').replace(/\\/g, '/');
        const uploadsMarker = '/public/uploads/';
        const uploadsIndex = normalizedDiskPath.lastIndexOf(uploadsMarker);
        const filePath = uploadsIndex >= 0
            ? `/uploads/${normalizedDiskPath.slice(uploadsIndex + uploadsMarker.length)}`
            : `/uploads/profiles/${req.file.filename}`;

        await User.update(
            { profile_image: filePath },
            { where: { id: userId } }
        );

        return res.status(200).json({
            success: true,
            message: 'File uploaded and profile updated successfully',
            imageUrl: filePath,
            file: req.file
        });
    } catch (error) {
        return next(error);
    }
});

export default router;
