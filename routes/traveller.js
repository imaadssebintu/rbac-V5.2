import express from 'express';
import TravellerController from '../controllers/traveller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.get('/analytics', authorize(['Walkee', 'Admin']), TravellerController.getAnalytics);

export default router;
