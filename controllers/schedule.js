import Schedule from '../models/schedule.js';
import User from '../models/user.js';
import { Op } from 'sequelize';

class ScheduleController {
    static async createSchedule(req, res, next) {
        try {
            const { title, description, startTime, endTime, location, userId } = req.body;
            
            // Validate dates
            if (new Date(startTime) >= new Date(endTime)) {
                return res.status(400).json({ success: false, message: 'End time must be after start time' });
            }

            const schedule = await Schedule.create({
                title,
                description,
                startTime,
                endTime,
                location,
                user_id: userId || req.user.id, // Support creating for self or others if needed
                status: 'pending'
            });

            res.status(201).json({
                success: true,
                message: 'Schedule created successfully',
                schedule
            });
        } catch (error) {
            next(error);
        }
    }

    static async getSchedules(req, res, next) {
        try {
            const { user_id } = req.params;
            const { date } = req.query;

            const where = { user_id };
            
            if (date) {
                const queryDate = new Date(date);
                const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
                const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
                
                where.startTime = {
                    [Op.between]: [startOfDay, endOfDay]
                };
            }

            const schedules = await Schedule.findAll({
                where,
                order: [['startTime', 'ASC']],
                include: [
                    { model: User, as: 'Walker', attributes: ['name', 'id'] }
                ]
            });

            res.json({
                success: true,
                schedules
            });
        } catch (error) {
            next(error);
        }
    }

    static async updateSchedule(req, res, next) {
        try {
            const { id } = req.params;
            const updates = req.body;
            
            const schedule = await Schedule.findByPk(id);
            if (!schedule) {
                return res.status(404).json({ success: false, message: 'Schedule not found' });
            }

            await schedule.update(updates);

            res.json({
                success: true,
                message: 'Schedule updated',
                schedule
            });
        } catch (error) {
            next(error);
        }
    }

    static async deleteSchedule(req, res, next) {
        try {
            const { id } = req.params;
            const schedule = await Schedule.findByPk(id);
            
            if (!schedule) {
                return res.status(404).json({ success: false, message: 'Schedule not found' });
            }

            if (schedule.user_id !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }

            await schedule.destroy();
            res.json({ success: true, message: 'Schedule deleted' });
        } catch (error) {
            next(error);
        }
    }
}

export default ScheduleController;