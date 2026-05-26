import express from 'express';
import TravellerController from '../controllers/traveller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.post('/:id/rate', authorize(['Walkee', 'Admin']), TravellerController.rateTrip);
router.put('/:id', authorize(['Walkee', 'Admin']), TravellerController.updateUpcomingTrip);
router.post('/:id/completeTrip', authorize(['Walkee', 'Admin']), TravellerController.completeTrip);

export default router;
