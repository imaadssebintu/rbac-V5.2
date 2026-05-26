import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { safeCertificateUpload } from '../middleware/certificateUpload.js';
import certificateController from '../controllers/certificate.js';

const router = express.Router();

// User routes (authenticated users)
router.post('/upload', authenticate, safeCertificateUpload, certificateController.uploadCertificate);
router.get('/my', authenticate, certificateController.getUserCertificates);
router.get('/:id', authenticate, certificateController.getCertificateById);

// Admin routes
router.get('/', authenticate, certificateController.getAllCertificates);
router.get('/pending/count', authenticate, certificateController.getPendingCertificatesCount);
router.put('/:id/verify', authenticate, certificateController.verifyCertificate);
router.delete('/:id', authenticate, certificateController.deleteCertificate);

export default router;