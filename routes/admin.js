import express from 'express';
import AdminController from '../controllers/admin.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, authorize(['Admin']));
router.patch('/verify-guide/:id', AdminController.verifyGuide);

export default router;
