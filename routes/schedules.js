import express from 'express';
import ScheduleController from '../controllers/schedule.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// List user's schedules (e.g. /api/schedules/user/:userId?date=...)
router.get('/user/:user_id', ScheduleController.getSchedules);

// Create new schedule
router.post('/', ScheduleController.createSchedule);

// Update/Delete
router.put('/:id', ScheduleController.updateSchedule);
router.delete('/:id', ScheduleController.deleteSchedule);

export default router;