import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { messageAPI } from '../services/api';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  IconButton,
  Button,
  Chip,
  Divider,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Notifications,
  NotificationsOff,
  CheckCircle,
  Favorite,
  ChatBubble,
  PersonAdd,
  Payment,
  Star,
  MoreVert,
  Delete,
  MarkEmailRead,
  Settings,
  AssignmentTurnedIn
} from '@mui/icons-material';

const NotificationsPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
    sounds: false,
    taskUpdates: true,
    messageAlerts: true,
    ratingAlerts: true,
    marketingEmails: false
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const refresh = () => fetchNotifications();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleSystemNotification = () => {
      fetchNotifications();
    };

    const handleIncomingMessage = (message) => {
      const type = message?.message_type || 'notification';
      const validTypes = ['notification', 'system_alert', 'task_update', 'payment_update'];
      if (!validTypes.includes(type)) {
        return;
      }

      setNotifications((prev) => [
        {
          id: message.id,
          type,
          title: type === 'payment_update'
            ? 'Payment Update'
            : type === 'task_update'
              ? 'Trip Update'
              : type === 'system_alert'
                ? 'System Alert'
                : 'Notification',
          message: message.content || '',
          time: message.createdAt ? new Date(message.createdAt).toLocaleString() : 'Just now',
          read: Boolean(message.is_read),
          user: message.Sender || null,
          raw: message
        },
        ...prev.filter((item) => String(item.id) !== String(message.id))
      ]);
    };

    socket.on('new_message', handleIncomingMessage);
    socket.on('system_notification', handleSystemNotification);
    return () => {
      socket.off('new_message', handleIncomingMessage);
      socket.off('system_notification', handleSystemNotification);
    };
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await messageAPI.getNotifications({ limit: 100 });
      const feed = response.data?.notifications || [];

      setNotifications(
        feed.map((entry) => ({
          id: entry.id,
          type: entry.message_type,
          title: entry.message_type === 'payment_update'
            ? 'Payment Update'
            : entry.message_type === 'task_update'
              ? 'Trip Update'
              : entry.message_type === 'system_alert'
                ? 'System Alert'
                : 'Notification',
          message: entry.content,
          time: entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'Recent',
          read: Boolean(entry.is_read),
          user: entry.Sender,
          raw: entry
        }))
      );
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await messageAPI.markMessageRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }

    setNotifications((prev) =>
      prev.map((notification) =>
        String(notification.id) === String(id)
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const handleMarkAllAsRead = async () => {
    try {
      await messageAPI.markAllNotificationsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }

    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
  };

  const handleDelete = async (id) => {
    try {
      await messageAPI.deleteMessage(id);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }

    setNotifications((prev) => prev.filter((notification) => String(notification.id) !== String(id)));
    setAnchorEl(null);
  };

  const handleDeleteAll = async () => {
    const notificationIds = notifications.map((item) => item.id).filter(Boolean);
    await Promise.all(
      notificationIds.map(async (id) => {
        try {
          await messageAPI.deleteMessage(id);
        } catch (error) {
          // Ignore per-item delete failures to clear what is possible
        }
      })
    );

    setNotifications([]);
  };

  const handleSettingsChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task_update': return <AssignmentTurnedIn color="primary" />;
      case 'message': return <ChatBubble color="info" />;
      case 'rating': return <Star color="warning" />;
      case 'payment_update': return <Payment color="success" />;
      case 'system_alert': return <Settings color="action" />;
      case 'system': return <Settings color="action" />;
      default: return <Notifications color="action" />;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 0) return true; // All
    if (activeTab === 1) return !notification.read; // Unread
    if (activeTab === 2) return notification.read; // Read
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Badge badgeContent={unreadCount} color="error">
            <Notifications sx={{ fontSize: 32 }} />
          </Badge>
          <Box>
            <Typography variant="h4">
              Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {unreadCount} unread notifications
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<MarkEmailRead />}
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            Mark all as read
          </Button>
          <Button
            color="error"
            startIcon={<Delete />}
            onClick={handleDeleteAll}
            disabled={notifications.length === 0}
          >
            Clear all
          </Button>
        </Box>
      </Box>

      {loading && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Loading notification history...
        </Typography>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="All" />
          <Tab label={
            <Badge badgeContent={unreadCount} color="error">
              Unread
            </Badge>
          } />
          <Tab label="Read" />
          <Tab label="Settings" />
        </Tabs>
      </Box>

      {activeTab === 3 ? (
        /* Settings Tab */
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Notification Settings
            </Typography>

            <Box sx={{ mt: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.pushNotifications}
                    onChange={(e) => handleSettingsChange('pushNotifications', e.target.checked)}
                  />
                }
                label="Push Notifications"
                sx={{ display: 'block', mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailNotifications}
                    onChange={(e) => handleSettingsChange('emailNotifications', e.target.checked)}
                  />
                }
                label="Email Notifications"
                sx={{ display: 'block', mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.sounds}
                    onChange={(e) => handleSettingsChange('sounds', e.target.checked)}
                  />
                }
                label="Notification Sounds"
                sx={{ display: 'block', mb: 2 }}
              />

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Notification Types
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.taskUpdates}
                    onChange={(e) => handleSettingsChange('taskUpdates', e.target.checked)}
                  />
                }
                label="Task Updates"
                sx={{ display: 'block', mb: 1 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.messageAlerts}
                    onChange={(e) => handleSettingsChange('messageAlerts', e.target.checked)}
                  />
                }
                label="Message Alerts"
                sx={{ display: 'block', mb: 1 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.ratingAlerts}
                    onChange={(e) => handleSettingsChange('ratingAlerts', e.target.checked)}
                  />
                }
                label="Rating Alerts"
                sx={{ display: 'block', mb: 1 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.marketingEmails}
                    onChange={(e) => handleSettingsChange('marketingEmails', e.target.checked)}
                  />
                }
                label="Marketing Emails"
                sx={{ display: 'block', mb: 1 }}
              />
            </Box>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained">
                Save Settings
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        /* Notifications List */
        <>
          {filteredNotifications.length === 0 ? (
            <Card sx={{ textAlign: 'center', py: 6 }}>
              <NotificationsOff sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No notifications
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {activeTab === 1 ? 'No unread notifications' : 'All caught up!'}
              </Typography>
            </Card>
          ) : (
            <Card>
              <List>
                {filteredNotifications.map((notification, index) => (
                  <React.Fragment key={notification.id}>
                    <ListItem
                      sx={{
                        bgcolor: notification.read ? 'transparent' : 'action.hover',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      secondaryAction={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Chip
                            label={notification.time}
                            size="small"
                            sx={{ mr: 1 }}
                          />
                          <IconButton
                            onClick={(e) => {
                              setAnchorEl(e.currentTarget);
                              setSelectedNotification(notification);
                            }}
                          >
                            <MoreVert />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.light' }}>
                          {getNotificationIcon(notification.type)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {notification.title}
                            </Typography>
                            {!notification.read && (
                              <Badge color="error" variant="dot" />
                            )}
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" color="text.primary">
                              {notification.message}
                            </Typography>
                            {notification.user && (
                              <Typography variant="caption" color="text.secondary">
                                From: {notification.user.name}
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                    {index < filteredNotifications.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Card>
          )}
        </>
      )}

      {/* Notification Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {selectedNotification && (
          <>
            {!selectedNotification.read && (
              <MenuItem onClick={async () => {
                await handleMarkAsRead(selectedNotification.id);
                setAnchorEl(null);
              }}>
                <CheckCircle sx={{ mr: 1 }} />
                Mark as read
              </MenuItem>
            )}
            <MenuItem onClick={() => handleDelete(selectedNotification.id)} sx={{ color: 'error.main' }}>
              <Delete sx={{ mr: 1 }} />
              Delete
            </MenuItem>
          </>
        )}
      </Menu>
    </Container>
  );
};

export default NotificationsPage;
