import express from 'express';
import MessageController from '../controllers/message.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All message routes require authentication
router.use(authenticate);

// Get list of conversations
router.get('/conversations', MessageController.getConversations);

// Get unread count
router.get('/unread/count', MessageController.getUnreadCount);

// Notification center feed
router.get('/notifications/feed', MessageController.getNotificationFeed);
router.put('/notifications/read-all', MessageController.markAllNotificationsAsRead);

// Admin broadcast
router.post('/broadcast', authorize('Admin'), MessageController.sendBroadcast);

// Get messages in a conversation (with a specific user)
router.get('/:other_user_id', MessageController.getMessagesWithUser);

// Send a message
router.post('/', MessageController.sendMessage);

// Mark message as read
router.put('/:message_id/read', MessageController.markAsRead);

// Delete message
router.delete('/:message_id', MessageController.deleteMessage);

export default router;
