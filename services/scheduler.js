import cron from 'node-cron';
import { Op } from 'sequelize';

class Scheduler {
    constructor() {
        this.jobs = new Map();
        this.isRunning = false;
    }

    async start() {
        if (this.isRunning) {
            console.warn('Scheduler is already running');
            return;
        }

        console.log('🚀 Starting scheduler...');
        this.isRunning = true;

        try {
            // Schedule all jobs
            this.scheduleJobs();

            console.log('✅ Scheduler started successfully');
        } catch (error) {
            console.error('❌ Failed to start scheduler:', error);
            this.isRunning = false;
            throw error;
        }
    }

    scheduleJobs() {
        // Check for late walkers every 5 minutes
        this.scheduleJob('check_late_walkers', '*/5 * * * *', this.checkLateWalkers.bind(this));

        // Check for upcoming tasks every minute
        this.scheduleJob('check_upcoming_tasks', '* * * * *', this.checkUpcomingTasks.bind(this));

        // Process pending payments every 10 minutes
        this.scheduleJob('process_pending_payments', '*/10 * * * *', this.processPendingPayments.bind(this));

        // Send task reminders every hour
        this.scheduleJob('send_task_reminders', '0 * * * *', this.sendTaskReminders.bind(this));

        // Clean up old data daily at 3 AM
        this.scheduleJob('cleanup_old_data', '0 3 * * *', this.cleanupOldData.bind(this));

        // Send daily reports at 8 AM
        this.scheduleJob('send_daily_reports', '0 8 * * *', this.sendDailyReports.bind(this));

        // Backup database daily at 2 AM (simulated)
        this.scheduleJob('database_backup', '0 2 * * *', this.databaseBackup.bind(this));

        // Update walker ratings weekly on Sunday at midnight
        this.scheduleJob('update_walker_ratings', '0 0 * * 0', this.updateWalkerRatings.bind(this));

        // Process monthly payouts on the 1st of every month at 6 AM
        this.scheduleJob('monthly_payouts', '0 6 1 * *', this.processMonthlyPayouts.bind(this));

        // Health check every 30 minutes
        this.scheduleJob('health_check', '*/30 * * * *', this.healthCheck.bind(this));
    }

    scheduleJob(name, cronExpression, task) {
        try {
            const job = cron.schedule(cronExpression, async () => {
                console.log(`⏰ Running scheduled job: ${name}`);
                try {
                    await task();
                    console.log(`✅ Job completed: ${name}`);
                } catch (error) {
                    console.error(`❌ Job failed: ${name}`, error);
                }
            }, {
                scheduled: true,
                timezone: 'UTC'
            });

            this.jobs.set(name, job);
            console.log(`📅 Scheduled job: ${name} (${cronExpression})`);
        } catch (error) {
            console.error(`❌ Failed to schedule job ${name}:`, error);
        }
    }

    async checkLateWalkers() {
        try {
            const User = await import('../models/user.js').then(m => m.default);
            const Task = await import('../models/task.js').then(m => m.default);
            const notificationService = await import('./notification.js').then(m => m.default);

            const now = new Date();
            const lateThreshold = new Date(now.getTime() - 15 * 60000); // 15 minutes ago

            const lateTasks = await Task.findAll({
                where: {
                    status: 'assigned',
                    scheduled_time: {
                        [Op.lt]: lateThreshold
                    },
                    started_at: null
                },
                include: [
                    {
                        model: User,
                        as: 'Walker',
                        attributes: ['id', 'name', 'email', 'phone', 'notificationPreferences']
                    },
                    {
                        model: User,
                        as: 'Walkee',
                        attributes: ['id', 'name', 'email', 'phone', 'notificationPreferences']
                    }
                ]
            });

            console.log(`🔍 Found ${lateTasks.length} tasks with late walkers`);

            for (const task of lateTasks) {
                console.log(`⏰ Walker is late for task ${task.id}`);

                // Notify walker
                if (task.Walker) {
                    await notificationService.sendTaskNotification(task, 'walker_late');

                    // Send push notification
                    await notificationService.sendPushNotification(
                        task.Walker.id,
                        '⏰ You are Late!',
                        `You are late for a scheduled task. Please start immediately or contact the walkee.`,
                        { taskId: task.id, type: 'walker_late' }
                    );
                }

                // Notify walkee
                if (task.Walkee) {
                    await notificationService.sendPushNotification(
                        task.Walkee.id,
                        '⏰ Walker Running Late',
                        `Your walker is running late for the scheduled task. We have notified them.`,
                        { taskId: task.id, type: 'walker_late_notification' }
                    );
                }

                // Update task notes
                await task.update({
                    notes: `${task.notes || ''}\n[${now.toISOString()}] Walker was late - system notified`
                });

                // Check if this is the second late notification (30+ minutes late)
                const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60000);
                if (task.scheduled_time < thirtyMinutesAgo) {
                    console.log(`⚠️ Walker is 30+ minutes late for task ${task.id}`);

                    // Optionally reassign task or take other actions
                    if (task.Walkee) {
                        await notificationService.sendPushNotification(
                            task.Walkee.id,
                            '⚠️ Walker Severely Late',
                            `Your walker is over 30 minutes late. Would you like to cancel or reassign this task?`,
                            { taskId: task.id, type: 'severe_late', action: 'reassign_or_cancel' }
                        );
                    }
                }
            }

            return lateTasks.length;
        } catch (error) {
            console.error('Error checking late walkers:', error);
            throw error;
        }
    }

    async checkUpcomingTasks() {
        try {
            const Task = await import('../models/task.js').then(m => m.default);
            const User = await import('../models/user.js').then(m => m.default);
            const notificationService = await import('./notification.js').then(m => m.default);

            const now = new Date();
            const tenMinutesFromNow = new Date(now.getTime() + 10 * 60000);
            const oneHourFromNow = new Date(now.getTime() + 60 * 60000);

            // Tasks starting in 10 minutes
            const imminentTasks = await Task.findAll({
                where: {
                    status: 'assigned',
                    scheduled_time: {
                        [Op.between]: [now, tenMinutesFromNow]
                    }
                },
                include: [{
                    model: User,
                    as: 'Walker',
                    attributes: ['id', 'name', 'notificationPreferences']
                }]
            });

            // Tasks starting in 1 hour
            const upcomingTasks = await Task.findAll({
                where: {
                    status: 'assigned',
                    scheduled_time: {
                        [Op.between]: [tenMinutesFromNow, oneHourFromNow]
                    }
                },
                include: [{
                    model: User,
                    as: 'Walker',
                    attributes: ['id', 'name', 'notificationPreferences']
                }]
            });

            // Send imminent task notifications
            for (const task of imminentTasks) {
                if (task.Walker) {
                    await notificationService.sendPushNotification(
                        task.Walker.id,
                        '⏰ Task Starts Soon!',
                        `Your task starts in less than 10 minutes at ${new Date(task.scheduled_time).toLocaleTimeString()}`,
                        { taskId: task.id, type: 'imminent_task' }
                    );
                }
            }

            // Send upcoming task notifications (only if not already sent)
            for (const task of upcomingTasks) {
                const lastNotification = task.metadata?.lastUpcomingNotification;
                const oneHourBefore = new Date(task.scheduled_time.getTime() - 60 * 60000);

                if (!lastNotification || new Date(lastNotification) < oneHourBefore) {
                    if (task.Walker) {
                        await notificationService.sendPushNotification(
                            task.Walker.id,
                            '📅 Upcoming Task',
                            `You have a task in 1 hour at ${new Date(task.scheduled_time).toLocaleTimeString()}`,
                            { taskId: task.id, type: 'upcoming_task' }
                        );

                        // Update last notification time
                        await task.update({
                            metadata: {
                                ...task.metadata,
                                lastUpcomingNotification: now.toISOString()
                            }
                        });
                    }
                }
            }

            console.log(`📅 Checked upcoming tasks: ${imminentTasks.length} imminent, ${upcomingTasks.length} upcoming`);
            return { imminent: imminentTasks.length, upcoming: upcomingTasks.length };
        } catch (error) {
            console.error('Error checking upcoming tasks:', error);
            throw error;
        }
    }

    async processPendingPayments() {
        try {
            const Payment = await import('../models/payment.js').then(m => m.default);
            const notificationService = await import('./notification.js').then(m => m.default);

            const pendingPayments = await Payment.findAll({
                where: {
                    status: 'pending',
                    created_at: {
                        [Op.lt]: new Date(Date.now() - 30 * 60000) // Older than 30 minutes
                    }
                },
                limit: 50 // Process in batches
            });

            console.log(`💳 Processing ${pendingPayments.length} pending payments`);

            for (const payment of pendingPayments) {
                try {
                    // Simulate payment processing
                    const isSuccessful = Math.random() > 0.1; // 90% success rate

                    if (isSuccessful) {
                        await payment.update({
                            status: 'completed',
                            transaction_id: `TXN-${Date.now()}-${payment.id.substring(0, 8)}`
                        });

                        // Send success notification
                        await notificationService.sendPaymentNotification(payment);

                        console.log(`✅ Payment ${payment.id} processed successfully`);
                    } else {
                        await payment.update({
                            status: 'failed',
                            metadata: {
                                ...payment.metadata,
                                failureReason: 'Simulated payment failure',
                                retryCount: (payment.metadata?.retryCount || 0) + 1
                            }
                        });

                        console.log(`❌ Payment ${payment.id} failed`);
                    }
                } catch (error) {
                    console.error(`Error processing payment ${payment.id}:`, error);
                    await payment.update({
                        status: 'failed',
                        metadata: {
                            ...payment.metadata,
                            error: error.message
                        }
                    });
                }
            }

            return pendingPayments.length;
        } catch (error) {
            console.error('Error processing pending payments:', error);
            throw error;
        }
    }

    async sendTaskReminders() {
        try {
            const Task = await import('../models/task.js').then(m => m.default);
            const User = await import('../models/user.js').then(m => m.default);
            const notificationService = await import('./notification.js').then(m => m.default);

            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            // Tasks scheduled for tomorrow
            const tomorrowTasks = await Task.findAll({
                where: {
                    status: 'assigned',
                    scheduled_time: {
                        [Op.between]: [tomorrow, new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)]
                    }
                },
                include: [
                    {
                        model: User,
                        as: 'Walker',
                        attributes: ['id', 'name', 'email', 'notificationPreferences']
                    },
                    {
                        model: User,
                        as: 'Walkee',
                        attributes: ['id', 'name', 'email', 'notificationPreferences']
                    }
                ]
            });

            console.log(`🔔 Sending reminders for ${tomorrowTasks.length} tomorrow tasks`);

            for (const task of tomorrowTasks) {
                // Send reminder to walker
                if (task.Walker && task.Walker.notificationPreferences?.reminders !== false) {
                    await notificationService.sendPushNotification(
                        task.Walker.id,
                        '📅 Task Reminder',
                        `You have a task tomorrow at ${new Date(task.scheduled_time).toLocaleTimeString()}`,
                        { taskId: task.id, type: 'task_reminder' }
                    );
                }

                // Send reminder to walkee
                if (task.Walkee && task.Walkee.notificationPreferences?.reminders !== false) {
                    await notificationService.sendPushNotification(
                        task.Walkee.id,
                        '📅 Task Reminder',
                        `Your walking task is tomorrow at ${new Date(task.scheduled_time).toLocaleTimeString()}`,
                        { taskId: task.id, type: 'task_reminder' }
                    );
                }
            }

            return tomorrowTasks.length;
        } catch (error) {
            console.error('Error sending task reminders:', error);
            throw error;
        }
    }

    async cleanupOldData() {
        try {
            const Task = await import('../models/task.js').then(m => m.default);
            const Message = await import('../models/message.js').then(m => m.default);

            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

            // Archive old completed tasks (older than 90 days)
            const { count: archivedTasks } = await Task.update(
                { status: 'archived' },
                {
                    where: {
                        status: 'completed',
                        completed_at: {
                            [Op.lt]: ninetyDaysAgo
                        }
                    }
                }
            );

            // Soft delete old messages (older than 30 days)
            const { count: deletedMessages } = await Message.destroy({
                where: {
                    created_at: {
                        [Op.lt]: thirtyDaysAgo
                    },
                    message_type: 'text' // Keep system messages longer
                }
            });

            // Clean up old session logs (trim to last 10 entries)
            const tasksWithLargeLogs = await Task.findAll({
                where: {
                    session_logs: {
                        [Op.ne]: null
                    }
                },
                attributes: ['id', 'session_logs']
            });

            let trimmedLogs = 0;
            for (const task of tasksWithLargeLogs) {
                if (task.session_logs && task.session_logs.length > 10) {
                    await task.update({
                        session_logs: task.session_logs.slice(-10) // Keep last 10 entries
                    });
                    trimmedLogs++;
                }
            }

            console.log(`🧹 Cleanup completed: ${archivedTasks} tasks archived, ${deletedMessages} messages deleted, ${trimmedLogs} logs trimmed`);

            return { archivedTasks, deletedMessages, trimmedLogs };
        } catch (error) {
            console.error('Error cleaning up old data:', error);
            throw error;
        }
    }

    async sendDailyReports() {
        try {
            const User = await import('../models/user.js').then(m => m.default);
            const Task = await import('../models/task.js').then(m => m.default);
            const Payment = await import('../models/payment.js').then(m => m.default);
            const Role = await import('../models/role.js').then(m => m.default);
            const notificationService = await import('./notification.js').then(m => m.default);

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Get admin users
            const adminRole = await Role.findOne({ where: { name: 'Admin' } });
            const admins = await User.findAll({
                where: {
                    role_id: adminRole.id,
                    is_active: true,
                    notificationPreferences: {
                        [Op.or]: [
                            { dailyReports: true },
                            { dailyReports: null } // Default to true if not set
                        ]
                    }
                },
                attributes: ['id', 'name', 'email']
            });

            if (admins.length === 0) {
                console.log('No admins to send daily reports to');
                return 0;
            }

            // Get daily stats
            const [taskStats, paymentStats, userStats, revenueStats] = await Promise.all([
                Task.findAll({
                    where: {
                        created_at: {
                            [Op.gte]: yesterday,
                            [Op.lt]: today
                        }
                    },
                    attributes: [
                        [import('sequelize').fn('COUNT', import('sequelize').col('id')), 'total'],
                        [import('sequelize').fn('SUM', import('sequelize').col('price')), 'total_value'],
                        'status'
                    ],
                    group: ['status'],
                    raw: true
                }),

                Payment.findAll({
                    where: {
                        created_at: {
                            [Op.gte]: yesterday,
                            [Op.lt]: today
                        },
                        status: 'completed'
                    },
                    attributes: [
                        [import('sequelize').fn('COUNT', import('sequelize').col('id')), 'total'],
                        [import('sequelize').fn('SUM', import('sequelize').col('amount')), 'total_amount'],
                        'payment_type'
                    ],
                    group: ['payment_type'],
                    raw: true
                }),

                User.findAll({
                    where: {
                        created_at: {
                            [Op.gte]: yesterday,
                            [Op.lt]: today
                        }
                    },
                    include: [{
                        model: Role,
                        attributes: ['name']
                    }],
                    attributes: [
                        [import('sequelize').fn('COUNT', import('sequelize').col('id')), 'total']
                    ],
                    group: ['Role.name'],
                    raw: true
                }),

                Task.findAll({
                    where: {
                        status: 'completed',
                        completed_at: {
                            [Op.gte]: yesterday,
                            [Op.lt]: today
                        }
                    },
                    attributes: [
                        [import('sequelize').fn('SUM', import('sequelize').col('price')), 'daily_revenue'],
                        [import('sequelize').fn('AVG', import('sequelize').col('price')), 'avg_task_price']
                    ],
                    raw: true
                })
            ]);

            // Prepare report
            const reportDate = yesterday.toDateString();

            let reportHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
                        .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
                        .stat-value { font-size: 24px; font-weight: bold; color: #667eea; margin: 10px 0; }
                        .stat-label { color: #666; font-size: 14px; }
                        .section { margin: 30px 0; }
                        .section-title { border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; background: white; }
                        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                        th { background: #f8f9fa; font-weight: bold; }
                        .positive { color: #28a745; }
                        .negative { color: #dc3545; }
                        .footer { text-align: center; margin-top: 40px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>📊 Daily Report - ${reportDate}</h1>
                        <p>Voya System Analytics</p>
                    </div>
                    <div class="content">
            `;

            // Summary stats
            const totalTasks = taskStats.reduce((sum, stat) => sum + parseInt(stat.total || 0), 0);
            const totalTaskValue = taskStats.reduce((sum, stat) => sum + parseFloat(stat.total_value || 0), 0);
            const totalPayments = paymentStats.reduce((sum, stat) => sum + parseInt(stat.total || 0), 0);
            const totalPaymentAmount = paymentStats.reduce((sum, stat) => sum + parseFloat(stat.total_amount || 0), 0);
            const dailyRevenue = parseFloat(revenueStats[0]?.daily_revenue || 0);

            reportHtml += `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${totalTasks}</div>
                        <div class="stat-label">Total Tasks</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">$${dailyRevenue.toFixed(2)}</div>
                        <div class="stat-label">Daily Revenue</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${totalPayments}</div>
                        <div class="stat-label">Payments Processed</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">$${totalPaymentAmount.toFixed(2)}</div>
                        <div class="stat-label">Total Payments</div>
                    </div>
                </div>
            `;

            // Task breakdown
            reportHtml += `
                <div class="section">
                    <h2 class="section-title">Task Breakdown</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Count</th>
                                <th>Total Value</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            taskStats.forEach(stat => {
                const percentage = totalTasks > 0 ? ((parseInt(stat.total) / totalTasks) * 100).toFixed(1) : 0;
                reportHtml += `
                    <tr>
                        <td>${stat.status}</td>
                        <td>${stat.total}</td>
                        <td>$${parseFloat(stat.total_value || 0).toFixed(2)}</td>
                        <td>${percentage}%</td>
                    </tr>
                `;
            });

            reportHtml += `
                        </tbody>
                    </table>
                </div>
            `;

            // New users
            reportHtml += `
                <div class="section">
                    <h2 class="section-title">New Users</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Role</th>
                                <th>Count</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            userStats.forEach(stat => {
                reportHtml += `
                    <tr>
                        <td>${stat['Role.name']}</td>
                        <td>${stat.total}</td>
                    </tr>
                `;
            });

            reportHtml += `
                        </tbody>
                    </table>
                </div>

                <div class="footer">
                    <p>This is an automated daily report generated by Voya.</p>
                    <p>Report generated on ${new Date().toLocaleString()}</p>
                </div>
            `;

            reportHtml += `
                    </div>
                </body>
                </html>
            `;

            // Send to all admins
            let sentCount = 0;
            for (const admin of admins) {
                try {
                    await notificationService.sendEmail(
                        admin.email,
                        `📊 Daily Report - ${reportDate}`,
                        reportHtml,
                        `Daily Report for ${reportDate}\n\nTotal Tasks: ${totalTasks}\nDaily Revenue: $${dailyRevenue.toFixed(2)}\nPayments Processed: ${totalPayments}\nNew Users: ${userStats.reduce((sum, stat) => sum + parseInt(stat.total || 0), 0)}`
                    );
                    sentCount++;
                } catch (error) {
                    console.error(`Failed to send daily report to ${admin.email}:`, error);
                }
            }

            console.log(`📧 Daily reports sent to ${sentCount}/${admins.length} admins`);
            return sentCount;
        } catch (error) {
            console.error('Error sending daily reports:', error);
            throw error;
        }
    }

    async databaseBackup() {
        // In production, this would back up the database
        console.log('💾 Database backup simulated');
        return { success: true, timestamp: new Date().toISOString() };
    }

    async updateWalkerRatings() {
        try {
            const User = await import('../models/user.js').then(m => m.default);
            const Task = await import('../models/task.js').then(m => m.default);

            // Update walker ratings based on recent tasks
            const walkers = await User.findAll({
                where: {
                    role_id: (await import('../models/role.js').then(m => m.default.findOne({ where: { name: 'Walker' } }))).id
                },
                attributes: ['id']
            });

            for (const walker of walkers) {
                const recentTasks = await Task.findAll({
                    where: {
                        walker_id: walker.id,
                        status: 'completed',
                        walker_rating: { [Op.ne]: null },
                        completed_at: {
                            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                        }
                    },
                    attributes: [
                        [import('sequelize').fn('AVG', import('sequelize').col('walker_rating')), 'avg_rating'],
                        [import('sequelize').fn('COUNT', import('sequelize').col('id')), 'total_tasks']
                    ],
                    raw: true
                });

                if (recentTasks[0]?.avg_rating) {
                    await walker.update({
                        walker_rating: parseFloat(recentTasks[0].avg_rating).toFixed(1)
                    });
                }
            }

            console.log('⭐ Walker ratings updated');
            return walkers.length;
        } catch (error) {
            console.error('Error updating walker ratings:', error);
            throw error;
        }
    }

    async processMonthlyPayouts() {
        try {
            const User = await import('../models/user.js').then(m => m.default);
            const Payment = await import('../models/payment.js').then(m => m.default);
            const notificationService = await import('./notification.js').then(m => m.default);

            // Get walkers with wallet balance
            const walkers = await User.findAll({
                where: {
                    role_id: (await import('../models/role.js').then(m => m.default.findOne({ where: { name: 'Walker' } }))).id,
                    wallet_balance: { [Op.gt]: 0 }
                },
                attributes: ['id', 'name', 'email', 'wallet_balance', 'preferred_currency']
            });

            console.log(`💰 Processing monthly payouts for ${walkers.length} walkers`);

            for (const walker of walkers) {
                if (walker.wallet_balance > 10) { // Minimum payout amount
                    // Create payout record
                    const payout = await Payment.create({
                        user_id: walker.id,
                        amount: walker.wallet_balance,
                        currency: walker.preferred_currency,
                        payment_method: 'bank_transfer',
                        payment_type: 'withdrawal',
                        status: 'processing',
                        metadata: {
                            payoutPeriod: new Date().toISOString().slice(0, 7), // YYYY-MM
                            previousBalance: walker.wallet_balance
                        }
                    });

                    // Reset wallet balance
                    await walker.update({ wallet_balance: 0 });

                    // Send notification
                    await notificationService.sendEmail(
                        walker.email,
                        '💰 Monthly Payout Initiated',
                        `<h2>Monthly Payout Initiated</h2>
                        <p>Hello ${walker.name},</p>
                        <p>Your monthly payout of <strong>${walker.wallet_balance} ${walker.preferred_currency}</strong> has been initiated.</p>
                        <p>Transaction ID: ${payout.id}</p>
                        <p>The amount should reflect in your account within 3-5 business days.</p>`
                    );

                    console.log(`✅ Payout initiated for walker ${walker.id}: ${walker.wallet_balance} ${walker.preferred_currency}`);
                }
            }

            return walkers.length;
        } catch (error) {
            console.error('Error processing monthly payouts:', error);
            throw error;
        }
    }

    async healthCheck() {
        try {
            const { sequelize } = await import('../db.js');

            // Check database connection
            await sequelize.authenticate();

            // Check job status
            const jobStatus = {};
            for (const [name, job] of this.jobs.entries()) {
                jobStatus[name] = 'running';
            }

            console.log('❤️ Health check passed');
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                jobs: jobStatus,
                database: 'connected'
            };
        } catch (error) {
            console.error('💔 Health check failed:', error);
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    stopJob(name) {
        const job = this.jobs.get(name);
        if (job) {
            job.stop();
            this.jobs.delete(name);
            console.log(`🛑 Stopped job: ${name}`);
            return true;
        }
        return false;
    }

    stopAll() {
        for (const [name, job] of this.jobs.entries()) {
            job.stop();
            console.log(`🛑 Stopped job: ${name}`);
        }
        this.jobs.clear();
        this.isRunning = false;
        console.log('🛑 All scheduler jobs stopped');
    }

    getJobStatus() {
        const status = {};
        for (const [name, job] of this.jobs.entries()) {
            status[name] = 'active';
        }
        return status;
    }
}

export default new Scheduler();
