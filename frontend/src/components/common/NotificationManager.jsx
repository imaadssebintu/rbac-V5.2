import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import notificationService from '../../services/notificationService';

const NotificationManager = () => {
  const { socket } = useSocket();

  // Logic to register Service Worker
  const registerServiceWorker = async () => {
    if (process.env.NODE_ENV !== 'production') {
      return null;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers not supported in this browser');
      return null;
    }
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' });
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  };

  // Logic to initialize permissions and push subscription
  const initializeNotifications = useCallback(async () => {
    try {

      // Check if notifications are already granted
      if (Notification.permission !== 'granted') {
        return;
      }

      // Register Service Worker
      const registration = await registerServiceWorker();
      if (!registration) return;

      // Wait for the Service Worker to be ready
      await navigator.serviceWorker.ready;

      // Subscribe to Push Notifications
      const subscription = await notificationService.subscribeToPush();

      if (!subscription) {
        console.warn('Push Subscription failed (check VAPID keys)');
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }, []);

  // Handle Socket Event Listeners
  const setupSocketListeners = useCallback(() => {
    if (!socket) return;

    socket.on('new_message', (message) => {
      if (document.hidden) {
        notificationService.sendNotification('New Message', {
          body: `${message.senderName}: ${message.content}`,
          icon: '/icon-192x192.png',
          tag: `message-${message.conversationId}`,
          data: { url: `/messages/${message.conversationId}` }
        });
      }
    });

    socket.on('new_task', (task) => {
      if (document.hidden) {
        notificationService.sendNotification('New Guide Request Available', {
          body: `${task.title} - $${task.price}`,
          icon: '/icon-192x192.png',
          tag: `task-${task.id}`,
          data: { url: `/tasks/${task.id}` }
        });
      }
    });

    socket.on('task_accepted', (data) => {
      notificationService.sendNotification('Guide Assigned', {
        body: `${data.walkerName} accepted your walk request`,
        icon: '/icon-192x192.png',
        data: { url: `/tasks/${data.taskId}` }
      });
    });

    socket.on('task_completed', (data) => {
      notificationService.sendNotification('Trip Completed', {
        body: `${data.taskTitle} has been completed`,
        icon: '/icon-192x192.png',
        data: { url: `/tasks/${data.taskId}` }
      });
    });

    socket.on('new_review', (review) => {
      notificationService.sendNotification('New Review', {
        body: `You received a ${review.rating}-star review`,
        icon: '/icon-192x192.png',
        data: { url: `/profile/reviews` }
      });
    });

    socket.on('payment_received', (payment) => {
      notificationService.sendNotification('Payment Received', {
        body: `$${payment.amount} received for your guide service`,
        icon: '/icon-192x192.png',
        data: { url: `/payments` }
      });
    });

    socket.on('system_notification', (notification) => {
      notificationService.sendNotification(notification.title, {
        body: notification.message,
        icon: '/icon-192x192.png',
        data: { url: notification.url || '/' }
      });
    });
  }, [socket]);

  const cleanupSocketListeners = useCallback(() => {
    if (!socket) return;
    socket.off('new_message');
    socket.off('new_task');
    socket.off('task_accepted');
    socket.off('task_completed');
    socket.off('new_review');
    socket.off('payment_received');
    socket.off('system_notification');
  }, [socket]);

  // Main Effect: Initialize everything
  useEffect(() => {
    initializeNotifications();

    if (socket) {
      setupSocketListeners();
    }

    return () => {
      cleanupSocketListeners();
    };
  }, [socket, initializeNotifications, setupSocketListeners, cleanupSocketListeners]);

  const navigate = useNavigate();

  // Handle Notification Clicks (from Service Worker)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return undefined;
    }

    const handleSWMessage = (event) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        const { url } = event.data;
        if (!url) return;
        try {
          // If internal path, navigate via router to preserve SPA state
          const isInternal = url.startsWith('/');
          if (isInternal) {
            navigate(url);
          } else {
            window.location.href = url;
          }
        } catch (e) {
          window.location.href = url;
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, [navigate]);

  return null; // This component provides background logic only
};

export default NotificationManager;
