import TaskController from './task.js';
import Task from '../models/task.js';

class ComplaintController {
    static async createComplaint(req, res, next) {
        try {
            const taskId = req.body.task_id || req.body.trip_id || req.params.id;

            if (!taskId) {
                return res.status(400).json({
                    success: false,
                    message: 'task_id is required'
                });
            }

            const task = await Task.findByPk(taskId);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
            }

            req.params = { ...req.params, id: taskId };
            req.body = {
                ...req.body,
                complaint: true
            };

            return TaskController.submitFeedback(req, res, next);
        } catch (error) {
            return next(error);
        }
    }
}

export default ComplaintController;