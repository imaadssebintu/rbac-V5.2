import express from 'express';
import GuideController from '../controllers/guide.js';

const router = express.Router();

// Public guide directory
router.get('/', GuideController.listGuides);
router.get('/:id', GuideController.getGuideById);

export default router;
