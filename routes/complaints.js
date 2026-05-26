import express from 'express';
import ComplaintController from '../controllers/complaint.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, authorize(['Walker', 'Walkee', 'Admin']), ComplaintController.createComplaint);

export default router;