import nodemailer from 'nodemailer';
import twilio from 'twilio';
import axios from 'axios';

class NotificationService {
    constructor() {
        // Initialize email transporter
        this.emailTransporter = null;
        this.initEmailTransporter();

        // Initialize SMS client
        this.smsClient = null;
        this.initSMSClient();

        // Initialize push notification service
        this.pushService = null;

        // WebSocket instance (will be set from main app)
        this.io = null;
    }

    initEmailTransporter() {
        try {
            if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
                this.emailTransporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: parseInt(process.env.SMTP_PORT) || 587,
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    },
                    tls: {
                        rejectUnauthorized: process.env.NODE_ENV === 'production'
                    }
                });

                // Test connection
                this.emailTransporter.verify((error) => {
                    if (error) {
                        console.warn('Email transporter verification failed:', error.message);
                        this.emailTransporter = null;
                    } else {
                        console.log('✅ Email transporter is ready');
                    }
                });
            } else {
                console.warn('Email configuration missing. Email notifications disabled.');
            }
        } catch (error) {
            console.error('Failed to initialize email transporter:', error);
            this.emailTransporter = null;
        }
    }

    initSMSClient() {
        try {
            if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
                this.smsClient = twilio(
                    process.env.TWILIO_ACCOUNT_SID,
                    process.env.TWILIO_AUTH_TOKEN
                );
                console.log('✅ SMS client is ready');
            } else {
                console.warn('Twilio configuration missing. SMS notifications disabled.');
            }
        } catch (error) {
            console.error('Failed to initialize SMS client:', error);
            this.smsClient = null;
        }
    }

    setSocketIO(ioInstance) {
        this.io = ioInstance;
        console.log('✅ Socket.IO instance set for real-time notifications');
    }

    async sendEmail(to, subject, htmlContent, textContent = '') {
        try {
            if (!this.emailTransporter) {
                console.warn('Email transporter not available. Email not sent.');
                return false;
            }

            const mailOptions = {
                from: process.env.SMTP_FROM || '"Voya" <noreply@voya.com>',
                to: Array.isArray(to) ? to.join(', ') : to,
                subject: subject,
                html: htmlContent,
                text: textContent || this.stripHTML(htmlContent),
                headers: {
                    'X-Priority': '3',
                    'X-Mailer': 'WalkerApp Mailer'
                }
            };

            const info = await this.emailTransporter.sendMail(mailOptions);
            console.log(`📧 Email sent to ${to}: ${info.messageId}`);

            // Log email send (in production, save to database)
            this.logNotification('email', to, subject, { messageId: info.messageId });

            return true;
        } catch (error) {
            console.error('❌ Email sending failed:', error);
            return false;
        }
    }

    async sendSMS(to, message) {
        try {
            if (!this.smsClient) {
                console.warn('SMS client not available. SMS not sent.');
                return false;
            }

            // Format phone number if needed
            const formattedTo = this.formatPhoneNumber(to);

            const response = await this.smsClient.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: formattedTo
            });

            console.log(`📱 SMS sent to ${formattedTo}: ${response.sid}`);

            // Log SMS send
            this.logNotification('sms', formattedTo, message, { sid: response.sid });

            return true;
        } catch (error) {
            console.error('❌ SMS sending failed:', error);
            return false;
        }
    }

    async sendPushNotification(userId, title, body, data = {}, options = {}) {
        try {
            // In production, integrate with Firebase Cloud Messaging (FCM)
            // For now, we'll use Socket.io for real-time notifications

            if (this.io) {
                this.io.to(`user:${userId}`).emit('push_notification', {
                    title,
                    body,
                    data,
                    timestamp: new Date().toISOString(),
                    read: false,
                    ...options
                });

                console.log(`🔔 Push notification sent to user ${userId}: ${title}`);

                // Log push notification
                this.logNotification('push', userId, title, { body, data });

                return true;
            } else {
                console.warn('Socket.IO not available for push notifications');
                return false;
            }
        } catch (error) {
            console.error('❌ Push notification failed:', error);
            return false;
        }
    }

    async sendBulkNotification(users, type, content, options = {}) {
        try {
            const results = {
                email: { sent: 0, failed: 0 },
                sms: { sent: 0, failed: 0 },
                push: { sent: 0, failed: 0 }
            };

            for (const user of users) {
                const notificationPromises = [];

                // Email notification
                if (type.includes('email') && user.email && user.notificationPreferences?.email !== false) {
                    notificationPromises.push(
                        this.sendEmail(
                            user.email,
                            content.email?.subject || 'Notification from Voya',
                            content.email?.html || content.message,
                            content.email?.text || content.message
                        ).then(success => {
                            if (success) results.email.sent++;
                            else results.email.failed++;
                        })
                    );
                }

                // SMS notification
                if (type.includes('sms') && user.phone && user.notificationPreferences?.sms !== false) {
                    notificationPromises.push(
                        this.sendSMS(user.phone, content.sms || content.message)
                            .then(success => {
                                if (success) results.sms.sent++;
                                else results.sms.failed++;
                            })
                    );
                }

                // Push notification
                if (type.includes('push') && user.id && user.notificationPreferences?.push !== false) {
                    notificationPromises.push(
                        this.sendPushNotification(
                            user.id,
                            content.push?.title || 'Voya',
                            content.push?.body || content.message,
                            content.push?.data || {},
                            options.push
                        ).then(success => {
                            if (success) results.push.sent++;
                            else results.push.failed++;
                        })
                    );
                }

                await Promise.allSettled(notificationPromises);
            }

            console.log(`📊 Bulk notification results:`, results);
            return results;
        } catch (error) {
            console.error('❌ Bulk notification failed:', error);
            throw error;
        }
    }

    async sendTaskNotification(task, notificationType, additionalData = {}) {
        try {
            // Get task details with user information
            const User = await import('../models/user.js').then(m => m.default);
            const Task = await import('../models/task.js').then(m => m.default);

            const fullTask = await Task.findByPk(task.id, {
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

            if (!fullTask) {
                console.error('Task not found for notification');
                return false;
            }

            const notifications = [];
            const taskDetails = {
                id: fullTask.id,
                description: fullTask.description,
                pickupLocation: fullTask.pickup_location?.address || 'Pickup location',
                destination: fullTask.destination?.address || 'Destination',
                scheduledTime: new Date(fullTask.scheduled_time).toLocaleString(),
                price: `${fullTask.price} ${fullTask.currency}`,
                status: fullTask.status
            };

            switch (notificationType) {
                case 'task_created':
                    // Notify nearby walkers (in real app, would query for nearby walkers)
                    notifications.push({
                        type: ['push'],
                        users: [], // Would be populated with nearby walkers
                        content: {
                            push: {
                                title: 'New Walking Task Available',
                                body: `New task near ${taskDetails.pickupLocation}`,
                                data: { taskId: task.id, type: 'new_task' }
                            }
                        }
                    });
                    break;

                case 'task_assigned':
                    if (fullTask.Walker) {
                        notifications.push({
                            type: ['email', 'sms', 'push'],
                            users: [fullTask.Walker],
                            content: {
                                email: {
                                    subject: '🎯 New Task Assigned to You',
                                    html: this.generateTaskAssignedEmail(fullTask.Walker.name, taskDetails)
                                },
                                sms: `New task assigned! Pickup: ${taskDetails.pickupLocation}. ${taskDetails.scheduledTime}`,
                                push: {
                                    title: '✅ Task Assigned',
                                    body: `You have a new task: ${taskDetails.description}`,
                                    data: { taskId: task.id, type: 'task_assigned' }
                                }
                            }
                        });
                    }

                    if (fullTask.Walkee) {
                        notifications.push({
                            type: ['email', 'push'],
                            users: [fullTask.Walkee],
                            content: {
                                email: {
                                    subject: '👤 Walker Assigned to Your Task',
                                    html: this.generateWalkerAssignedEmail(fullTask.Walkee.name, fullTask.Walker.name, taskDetails)
                                },
                                push: {
                                    title: '👤 Walker Assigned',
                                    body: `${fullTask.Walker.name} has been assigned to your task`,
                                    data: { taskId: task.id, type: 'walker_assigned' }
                                }
                            }
                        });
                    }
                    break;

                case 'task_started':
                    if (fullTask.Walkee) {
                        notifications.push({
                            type: ['email', 'sms', 'push'],
                            users: [fullTask.Walkee],
                            content: {
                                email: {
                                    subject: '🚶‍♂️ Your Walker is On the Way',
                                    html: this.generateTaskStartedEmail(fullTask.Walkee.name, fullTask.Walker.name, taskDetails)
                                },
                                sms: `Your walker ${fullTask.Walker.name} has started the journey to your location.`,
                                push: {
                                    title: '🚶‍♂️ Walker on the Way',
                                    body: `${fullTask.Walker.name} has started walking to your location`,
                                    data: { taskId: task.id, type: 'task_started' }
                                }
                            }
                        });
                    }
                    break;

                case 'task_completed':
                    if (fullTask.Walkee) {
                        notifications.push({
                            type: ['email', 'push'],
                            users: [fullTask.Walkee],
                            content: {
                                email: {
                                    subject: '✅ Task Completed Successfully',
                                    html: this.generateTaskCompletedEmail(fullTask.Walkee.name, taskDetails)
                                },
                                push: {
                                    title: '✅ Task Completed',
                                    body: 'Your walking task has been completed successfully',
                                    data: { taskId: task.id, type: 'task_completed' }
                                }
                            }
                        });
                    }

                    if (fullTask.Walker) {
                        notifications.push({
                            type: ['email', 'push'],
                            users: [fullTask.Walker],
                            content: {
                                email: {
                                    subject: '💰 Payment Processed',
                                    html: this.generatePaymentProcessedEmail(fullTask.Walker.name, taskDetails)
                                },
                                push: {
                                    title: '💰 Payment Received',
                                    body: `$${fullTask.price} has been added to your wallet`,
                                    data: { taskId: task.id, type: 'payment_received' }
                                }
                            }
                        });
                    }
                    break;

                case 'task_cancelled':
                    const affectedUsers = [];
                    if (fullTask.Walker) affectedUsers.push(fullTask.Walker);
                    if (fullTask.Walkee) affectedUsers.push(fullTask.Walkee);

                    notifications.push({
                        type: ['email', 'push'],
                        users: affectedUsers,
                        content: {
                            email: {
                                subject: '❌ Task Cancelled',
                                html: this.generateTaskCancelledEmail(taskDetails, additionalData.reason)
                            },
                            push: {
                                title: '❌ Task Cancelled',
                                body: 'A task has been cancelled',
                                data: { taskId: task.id, type: 'task_cancelled' }
                            }
                        }
                    });
                    break;

                case 'walker_late':
                    if (fullTask.Walkee) {
                        notifications.push({
                            type: ['email', 'sms'],
                            users: [fullTask.Walkee],
                            content: {
                                email: {
                                    subject: '⏰ Walker Running Late',
                                    html: this.generateWalkerLateEmail(fullTask.Walkee.name, fullTask.Walker.name, taskDetails)
                                },
                                sms: `Your walker is running late for the scheduled task at ${taskDetails.scheduledTime}`
                            }
                        });
                    }
                    break;

                case 'payment_successful':
                    if (fullTask.Walkee) {
                        notifications.push({
                            type: ['email', 'push'],
                            users: [fullTask.Walkee],
                            content: {
                                email: {
                                    subject: '💳 Payment Successful',
                                    html: this.generatePaymentSuccessfulEmail(fullTask.Walkee.name, taskDetails)
                                },
                                push: {
                                    title: '💳 Payment Successful',
                                    body: 'Your payment has been processed successfully',
                                    data: { taskId: task.id, type: 'payment_successful' }
                                }
                            }
                        });
                    }
                    break;

                default:
                    console.warn(`Unknown notification type: ${notificationType}`);
                    return false;
            }

            // Send all notifications
            for (const notification of notifications) {
                await this.sendBulkNotification(
                    notification.users,
                    notification.type,
                    notification.content,
                    additionalData.options
                );
            }

            return true;
        } catch (error) {
            console.error('Task notification error:', error);
            return false;
        }
    }

    async sendSystemNotification(userId, title, message, type = 'info') {
        try {
            // Save to database
            const Message = await import('../models/message.js').then(m => m.default);

            await Message.create({
                sender_id: null, // System message
                receiver_id: userId,
                content: message,
                message_type: 'system_alert',
                metadata: {
                    title,
                    type,
                    timestamp: new Date().toISOString()
                }
            });

            // Send push notification
            await this.sendPushNotification(userId, title, message, {
                type: 'system',
                notificationType: type
            });

            console.log(`📢 System notification sent to user ${userId}: ${title}`);
            return true;
        } catch (error) {
            console.error('System notification error:', error);
            return false;
        }
    }

    async sendWelcomeEmail(user) {
        try {
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Welcome to Voya</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Welcome to Voya! 🎉</h1>
                    </div>
                    <div class="content">
                        <p>Hello <strong>${user.name}</strong>,</p>
                        <p>Thank you for joining Voya! We're excited to have you on board as a ${user.Role?.name || 'member'}.</p>

                        <p>Your account has been successfully created with the following details:</p>

                        <div style="background: white; padding: 20px; border-radius: 5px; border-left: 4px solid #667eea; margin: 20px 0;">
                            <p><strong>Email:</strong> ${user.email}</p>
                            <p><strong>Account Type:</strong> ${user.Role?.name || 'User'}</p>
                            <p><strong>Join Date:</strong> ${new Date(user.created_at).toLocaleDateString()}</p>
                        </div>

                        <p>You can now:</p>
                        <ul>
                            ${user.Role?.name === 'Walkee' ? '<li>📝 Book walking services</li><li>📍 Set pickup and destination locations</li><li>💳 Make secure payments</li><li>⭐ Rate your walkers</li>' : ''}
                            ${user.Role?.name === 'Walker' ? '<li>👣 Accept walking tasks</li><li>💰 Earn money for your services</li><li>📊 Track your earnings</li><li>⭐ Build your reputation</li>' : ''}
                            ${user.Role?.name === 'Admin' ? '<li>👥 Manage users and roles</li><li>📊 View system analytics</li><li>⚙️ Configure system settings</li><li>🔒 Manage permissions</li>' : ''}
                            <li>👤 Manage your profile and preferences</li>
                            <li>📱 Use our mobile-friendly platform</li>
                        </ul>

                        ${!user.is_verified ? `
                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>⚠️ Account Verification Required</strong></p>
                            <p>Please verify your email address to access all features.</p>
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/verify-email?token=VERIFY_TOKEN" class="button">Verify Email</a>
                        </div>
                        ` : ''}

                        <p>Need help getting started? Check out our <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/help">help center</a> or contact our support team.</p>

                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard" class="button">Go to Dashboard</a>

                        <p>Best regards,<br><strong>The Voya Team</strong></p>
                    </div>
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} Voya. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </body>
                </html>
            `;

            const text = `Welcome to Voya, ${user.name}! Your ${user.Role?.name || 'user'} account has been created successfully. You can now access your dashboard at ${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard`;

            return await this.sendEmail(user.email, 'Welcome to Voya! 🎉', html, text);
        } catch (error) {
            console.error('Welcome email error:', error);
            return false;
        }
    }

    // Email template generators
    generateTaskAssignedEmail(walkerName, taskDetails) {
        return `
            <h2>New Task Assigned 🎯</h2>
            <p>Hello ${walkerName},</p>
            <p>A new walking task has been assigned to you:</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Description:</strong> ${taskDetails.description}</p>
                <p><strong>Pickup:</strong> ${taskDetails.pickupLocation}</p>
                <p><strong>Destination:</strong> ${taskDetails.destination}</p>
                <p><strong>Scheduled Time:</strong> ${taskDetails.scheduledTime}</p>
                <p><strong>Price:</strong> ${taskDetails.price}</p>
            </div>
            <p>Please arrive at the pickup location on time.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/tasks/${taskDetails.id}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Task Details</a>
        `;
    }

    generateTaskCompletedEmail(walkeeName, taskDetails) {
        return `
            <h2>Task Completed Successfully ✅</h2>
            <p>Hello ${walkeeName},</p>
            <p>Your walking task has been completed:</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Description:</strong> ${taskDetails.description}</p>
                <p><strong>Status:</strong> Completed</p>
                <p><strong>Completion Time:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Amount Paid:</strong> ${taskDetails.price}</p>
            </div>
            <p>Please rate your walker to help improve our service.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/tasks/${taskDetails.id}/rate" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Rate Walker</a>
        `;
    }

    // Helper methods
    stripHTML(html) {
        return html.replace(/<[^>]*>/g, '');
    }

    formatPhoneNumber(phone) {
        // Add country code if missing
        if (!phone.startsWith('+')) {
            return `+${phone}`;
        }
        return phone;
    }

    logNotification(type, recipient, content, metadata = {}) {
        // In production, save to database
        console.log(`📝 Notification logged - Type: ${type}, Recipient: ${recipient}`);
    }
}

export default new NotificationService();
