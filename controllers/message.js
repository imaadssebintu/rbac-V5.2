import Message from '../models/message.js';
import User from '../models/user.js';
import Role from '../models/role.js';
import { Op } from 'sequelize';

class MessageController {
    static getNotificationTypes() {
        return ['notification', 'system_alert', 'task_update', 'payment_update'];
    }

    static async getConversations(req, res, next) {
        try {
            const user_id = req.user.id; // From auth middleware

            // Find all unique users who have exchanged messages with current user
            // This is a complex query, simplified for now
            const sentMessages = await Message.findAll({
                where: { sender_id: user_id },
                attributes: ['receiver_id'],
                group: ['receiver_id']
            });

            const receivedMessages = await Message.findAll({
                where: { receiver_id: user_id },
                attributes: ['sender_id'],
                group: ['sender_id']
            });

            const contactIds = new Set([
                ...sentMessages.map(m => m.receiver_id),
                ...receivedMessages.map(m => m.sender_id)
            ]);

            const contacts = await User.findAll({
                where: { id: Array.from(contactIds) },
                attributes: ['id', 'name', 'profile_image', 'is_active'] // Added is_active
            });

            const conversations = await Promise.all(contacts.map(async (contact) => {
                const lastMessage = await Message.findOne({
                    where: {
                        [Op.or]: [
                            { sender_id: user_id, receiver_id: contact.id },
                            { sender_id: contact.id, receiver_id: user_id }
                        ]
                    },
                    order: [['createdAt', 'DESC']]
                });

                const unreadCount = await Message.count({
                    where: {
                        sender_id: contact.id,
                        receiver_id: user_id,
                        is_read: false
                    }
                });

                return {
                    id: contact.id, // Using user_id as conversation_id for simplicity
                    user: contact,
                    lastMessage,
                    unreadCount
                };
            }));

            res.json(conversations);
        } catch (error) {
            next(error);
        }
    }

    static async sendMessage(req, res, next) {
        try {
            const sender_id = req.user.id;
            const receiver_id = req.body.receiver_id || req.body.recipientId || req.body.receiverId;
            const content = req.body.content;
            const message_type = req.body.message_type || 'text';
            const role_filter = req.body.role_filter;

            if (!receiver_id) {
                return res.status(400).json({
                    success: false,
                    message: 'receiver_id is required'
                });
            }

            if (!content || !String(content).trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Message content is required'
                });
            }

            // Optional: Check if receiver exists
            if (receiver_id) {
                const receiver = await User.findByPk(receiver_id);
                if (!receiver) {
                    return res.status(404).json({
                        success: false,
                        message: 'Receiver not found'
                    });
                }
            }

            const message = await Message.create({
                sender_id,
                receiver_id,
                content: String(content).trim(),
                message_type,
                role_filter,
                is_read: false
            });

            const io = req.app.get('io');
            if (io) {
                io.to(`user:${receiver_id}`).emit('new_message', {
                    ...message.toJSON(),
                    conversationId: String(sender_id)
                });
            }

            res.status(201).json({
                success: true,
                message: 'Message sent successfully',
                data: message
            });
        } catch (error) {
            next(error);
        }
    }

    static async sendBroadcast(req, res, next) {
        try {
            const sender_id = req.user.id;
            const { content, role_filter, message_type = 'notification' } = req.body;

            if (!role_filter) {
                return res.status(400).json({
                    success: false,
                    message: 'Role filter is required for broadcast'
                });
            }

            // Get role
            const role = await Role.findOne({ where: { name: role_filter } });
            if (!role) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role specified'
                });
            }

            // Get all users with this role
            const users = await User.findAll({
                where: { role_id: role.id, is_active: true },
                attributes: ['id']
            });

            // Create broadcast messages
            const messages = await Promise.all(
                users.map(user =>
                    Message.create({
                        sender_id,
                        receiver_id: user.id,
                        content,
                        message_type,
                        role_filter,
                        is_read: false
                    })
                )
            );

            const io = req.app.get('io');
            if (io) {
                users.forEach((user) => {
                    io.to(`user:${user.id}`).emit('new_message', {
                        sender_id,
                        receiver_id: user.id,
                        content,
                        message_type,
                        role_filter,
                        createdAt: new Date().toISOString()
                    });
                });
            }

            res.json({
                success: true,
                message: `Broadcast sent to ${users.length} users`,
                count: users.length,
                messages
            });
        } catch (error) {
            next(error);
        }
    }

    static async getMessagesWithUser(req, res, next) {
        try {
            const current_user_id = req.user.id;
            const rawOtherUserId = req.params.other_user_id;
            const other_user_id = String(rawOtherUserId).startsWith('new-')
                ? String(rawOtherUserId).replace('new-', '')
                : rawOtherUserId;
            const { page = 1, limit = 50 } = req.query;

            const offset = (page - 1) * limit;

            const where = {
                [Op.or]: [
                    { 
                        sender_id: current_user_id,
                        receiver_id: other_user_id
                    },
                    { 
                        sender_id: other_user_id,
                        receiver_id: current_user_id
                    }
                ]
            };

            const messages = await Message.findAndCountAll({
                where,
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset),
                include: [
                    {
                        model: User,
                        as: 'Sender',
                        attributes: ['id', 'name', 'profile_image']
                    },
                    {
                        model: User,
                        as: 'Receiver',
                        attributes: ['id', 'name', 'profile_image']
                    }
                ]
            });

            // Mark as read
            const unreadIds = messages.rows
                .filter(msg => !msg.is_read && msg.receiver_id === current_user_id)
                .map(msg => msg.id);

            if (unreadIds.length > 0) {
                await Message.update(
                    { is_read: true },
                    { where: { id: unreadIds } }
                );
            }

            res.json({
                success: true,
                messages: messages.rows.reverse(), 
                pagination: {
                    total: messages.count,
                    page: parseInt(page),
                    pages: Math.ceil(messages.count / limit),
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static async markAsRead(req, res, next) {
        try {
            const { message_id } = req.params;

            const message = await Message.findByPk(message_id);
            if (!message) {
                return res.status(404).json({
                    success: false,
                    message: 'Message not found'
                });
            }

            await message.update({ is_read: true });

            res.json({
                success: true,
                message: 'Message marked as read'
            });
        } catch (error) {
            next(error);
        }
    }

    static async deleteMessage(req, res, next) {
        try {
            const { message_id } = req.params;
            const user_id = req.user.id;

            const message = await Message.findByPk(message_id);
            if (!message) {
                return res.status(404).json({
                    success: false,
                    message: 'Message not found'
                });
            }

            // Only sender can delete their messages
            if (message.sender_id !== user_id) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only delete your own messages'
                });
            }

            await message.destroy();

            res.json({
                success: true,
                message: 'Message deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    static async getUnreadCount(req, res, next) {
        try {
            const user_id = req.user.id; /// Use from auth

            const count = await Message.count({
                where: {
                    receiver_id: user_id,
                    is_read: false
                }
            });

            res.json({
                success: true,
                count
            });
        } catch (error) {
            next(error);
        }
    }

    static async getNotificationFeed(req, res, next) {
        try {
            const user_id = req.user.id;
            const { page = 1, limit = 30 } = req.query;
            const offset = (Number(page) - 1) * Number(limit);

            const where = {
                receiver_id: user_id,
                message_type: { [Op.in]: MessageController.getNotificationTypes() }
            };

            const result = await Message.findAndCountAll({
                where,
                order: [['createdAt', 'DESC']],
                limit: Number(limit),
                offset,
                include: [
                    {
                        model: User,
                        as: 'Sender',
                        attributes: ['id', 'name', 'profile_image']
                    }
                ]
            });

            const unreadCount = await Message.count({
                where: {
                    receiver_id: user_id,
                    is_read: false,
                    message_type: { [Op.in]: MessageController.getNotificationTypes() }
                }
            });

            res.json({
                success: true,
                notifications: result.rows,
                unreadCount,
                pagination: {
                    total: result.count,
                    page: Number(page),
                    pages: Math.ceil(result.count / Number(limit)),
                    limit: Number(limit)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    static async markAllNotificationsAsRead(req, res, next) {
        try {
            const user_id = req.user.id;

            await Message.update(
                { is_read: true },
                {
                    where: {
                        receiver_id: user_id,
                        is_read: false,
                        message_type: { [Op.in]: MessageController.getNotificationTypes() }
                    }
                }
            );

            res.json({
                success: true,
                message: 'All notifications marked as read'
            });
        } catch (error) {
            next(error);
        }
    }
}

export default MessageController;

