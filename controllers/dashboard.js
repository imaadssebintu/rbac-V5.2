import User from '../models/user.js';
import Task from '../models/task.js';
import Payment from '../models/payment.js';
import Message from '../models/message.js';
import { Op, fn, col, literal } from 'sequelize';
import Role from '../models/role.js';
import Announcement from '../models/announcement.js';
import AuditLog from '../models/auditLog.js';
import sequelize from '../db.js';

class DashboardController {
    static async getAdminDashboard(req, res, next) {
        try {
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            const [
                userStats,
                taskStats,
                paymentStats,
                recentUsers,
                recentTasks,
                recentPayments,
                roleDistribution,
                awaitingPayoutTrips
            ] = await Promise.all([
                // User statistics
                User.findAll({
                    attributes: [
                        [fn('COUNT', col('id')), 'total_users'],
                        [fn('COUNT', fn('DISTINCT', col('role_id'))), 'total_roles'],
                        [fn('SUM', literal("CASE WHEN is_active = true THEN 1 ELSE 0 END")), 'active_users'],
                        [fn('SUM', literal("CASE WHEN is_verified = true THEN 1 ELSE 0 END")), 'verified_users'],
                        [fn('SUM', 'wallet_balance'), 'total_wallet_balance']
                    ],
                    raw: true
                }),

                // Task statistics
                Task.findAll({
                    where: {
                        created_at: { [Op.gte]: thirtyDaysAgo }
                    },
                    attributes: [
                        [fn('COUNT', col('id')), 'total_tasks'],
                        [fn('SUM', col('price')), 'total_revenue'],
                        [fn('AVG', col('price')), 'avg_task_price'],
                        [fn('AVG', col('estimated_distance')), 'avg_distance'],
                        'status'
                    ],
                    group: ['status'],
                    raw: true
                }),

                // Payment statistics
                Payment.findAll({
                    where: {
                        created_at: { [Op.gte]: thirtyDaysAgo },
                        status: 'completed'
                    },
                    attributes: [
                        [fn('COUNT', col('id')), 'total_payments'],
                        [fn('SUM', col('amount')), 'total_amount'],
                        'payment_type',
                        'payment_method'
                    ],
                    group: ['payment_type', 'payment_method'],
                    raw: true
                }),

                // Recent users
                User.findAll({
                    limit: 10,
                    order: [['last_login', 'DESC'], ['created_at', 'DESC']],
                    include: [{
                        model: Role,
                        attributes: ['name']
                    }],
                    attributes: ['id', 'name', 'email', 'phone', 'created_at', 'last_login', 'is_active']
                }),

                // Recent tasks
                Task.findAll({
                    limit: 10,
                    order: [['created_at', 'DESC']],
                    include: [
                        {
                            model: User,
                            as: 'Walkee',
                            attributes: ['name', 'email', 'phone']
                        },
                        {
                            model: User,
                            as: 'Walker',
                            attributes: ['name', 'email', 'phone']
                        }
                    ]
                }),

                // Recent payments
                Payment.findAll({
                    limit: 10,
                    order: [['created_at', 'DESC']],
                    include: [{
                        model: User,
                        attributes: ['name', 'email']
                    }]
                }),

                // Role distribution
                User.findAll({
                    attributes: [
                        [col('Role.name'), 'role'],
                        [fn('COUNT', col('User.id')), 'count']
                    ],
                    include: [{
                        model: Role,
                        attributes: []
                    }],
                    group: ['role_id'],
                    raw: true
                }),
                Task.findAll({
                    where: { status: 'awaiting_payout' },
                    order: [['updated_at', 'DESC']],
                    include: [
                        {
                            model: User,
                            as: 'Walkee',
                            attributes: ['id', 'name', 'phone']
                        },
                        {
                            model: User,
                            as: 'Walker',
                            attributes: ['id', 'name', 'phone']
                        }
                    ]
                })
            ]);

            // Process stats
            const summary = {
                totalUsers: parseInt(userStats[0]?.total_users || 0),
                activeUsers: parseInt(userStats[0]?.active_users || 0),
                verifiedUsers: parseInt(userStats[0]?.verified_users || 0),
                totalWalletBalance: parseFloat(userStats[0]?.total_wallet_balance || 0)
            };

            const tasks = {
                byStatus: {},
                totalRevenue: 0
            };

            taskStats.forEach(stat => {
                tasks.byStatus[stat.status] = {
                    count: parseInt(stat.total_tasks),
                    revenue: parseFloat(stat.total_revenue || 0),
                    avgPrice: parseFloat(stat.avg_task_price || 0),
                    avgDistance: parseFloat(stat.avg_distance || 0)
                };
                tasks.totalRevenue += parseFloat(stat.total_revenue || 0);
            });

            const payments = {
                byType: {},
                totalAmount: 0
            };

            paymentStats.forEach(stat => {
                const key = `${stat.payment_type}_${stat.payment_method}`;
                payments.byType[key] = {
                    count: parseInt(stat.total_payments),
                    amount: parseFloat(stat.total_amount || 0)
                };
                payments.totalAmount += parseFloat(stat.total_amount || 0);
            });

            const dashboardData = {
                summary,
                tasks,
                payments,
                recent: {
                    users: recentUsers,
                    tasks: recentTasks,
                    payments: recentPayments
                },
                awaitingPayoutTrips,
                roleDistribution: roleDistribution.map(r => ({
                    role: r.role,
                    count: parseInt(r.count)
                }))
            };

            res.json({
                success: true,
                dashboard: dashboardData
            });
        } catch (error) {
            next(error);
        }
    }

    static async getWalkerDashboard(req, res, next) {
        try {
            const { user_id } = req.query;
            const walkerId = user_id || req.user?.id;

            if (!walkerId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID is required'
                });
            }

            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            const [
                taskStats,
                earningsStats,
                upcomingTasks,
                recentCompleted,
                userInfo,
                ratings
            ] = await Promise.all([
                // Task statistics
                Task.findAll({
                    where: {
                        walker_id: walkerId,
                        created_at: { [Op.gte]: thirtyDaysAgo }
                    },
                    attributes: [
                        [fn('COUNT', col('id')), 'total_tasks'],
                        [fn('SUM', col('price')), 'total_earnings'],
                        [fn('AVG', col('price')), 'avg_earning'],
                        [fn('AVG', col('walker_rating')), 'avg_rating'],
                        'status'
                    ],
                    group: ['status'],
                    raw: true
                }),

                // Earnings by day (last 7 days)
                Task.findAll({
                    where: {
                        walker_id: walkerId,
                        status: 'completed',
                        completed_at: {
                            [Op.gte]: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
                            [Op.lte]: now
                        }
                    },
                    attributes: [
                        [fn('DATE', col('completed_at')), 'date'],
                        [fn('COUNT', col('id')), 'task_count'],
                        [fn('SUM', col('price')), 'daily_earnings'],
                        [fn('AVG', col('walker_rating')), 'daily_avg_rating']
                    ],
                    group: [fn('DATE', col('completed_at'))],
                    order: [[fn('DATE', col('completed_at')), 'DESC']],
                    limit: 7,
                    raw: true
                }),

                // Upcoming tasks
                Task.findAll({
                    where: {
                        walker_id: walkerId,
                        status: 'active'
                    },
                    order: [['updated_at', 'DESC']],
                    include: [{
                        model: User,
                        as: 'Walkee',
                        attributes: ['id', 'name', 'phone', 'profile_image', 'location']
                    }]
                }),

                // Recently completed tasks
                Task.findAll({
                    where: {
                        walker_id: walkerId,
                        status: 'completed',
                        completed_at: { [Op.gte]: thirtyDaysAgo }
                    },
                    order: [['completed_at', 'DESC']],
                    limit: 5,
                    include: [{
                        model: User,
                        as: 'Walkee',
                        attributes: ['id', 'name', 'profile_image']
                    }],
                    attributes: ['id', 'description', 'price', 'walker_rating', 'completed_at', 'actual_distance']
                }),

                // User info
                User.findByPk(walkerId, {
                    attributes: ['id', 'name', 'email', 'wallet_balance', 'preferred_currency', 'profile_image', 'location', 'created_at']
                }),

                // Rating breakdown
                Task.findAll({
                    where: {
                        walker_id: walkerId,
                        walker_rating: { [Op.ne]: null }
                    },
                    attributes: [
                        'walker_rating',
                        [fn('COUNT', col('id')), 'count']
                    ],
                    group: ['walker_rating'],
                    order: [['walker_rating', 'DESC']],
                    raw: true
                })
            ]);

            // Calculate summary
            const summary = {
                totalTasks: taskStats.reduce((sum, stat) => sum + parseInt(stat.total_tasks || 0), 0),
                totalEarnings: taskStats.reduce((sum, stat) => sum + parseFloat(stat.total_earnings || 0), 0),
                avgRating: parseFloat(taskStats.find(stat => stat.avg_rating)?.avg_rating || 0).toFixed(1),
                completedTasks: parseInt(taskStats.find(stat => stat.status === 'completed')?.total_tasks || 0),
                pendingTasks: parseInt(taskStats.find(stat => stat.status === 'assigned')?.total_tasks || 0),
                inProgressTasks: parseInt(taskStats.find(stat => stat.status === 'in_progress')?.total_tasks || 0),
                avgEarningPerTask: parseFloat(taskStats.find(stat => stat.avg_earning)?.avg_earning || 0).toFixed(2)
            };

            // Process earnings chart data
            const earningsChart = earningsStats.map(stat => ({
                date: stat.date,
                taskCount: parseInt(stat.task_count || 0),
                earnings: parseFloat(stat.daily_earnings || 0),
                avgRating: parseFloat(stat.daily_avg_rating || 0).toFixed(1)
            }));

            // Process rating distribution
            const ratingDistribution = Array(5).fill(0).map((_, index) => {
                const rating = 5 - index;
                const ratingStat = ratings.find(r => parseInt(r.walker_rating) === rating);
                return {
                    rating,
                    count: ratingStat ? parseInt(ratingStat.count) : 0
                };
            });

            const dashboardData = {
                user: userInfo,
                summary,
                earningsChart,
                activeTrips: upcomingTasks,
                upcomingTasks,
                recentCompleted,
                ratingDistribution,
                analytics: {
                    totalDistance: recentCompleted.reduce((sum, task) => sum + parseFloat(task.actual_distance || 0), 0),
                    totalHours: recentCompleted.reduce((sum, task) => sum + parseFloat(task.actual_duration || 0) / 60, 0)
                }
            };

            res.json({
                success: true,
                dashboard: dashboardData
            });
        } catch (error) {
            next(error);
        }
    }

    static async getWalkeeDashboard(req, res, next) {
        try {
            const { user_id } = req.query;
            const walkeeId = user_id || req.user?.id;

            if (!walkeeId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID is required'
                });
            }

            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            const [
                taskStats,
                spendingStats,
                activeTasks,
                recentTasks,
                userInfo,
                walkerRatings
            ] = await Promise.all([
                // Task statistics
                Task.findAll({
                    where: {
                        walkee_id: walkeeId,
                        created_at: { [Op.gte]: thirtyDaysAgo }
                    },
                    attributes: [
                        [fn('COUNT', col('id')), 'total_tasks'],
                        [fn('SUM', col('price')), 'total_spent'],
                        [fn('AVG', col('price')), 'avg_cost'],
                        [fn('AVG', col('walkee_rating')), 'avg_rating'],
                        'status'
                    ],
                    group: ['status'],
                    raw: true
                }),

                // Spending by day (last 7 days)
                Task.findAll({
                    where: {
                        walkee_id: walkeeId,
                        status: 'completed',
                        completed_at: {
                            [Op.gte]: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
                            [Op.lte]: now
                        }
                    },
                    attributes: [
                        [fn('DATE', col('completed_at')), 'date'],
                        [fn('COUNT', col('id')), 'task_count'],
                        [fn('SUM', col('price')), 'daily_spent'],
                        [fn('AVG', col('walkee_rating')), 'daily_avg_rating']
                    ],
                    group: [fn('DATE', col('completed_at'))],
                    order: [[fn('DATE', col('completed_at')), 'DESC']],
                    limit: 7,
                    raw: true
                }),

                // Active tasks
                Task.findAll({
                    where: {
                        walkee_id: walkeeId,
                        status: { [Op.in]: ['assigned', 'in_progress', 'pending'] }
                    },
                    order: [['scheduled_time', 'ASC']],
                    limit: 5,
                    include: [{
                        model: User,
                        as: 'Walker',
                        attributes: ['id', 'name', 'phone', 'profile_image', 'location', 'walker_rating']
                    }]
                }),

                // Recent tasks
                Task.findAll({
                    where: {
                        walkee_id: walkeeId,
                        created_at: { [Op.gte]: thirtyDaysAgo }
                    },
                    order: [['created_at', 'DESC']],
                    limit: 10,
                    include: [{
                        model: User,
                        as: 'Walker',
                        attributes: ['id', 'name', 'profile_image']
                    }]
                }),

                // User info
                User.findByPk(walkeeId, {
                    attributes: ['id', 'name', 'email', 'wallet_balance', 'preferred_currency', 'profile_image', 'location', 'created_at']
                }),

                // Walker ratings given
                Task.findAll({
                    where: {
                        walkee_id: walkeeId,
                        walkee_rating: { [Op.ne]: null }
                    },
                    attributes: [
                        'walkee_rating',
                        [fn('COUNT', col('id')), 'count']
                    ],
                    group: ['walkee_rating'],
                    order: [['walkee_rating', 'DESC']],
                    raw: true
                })
            ]);

            // Calculate summary
            const summary = {
                totalTasks: taskStats.reduce((sum, stat) => sum + parseInt(stat.total_tasks || 0), 0),
                totalSpent: taskStats.reduce((sum, stat) => sum + parseFloat(stat.total_spent || 0), 0),
                avgRating: parseFloat(taskStats.find(stat => stat.avg_rating)?.avg_rating || 0).toFixed(1),
                completedTasks: parseInt(taskStats.find(stat => stat.status === 'completed')?.total_tasks || 0),
                pendingTasks: parseInt(taskStats.find(stat => stat.status === 'pending')?.total_tasks || 0),
                cancelledTasks: parseInt(taskStats.find(stat => stat.status === 'cancelled')?.total_tasks || 0),
                avgCostPerTask: parseFloat(taskStats.find(stat => stat.avg_cost)?.avg_cost || 0).toFixed(2)
            };

            // Process spending chart data
            const spendingChart = spendingStats.map(stat => ({
                date: stat.date,
                taskCount: parseInt(stat.task_count || 0),
                spent: parseFloat(stat.daily_spent || 0),
                avgRating: parseFloat(stat.daily_avg_rating || 0).toFixed(1)
            }));

            // Process rating distribution
            const ratingDistribution = Array(5).fill(0).map((_, index) => {
                const rating = 5 - index;
                const ratingStat = walkerRatings.find(r => parseInt(r.walkee_rating) === rating);
                return {
                    rating,
                    count: ratingStat ? parseInt(ratingStat.count) : 0
                };
            });

            const dashboardData = {
                user: userInfo,
                summary,
                spendingChart,
                activeTasks,
                recentTasks,
                ratingDistribution,
                analytics: {
                    favoriteWalkers: recentTasks.reduce((acc, task) => {
                        if (task.Walker) {
                            const walkerId = task.Walker.id;
                            acc[walkerId] = (acc[walkerId] || 0) + 1;
                        }
                        return acc;
                    }, {}),
                    mostCommonTime: this.calculateMostCommonTime(recentTasks)
                }
            };

            res.json({
                success: true,
                dashboard: dashboardData
            });
        } catch (error) {
            next(error);
        }
    }

    static calculateMostCommonTime(tasks) {
        if (!tasks || tasks.length === 0) return 'Not enough data';

        const hourCounts = {};
        tasks.forEach(task => {
            const hour = new Date(task.scheduled_time).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        const mostCommonHour = Object.entries(hourCounts).reduce((a, b) =>
            a[1] > b[1] ? a : b
        )[0];

        return `${mostCommonHour}:00 - ${parseInt(mostCommonHour) + 1}:00`;
    }

    static async getUserStats(req, res, next) {
        try {
            const { user_id } = req.params;

            const user = await User.findByPk(user_id, {
                include: [{
                    model: Role,
                    attributes: ['name']
                }]
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            let stats = {
                user: {
                    name: user.name,
                    email: user.email,
                    role: user.Role.name,
                    joinDate: user.created_at,
                    lastLogin: user.last_login,
                    walletBalance: user.wallet_balance,
                    currency: user.preferred_currency,
                    profileImage: user.profile_image,
                    isActive: user.is_active,
                    isVerified: user.is_verified
                }
            };

            // Get role-specific stats
            if (user.Role.name === 'Walker') {
                const [taskStats, paymentStats, ratingStats] = await Promise.all([
                    Task.findAll({
                        where: {
                            walker_id: user_id,
                            created_at: { [Op.gte]: thirtyDaysAgo }
                        },
                        attributes: [
                            [fn('COUNT', col('id')), 'total_tasks'],
                            [fn('SUM', col('price')), 'total_earnings'],
                            [fn('AVG', col('walker_rating')), 'avg_rating'],
                            [fn('SUM', col('actual_distance')), 'total_distance']
                        ],
                        raw: true
                    }),
                    Payment.findAll({
                        where: {
                            user_id,
                            payment_type: 'task_payment',
                            status: 'completed',
                            created_at: { [Op.gte]: thirtyDaysAgo }
                        },
                        attributes: [
                            [fn('COUNT', col('id')), 'total_payments'],
                            [fn('SUM', col('amount')), 'total_paid']
                        ],
                        raw: true
                    }),
                    Task.findAll({
                        where: {
                            walker_id: user_id,
                            walker_rating: { [Op.ne]: null }
                        },
                        attributes: [
                            [fn('AVG', col('walker_rating')), 'overall_rating'],
                            [fn('COUNT', col('id')), 'rated_tasks']
                        ],
                        raw: true
                    })
                ]);

                stats = {
                    ...stats,
                    performance: {
                        totalTasks: taskStats[0]?.total_tasks || 0,
                        totalEarnings: taskStats[0]?.total_earnings || 0,
                        avgRating: parseFloat(ratingStats[0]?.overall_rating || 0).toFixed(1),
                        totalDistance: taskStats[0]?.total_distance || 0,
                        totalPayments: paymentStats[0]?.total_payments || 0,
                        totalPaid: paymentStats[0]?.total_paid || 0,
                        ratedTasks: ratingStats[0]?.rated_tasks || 0
                    }
                };
            } else if (user.Role.name === 'Walkee') {
                const [taskStats, paymentStats, ratingStats] = await Promise.all([
                    Task.findAll({
                        where: {
                            walkee_id: user_id,
                            created_at: { [Op.gte]: thirtyDaysAgo }
                        },
                        attributes: [
                            [fn('COUNT', col('id')), 'total_tasks'],
                            [fn('SUM', col('price')), 'total_spent'],
                            [fn('AVG', col('walkee_rating')), 'avg_rating']
                        ],
                        raw: true
                    }),
                    Payment.findAll({
                        where: {
                            user_id,
                            payment_type: 'task_payment',
                            created_at: { [Op.gte]: thirtyDaysAgo }
                        },
                        attributes: [
                            [fn('COUNT', col('id')), 'total_payments'],
                            [fn('SUM', col('amount')), 'total_amount']
                        ],
                        raw: true
                    }),
                    Task.findAll({
                        where: {
                            walkee_id: user_id,
                            walkee_rating: { [Op.ne]: null }
                        },
                        attributes: [
                            [fn('AVG', col('walkee_rating')), 'overall_rating'],
                            [fn('COUNT', col('id')), 'rated_tasks']
                        ],
                        raw: true
                    })
                ]);

                stats = {
                    ...stats,
                    performance: {
                        totalTasks: taskStats[0]?.total_tasks || 0,
                        totalSpent: taskStats[0]?.total_spent || 0,
                        avgRating: parseFloat(ratingStats[0]?.overall_rating || 0).toFixed(1),
                        totalPayments: paymentStats[0]?.total_payments || 0,
                        totalAmount: paymentStats[0]?.total_amount || 0,
                        ratedTasks: ratingStats[0]?.rated_tasks || 0
                    }
                };
            } else if (user.Role.name === 'Admin') {
                // Admin stats
                const [userCount, taskCount, paymentCount] = await Promise.all([
                    User.count(),
                    Task.count(),
                    Payment.count()
                ]);

                stats = {
                    ...stats,
                    adminStats: {
                        totalUsers: userCount,
                        totalTasks: taskCount,
                        totalPayments: paymentCount,
                        systemHealth: 'Good'
                    }
                };
            }

            res.json({
                success: true,
                stats
            });
        } catch (error) {
            next(error);
        }
    }

    static async getLogs(req, res, next) {
        try {
            const logs = await AuditLog.findAll({
                limit: 50,
                order: [['created_at', 'DESC']]
            });
            res.json({ logs });
        } catch (error) {
            next(error);
        }
    }

    static async createAnnouncement(req, res, next) {
        try {
            const { title, message, type, target_role, expires_at } = req.body;
            const normalizedTargetRole = (target_role || 'all').toLowerCase();
            const announcement = await Announcement.create({
                title,
                message,
                type: type || 'info',
                target_role: normalizedTargetRole,
                expires_at
            });

            let recipients = [];
            if (normalizedTargetRole === 'all') {
                recipients = await User.findAll({
                    where: { is_active: true },
                    attributes: ['id']
                });
            } else {
                const roleName = normalizedTargetRole.charAt(0).toUpperCase() + normalizedTargetRole.slice(1);
                const role = await Role.findOne({ where: { name: roleName } });
                if (role) {
                    recipients = await User.findAll({
                        where: { role_id: role.id, is_active: true },
                        attributes: ['id']
                    });
                }
            }

            if (recipients.length > 0) {
                await Message.bulkCreate(
                    recipients.map((recipient) => ({
                        sender_id: req.user?.id,
                        receiver_id: recipient.id,
                        content: `${title}: ${message}`,
                        message_type: 'system_alert',
                        role_filter: normalizedTargetRole === 'all' ? null : normalizedTargetRole,
                        is_read: false,
                        metadata: {
                            announcement_id: announcement.id,
                            title,
                            type: type || 'info',
                            target_role: normalizedTargetRole
                        }
                    }))
                );
            }

            const io = req.app.get('io');
            if (io) {
                const payload = {
                    id: announcement.id,
                    title: announcement.title,
                    message: announcement.message,
                    type: announcement.type,
                    target_role: announcement.target_role,
                    created_at: announcement.createdAt
                };

                recipients.forEach((recipient) => {
                    io.to(`user:${recipient.id}`).emit('system_notification', payload);
                    io.to(`user:${recipient.id}`).emit('new_message', {
                        sender_id: req.user?.id,
                        receiver_id: recipient.id,
                        content: `${title}: ${message}`,
                        message_type: 'system_alert',
                        createdAt: announcement.createdAt,
                        is_read: false,
                        metadata: {
                            announcement_id: announcement.id,
                            title,
                            type: type || 'info',
                            target_role: normalizedTargetRole
                        },
                        conversationId: String(req.user?.id || recipient.id)
                    });
                });
            }
            
            // Log the action
            await AuditLog.create({
                action: 'CREATE_ANNOUNCEMENT',
                details: `Created announcement: ${title}`,
                user_id: req.user?.id,
                severity: 'info'
            });

            res.status(201).json({
                message: 'Announcement created successfully',
                announcement,
                delivered_to: recipients.length
            });
        } catch (error) {
            next(error);
        }
    }

    static async getAnnouncements(req, res, next) {
        try {
            const announcements = await Announcement.findAll({
                where: {
                    is_active: true,
                    [Op.or]: [
                        { expires_at: null },
                        { expires_at: { [Op.gt]: new Date() } }
                    ]
                },
                order: [['created_at', 'DESC']]
            });
            res.json({ announcements });
        } catch (error) {
            next(error);
        }
    }

    static async getAnnouncementsForUser(req, res, next) {
        try {
            const role = (req.user?.Role?.name || '').toLowerCase();
            const announcements = await Announcement.findAll({
                where: {
                    is_active: true,
                    [Op.and]: [
                        {
                            [Op.or]: [
                                { target_role: 'all' },
                                { target_role: role }
                            ]
                        },
                        {
                            [Op.or]: [
                                { expires_at: null },
                                { expires_at: { [Op.gt]: new Date() } }
                            ]
                        }
                    ]
                },
                order: [['created_at', 'DESC']]
            });

            res.json({ announcements });
        } catch (error) {
            next(error);
        }
    }

    static async backupDatabase(req, res, next) {
        try {
            const generatedAt = new Date();
            const [users, tasks, payments, messages, roles, announcements, auditLogs] = await Promise.all([
                User.findAll({ raw: true }),
                Task.findAll({ raw: true }),
                Payment.findAll({ raw: true }),
                Message.findAll({ raw: true }),
                Role.findAll({ raw: true }),
                Announcement.findAll({ raw: true }),
                AuditLog.findAll({
                    order: [['created_at', 'DESC']],
                    limit: 5000,
                    raw: true
                })
            ]);

            const backupPayload = {
                meta: {
                    generated_at: generatedAt.toISOString(),
                    generated_by: req.user?.email || req.user?.id || 'admin',
                    dialect: sequelize.getDialect(),
                    note: 'Application-level JSON backup generated from Sequelize models.'
                },
                counts: {
                    users: users.length,
                    tasks: tasks.length,
                    payments: payments.length,
                    messages: messages.length,
                    roles: roles.length,
                    announcements: announcements.length,
                    audit_logs: auditLogs.length
                },
                data: {
                    users,
                    tasks,
                    payments,
                    messages,
                    roles,
                    announcements,
                    audit_logs: auditLogs
                }
            };

            const timestamp = generatedAt.toISOString().replace(/[:.]/g, '-');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="voya-backup-${timestamp}.json"`);
            return res.status(200).send(JSON.stringify(backupPayload, null, 2));
        } catch (error) {
            next(error);
        }
    }
}

export default DashboardController;

