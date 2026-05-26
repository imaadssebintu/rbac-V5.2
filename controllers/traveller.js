import { fn, col } from 'sequelize';
import Task from '../models/task.js';
import Review from '../models/review.js';
import CoinLedger from '../models/coinLedger.js';
import Role from '../models/role.js';
import User from '../models/user.js';
import Message from '../models/message.js';

class TravellerController {
    static async notifyAdmins(req, content, metadata = {}) {
        const adminRole = await Role.findOne({ where: { name: 'Admin' } });
        if (!adminRole) {
            return;
        }

        const admins = await User.findAll({
            where: { role_id: adminRole.id, is_active: true },
            attributes: ['id']
        });

        const senderId = req.user?.id || null;
        await Promise.all(
            admins.map(async (admin) => {
                const message = await Message.create({
                    sender_id: senderId || admin.id,
                    receiver_id: admin.id,
                    content,
                    message_type: 'system_alert',
                    metadata,
                    is_read: false
                });

                const io = req.app.get('io');
                if (io) {
                    io.to(`user:${admin.id}`).emit('new_message', {
                        ...message.toJSON(),
                        conversationId: String(senderId || admin.id)
                    });
                    io.to('role:admin').emit('task_update', {
                        taskId: metadata?.task_id || null,
                        type: metadata?.event || 'trip_update',
                        content
                    });
                }
            })
        );
    }

    static async getAnalytics(req, res, next) {
        try {
            const travellerId = req.user?.id;
            if (!travellerId) {
                return res.status(401).json({ success: false, message: 'Authentication required' });
            }

            const [totalTripsTaken, totalCoinsEarned, reviewStats] = await Promise.all([
                Task.count({
                    where: {
                        walkee_id: travellerId,
                        status: 'completed'
                    }
                }),
                CoinLedger.sum('amount', {
                    where: {
                        user_id: travellerId,
                        amount: {
                            gt: 0
                        }
                    }
                }),
                Review.findOne({
                    where: { travellerId },
                    attributes: [
                        [fn('AVG', col('rating')), 'averageRatingGiven'],
                        [fn('COUNT', col('id')), 'ratingsCount']
                    ],
                    raw: true
                })
            ]);

            return res.json({
                success: true,
                analytics: {
                    totalTripsTaken: Number(totalTripsTaken || 0),
                    totalCoinsEarned: Number(totalCoinsEarned || 0),
                    averageRatingGiven: Number(reviewStats?.averageRatingGiven || 0),
                    ratingsCount: Number(reviewStats?.ratingsCount || 0)
                }
            });
        } catch (error) {
            return next(error);
        }
    }

    static async rateTrip(req, res, next) {
        try {
            const travellerId = req.user?.id;
            const { id: tripId } = req.params;
            const { rating, comment } = req.body;

            const numericRating = Number(rating);
            if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
                return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
            }

            const trip = await Task.findByPk(tripId);
            if (!trip) {
                return res.status(404).json({ success: false, message: 'Trip not found' });
            }

            if (String(trip.walkee_id) !== String(travellerId)) {
                return res.status(403).json({ success: false, message: 'You can only rate your own trips' });
            }

            if (trip.status !== 'completed') {
                return res.status(400).json({ success: false, message: 'Trip must be completed before rating' });
            }

            if (!trip.walker_id) {
                return res.status(400).json({ success: false, message: 'Trip has no assigned guide to rate' });
            }

            const [review, created] = await Review.findOrCreate({
                where: {
                    travellerId,
                    tripId
                },
                defaults: {
                    travellerId,
                    guideId: trip.walker_id,
                    tripId,
                    rating: numericRating,
                    comment: comment ? String(comment).trim() : null
                }
            });

            if (!created) {
                await review.update({
                    rating: numericRating,
                    comment: comment ? String(comment).trim() : null,
                    guideId: trip.walker_id
                });
            }

            await trip.update({
                walkee_rating: numericRating
            });

            return res.status(created ? 201 : 200).json({
                success: true,
                message: created ? 'Review submitted successfully' : 'Review updated successfully',
                review
            });
        } catch (error) {
            return next(error);
        }
    }

    static async updateUpcomingTrip(req, res, next) {
        try {
            const travellerId = req.user?.id;
            const { id: tripId } = req.params;
            const { scheduled_time, scheduledTime, date, notes } = req.body;

            if (!travellerId) {
                return res.status(401).json({ success: false, message: 'Authentication required' });
            }

            const trip = await Task.findByPk(tripId);
            if (!trip) {
                return res.status(404).json({ success: false, message: 'Trip not found' });
            }

            if (String(trip.walkee_id) !== String(travellerId)) {
                return res.status(403).json({ success: false, message: 'You can only edit your own trips' });
            }

            if (String(trip.status || '').toLowerCase() !== 'pending') {
                return res.status(400).json({ success: false, message: 'Only pending trips can be edited' });
            }

            const nextScheduledTime = scheduled_time || scheduledTime || date;
            const updates = {};

            if (nextScheduledTime) {
                const parsedTime = new Date(nextScheduledTime);
                if (Number.isNaN(parsedTime.getTime())) {
                    return res.status(400).json({ success: false, message: 'Please provide a valid trip date' });
                }
                updates.scheduled_time = parsedTime;
            }

            if (notes !== undefined) {
                const nextNotes = String(notes || '').trim();
                updates.notes = nextNotes || null;
            }

            if (!Object.keys(updates).length) {
                return res.status(400).json({ success: false, message: 'Provide a date or notes to update' });
            }

            await trip.update(updates);

            const io = req.app.get('io');
            if (io) {
                const payload = {
                    taskId: trip.id,
                    type: 'trip_updated',
                    message: 'Upcoming trip updated',
                    trip: trip.toJSON(),
                    createdAt: new Date().toISOString()
                };

                io.to(`user:${travellerId}`).emit('task_update', payload);
                if (trip.walker_id) {
                    io.to(`user:${trip.walker_id}`).emit('task_update', payload);
                }
                io.to('role:admin').emit('task_update', payload);
            }

            return res.json({
                success: true,
                message: 'Upcoming trip updated successfully',
                trip
            });
        } catch (error) {
            return next(error);
        }
    }

    static async completeTrip(req, res, next) {
        try {
            const travellerId = req.user?.id;
            const { id: tripId } = req.params;

            if (!travellerId) {
                return res.status(401).json({ success: false, message: 'Authentication required' });
            }

            const trip = await Task.findByPk(tripId);
            if (!trip) {
                return res.status(404).json({ success: false, message: 'Trip not found' });
            }

            if (String(trip.walkee_id) !== String(travellerId)) {
                return res.status(403).json({ success: false, message: 'You can only complete your own trips' });
            }

            if (!['active', 'assigned', 'in_progress', 'completed'].includes(String(trip.status || '').toLowerCase())) {
                return res.status(400).json({ success: false, message: 'Trip is not in a completable state' });
            }

            await trip.update({
                status: 'awaiting_payout'
            });

            await TravellerController.notifyAdmins(
                req,
                `Trip ${trip.id} has been completed by traveler and is awaiting payout.`,
                {
                    task_id: trip.id,
                    event: 'trip_awaiting_payout'
                }
            );

            return res.json({
                success: true,
                message: 'Trip marked as awaiting payout',
                trip
            });
        } catch (error) {
            return next(error);
        }
    }
}

export default TravellerController;
