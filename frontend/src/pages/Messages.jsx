import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { messageAPI } from '../services/api';
import {
  Box,
  Container,
  Grid,
  Card,
  Typography,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  IconButton,
  Divider
} from '@mui/material';
import {
  Search,
  Send,
  AttachFile,
  Image,
  Mic,
  MoreVert,
  CheckCircle
} from '@mui/icons-material';
import ChatInterface from '../components/messaging/ChatInterface';
import MessageList from '../components/messaging/MessageList';

const Messages = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [conversationsState, setConversationsState] = useState([]);
  const location = useLocation();

  const conversations = conversationsState;
  const selectedConversation = conversations.find((c) => String(c.id) === String(selectedChat));
  const selectedNewUserId =
    typeof selectedChat === 'string' && selectedChat.startsWith('new-')
      ? selectedChat.replace('new-', '')
      : null;
  
  // read navigation state for a target user to start messaging (history state may contain usr)
  const navState = window.history.state && window.history.state.usr ? window.history.state.usr : null;

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const resp = await messageAPI.getConversations();
        const data = resp.data || [];
        setConversationsState(data);

        // if navigated here with a userId in location.state, select the matching conversation
        const targetUserId = location?.state?.userId || navState?.userId || (new URLSearchParams(window.location.search)).get('userId');
        if (targetUserId) {
          const conv = data.find(c => String(c.user?.id) === String(targetUserId));
          if (conv) {
            setSelectedChat(conv.id);
          } else {
            // start a new conversation by setting a temporary id 'new-{userId}'
            setSelectedChat(`new-${targetUserId}`);
          }
        }
      } catch (err) {
        console.error('Failed to load conversations', err);
      }
    };

    loadConversations();
  }, []);

  return (
    <Container maxWidth="xl" sx={{ py: 3, height: '85vh' }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* Conversations List */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2 }}>
              <TextField
                fullWidth
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
              />
            </Box>
            <Divider />

            <Box sx={{ flex: 1 }}>
              <MessageList
                conversations={conversations}
                onSelectConversation={(id) => setSelectedChat(id)}
                selectedConversationId={selectedChat}
              />
            </Box>
          </Card>
        </Grid>

        {/* Chat Area */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <Box sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar>
                      {(selectedConversation?.user?.name || 'User')?.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">
                        {selectedConversation?.user?.name || (selectedNewUserId ? `User ${selectedNewUserId}` : 'Unknown User')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedConversation?.user?.online ?
                          'Online' : 'Last seen 2h ago'}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton>
                    <MoreVert />
                  </IconButton>
                </Box>

                {/* Chat Messages */}
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  <ChatInterface conversationId={selectedChat} />
                </Box>
              </>
            ) : (
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center'
              }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Select a conversation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose a conversation from the list to start messaging
                </Typography>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Messages;
