import express from 'express';
import RatingController from '../controllers/rating.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.post('/', RatingController.submitRating);
router.get('/walker/:walkerId', RatingController.getWalkerRatings);
router.get('/walker/:walkerId/reviews', RatingController.getWalkerReviewList);

export default router;
