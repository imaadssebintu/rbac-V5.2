import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure certificates upload directory exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'certifications');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const safeDate = new Date().toISOString().replace(/:/g, '-');
        const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `cert-${safeDate}-${safeOriginalName}`);
    }
});

// File filter for PDFs and images
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, JPG, PNG, GIF, and WEBP are allowed.'), false);
    }
};

// Create multer instance
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Safety wrapper to prevent crashes
export const safeCertificateUpload = (req, res, next) => {
    upload.single('certificate')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: `Multer Error: ${err.message}`
            });
        }

        if (err) {
            return res.status(500).json({
                success: false,
                message: `Upload Error: ${err.message}`
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No certificate file uploaded. Use field name "certificate".'
            });
        }

        // Log uploaded file to verify it reached server
        console.log('[Certificate Upload Success] req.file =', req.file);
        next();
    });
};

export default upload;