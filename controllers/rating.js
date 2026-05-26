import { Op, fn, col } from 'sequelize';
import Rating from '../models/rating.js';
import User from '../models/user.js';
import Task from '../models/task.js';

class RatingController {
    static async submitRating(req, res, next) {
        try {
            const { walkerId, userId, taskId, rating, review = '' } = req.body;
            const requesterId = req.user?.id;
            const effectiveUserId = userId || requesterId;

            if (!effectiveUserId || !walkerId || !rating) {
                return res.status(400).json({
                    success: false,
                    message: 'walkerId, userId, and rating are required'
                });
            }

            if (requesterId && String(requesterId) !== String(effectiveUserId)) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only submit your own rating'
                });
            }

            const numericRating = Number(rating);
            if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Rating must be between 1 and 5'
                });
            }

            const traveler = await User.findByPk(effectiveUserId);
            const walker = await User.findByPk(walkerId);

            if (!traveler || !walker) {
                return res.status(404).json({
                    success: false,
                    message: 'User or guide not found'
                });
            }

            if (taskId) {
                const task = await Task.findByPk(taskId);
                if (!task) {
                    return res.status(404).json({
                        success: false,
                        message: 'Task not found'
                    });
                }

                if (String(task.walkee_id) !== String(effectiveUserId) || String(task.walker_id) !== String(walkerId)) {
                    return res.status(403).json({
                        success: false,
                        message: 'This rating does not match the trip participants'
                    });
                }
            }

            const [ratingRecord, created] = await Rating.findOrCreate({
                where: {
                    user_id: effectiveUserId,
                    walker_id: walkerId,
                    task_id: taskId || null
                },
                defaults: {
                    user_id: effectiveUserId,
                    walker_id: walkerId,
                    task_id: taskId || null,
                    rating: numericRating,
                    review: String(review || '').trim()
                }
            });

            if (!created) {
                await ratingRecord.update({
                    rating: numericRating,
                    review: String(review || '').trim()
                });
            }

            if (taskId) {
                const task = await Task.findByPk(taskId);
                if (task) {
                    await task.update({
                        walkee_rating: numericRating
                    });
                }
            }

            return res.status(created ? 201 : 200).json({
                success: true,
                message: created ? 'Rating submitted successfully' : 'Rating updated successfully',
                rating: ratingRecord
            });
        } catch (error) {
            next(error);
        }
    }

    static async getWalkerRatings(req, res, next) {
        try {
            const { walkerId } = req.params;

            const walker = await User.findByPk(walkerId, { attributes: ['id', 'name', 'profile_image'] });
            if (!walker) {
                return res.status(404).json({
                    success: false,
                    message: 'Guide not found'
                });
            }

            const reviews = await Rating.findAll({
                where: { walker_id: walkerId },
                order: [['createdAt', 'DESC']],
                include: [
                    { model: User, as: 'Rater', attributes: ['id', 'name', 'profile_image'] },
                    { model: Task, as: 'Task', attributes: ['id', 'description', 'status'] }
                ]
            });

            const total = reviews.length;
            const sum = reviews.reduce((acc, item) => acc + Number(item.rating || 0), 0);
            const average = total > 0 ? Number((sum / total).toFixed(1)) : 0;
            const distribution = [5, 4, 3, 2, 1].map((star) =>
                reviews.filter((item) => Number(item.rating) === star).length
            );

            return res.json({
                success: true,
                stats: {
                    average,
                    total,
                    distribution
                },
                reviews: reviews.map((review) => ({
                    id: review.id,
                    rating: review.rating,
                    review: review.review,
                    createdAt: review.createdAt,
                    user: {
                        id: review.Rater?.id,
                        name: review.Rater?.name,
                        profilePicture: review.Rater?.profile_image
                    },
                    task: review.Task ? {
                        id: review.Task.id,
                        description: review.Task.description,
                        status: review.Task.status
                    } : null
                }))
            });
        } catch (error) {
            next(error);
        }
    }

    static async getWalkerReviewList(req, res, next) {
        try {
            const { walkerId } = req.params;
            const reviews = await Rating.findAll({
                where: { walker_id: walkerId },
                order: [['createdAt', 'DESC']],
                include: [{ model: User, as: 'Rater', attributes: ['id', 'name', 'profile_image'] }]
            });

            return res.json({
                success: true,
                reviews: reviews.map((review) => ({
                    id: review.id,
                    rating: review.rating,
                    review: review.review,
                    createdAt: review.createdAt,
                    user: {
                        id: review.Rater?.id,
                        name: review.Rater?.name,
                        profilePicture: review.Rater?.profile_image
                    }
                }))
            });
        } catch (error) {
            next(error);
        }
    }
}

export default RatingController;
