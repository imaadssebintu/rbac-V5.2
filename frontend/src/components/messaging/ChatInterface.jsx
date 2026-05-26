import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  IconButton,
  Avatar,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText
} from '@mui/material';
import { Send as SendIcon, AttachFile as AttachIcon, Phone as PhoneIcon } from '@mui/icons-material';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { messageAPI } from '../../services/api';

const ChatInterface = ({ conversationId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const { socket } = useSocket();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // support starting a new chat by passing conversationId as "new-{recipientId}"
  const isNewConversation = typeof conversationId === 'string' && conversationId?.startsWith('new-');
  const recipientId = isNewConversation ? conversationId.replace('new-', '') : null;
  const activeChatUserId = recipientId || conversationId;

  useEffect(() => {
    fetchMessages();

    if (socket) {
      socket.on('new_message', (message) => {
        const senderId = String(message.sender_id || message.senderId || message?.Sender?.id || '');
        const receiverId = String(message.receiver_id || message.receiverId || message?.Receiver?.id || '');
        const currentUserId = String(user?.id || '');
        const chatUserId = String(activeChatUserId || '');

        const belongsToCurrentChat =
          (senderId === currentUserId && receiverId === chatUserId) ||
          (senderId === chatUserId && receiverId === currentUserId);

        if (belongsToCurrentChat) {
          setMessages(prev => [...prev, message]);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('new_message');
      }
    };
  }, [conversationId, socket, activeChatUserId, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      if (isNewConversation) {
        setMessages([]);
        return;
      }

      const response = await messageAPI.getMessages(conversationId);
      setMessages(response.data?.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChatUserId) return;

    const messageData = {
      receiver_id: activeChatUserId,
      content: newMessage
    };

    try {
      await messageAPI.sendMessage(messageData);

      if (socket) {
        socket.emit('send_message', messageData);
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
      {/* Messages Container */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        <List>
          {messages.map((message) => (
            (() => {
              const senderId = String(message.sender_id || message.senderId || message?.Sender?.id || '');
              const isOwnMessage = senderId === String(user?.id || '');

              return (
            <ListItem
              key={message.id}
              sx={{
                flexDirection: isOwnMessage ? 'row-reverse' : 'row',
                alignItems: 'flex-start'
              }}
            >
              <ListItemAvatar>
                <Avatar src={message?.Sender?.profile_image || message.sender?.avatar} />
              </ListItemAvatar>
              <Paper
                sx={{
                  p: 2,
                  maxWidth: '70%',
                  bgcolor: isOwnMessage ? 'primary.main' : 'background.paper',
                  color: isOwnMessage ? 'white' : 'text.primary',
                  borderRadius: 2
                }}
              >
                <ListItemText
                  primary={message.content}
                  secondary={new Date(message.createdAt || message.created_at || message.timestamp || Date.now()).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  secondaryTypographyProps={{
                    color: isOwnMessage ? 'rgba(255,255,255,0.7)' : 'text.secondary'
                  }}
                />
              </Paper>
            </ListItem>
              );
            })()
          ))}
          <div ref={messagesEndRef} />
        </List>
      </Box>

      {/* Input Area */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton>
            <AttachIcon />
          </IconButton>

          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            size="small"
          />

          <IconButton
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
          >
            <SendIcon />
          </IconButton>
          <IconButton
            onClick={() => {
              if (activeChatUserId) {
                if (socket) {
                  socket.emit('start_call', { toUserId: activeChatUserId, type: 'audio' });
                }
                navigate(`/call/${activeChatUserId}`);
              }
            }}
            disabled={!activeChatUserId}
            title={activeChatUserId ? 'Start call' : 'Call unavailable'}
            sx={{ ml: 1 }}
          >
            <PhoneIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatInterface;
