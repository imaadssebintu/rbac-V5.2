import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Initialize socket connection
  initialize(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    try {
      this.socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5500', {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });

      this.setupEventListeners();
      return this.socket;

    } catch (error) {
      console.error('Socket initialization error:', error);
      return null;
    }
  }

  // Setup event listeners
  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.reconnectAttempts = 0;
      this.emit('user_online', { userId: this.getUserId() });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, need to manually reconnect
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('Max reconnection attempts reached');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.emit('user_online', { userId: this.getUserId() });
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
    });

    // Message events
    this.socket.on('new_message', (message) => {
      this.triggerListeners('new_message', message);
    });

    this.socket.on('message_delivered', (data) => {
      this.triggerListeners('message_delivered', data);
    });

    this.socket.on('message_read', (data) => {
      this.triggerListeners('message_read', data);
    });

    // Task events
    this.socket.on('new_task', (task) => {
      this.triggerListeners('new_task', task);
    });

    this.socket.on('task_updated', (task) => {
      this.triggerListeners('task_updated', task);
    });

    this.socket.on('task_accepted', (data) => {
      this.triggerListeners('task_accepted', data);
    });

    this.socket.on('task_completed', (data) => {
      this.triggerListeners('task_completed', data);
    });

    // Guide location update events
    this.socket.on('guide_location_update', (data) => {
      this.triggerListeners('guide_location_update', data);
    });

    // Notification events
    this.socket.on('new_notification', (notification) => {
      this.triggerListeners('new_notification', notification);
    });

    // User events
    this.socket.on('user_online', (data) => {
      this.triggerListeners('user_online', data);
    });

    this.socket.on('user_offline', (data) => {
      this.triggerListeners('user_offline', data);
    });

    // Call events
    this.socket.on('incoming_call', (data) => {
      this.triggerListeners('incoming_call', data);
    });

    this.socket.on('call_accepted', (data) => {
      this.triggerListeners('call_accepted', data);
    });

    this.socket.on('call_rejected', (data) => {
      this.triggerListeners('call_rejected', data);
    });

    this.socket.on('call_ended', (data) => {
      this.triggerListeners('call_ended', data);
    });
  }

  // Get user ID from token (simplified)
  getUserId() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId;
    } catch (error) {
      console.error('Failed to parse token:', error);
      return null;
    }
  }

  // Emit event
  emit(event, data) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot emit:', event);
      return false;
    }

    try {
      this.socket.emit(event, data);
      return true;
    } catch (error) {
      console.error('Emit error:', error, event, data);
      return false;
    }
  }

  // Subscribe to event
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  // Trigger listeners for event
  triggerListeners(event, data) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Listener error:', error, event);
        }
      });
    }
  }

  // Send message
  sendMessage(conversationId, content, attachments = []) {
    return this.emit('send_message', {
      conversationId,
      content,
      attachments,
      timestamp: new Date().toISOString()
    });
  }

  // Join conversation room
  joinConversation(conversationId) {
    return this.emit('join_conversation', { conversationId });
  }

  // Leave conversation room
  leaveConversation(conversationId) {
    return this.emit('leave_conversation', { conversationId });
  }

  // Mark message as delivered
  markMessageDelivered(messageId) {
    return this.emit('message_delivered', { messageId });
  }

  // Mark message as read
  markMessageRead(messageId) {
    return this.emit('message_read', { messageId });
  }

  // Create task
  createTask(taskData) {
    return this.emit('create_task', taskData);
  }

  // Update task
  updateTask(taskId, updates) {
    return this.emit('update_task', { taskId, ...updates });
  }

  // Accept task
  acceptTask(taskId, walkerId) {
    return this.emit('accept_task', { taskId, walkerId });
  }

  // Complete task
  completeTask(taskId) {
    return this.emit('complete_task', { taskId });
  }

  // Send typing indicator
  sendTyping(conversationId, isTyping) {
    return this.emit('typing', { conversationId, isTyping });
  }

  // Start call
  startCall(conversationId, type = 'audio') {
    return this.emit('start_call', { conversationId, type });
  }

  // Accept call
  acceptCall(callId) {
    return this.emit('accept_call', { callId });
  }

  // Reject call
  rejectCall(callId) {
    return this.emit('reject_call', { callId });
  }

  // End call
  endCall(callId) {
    return this.emit('end_call', { callId });
  }

  // Check connection status
  isConnected() {
    return this.socket?.connected || false;
  }

  // Get socket ID
  getSocketId() {
    return this.socket?.id;
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  // Reconnect socket
  reconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
