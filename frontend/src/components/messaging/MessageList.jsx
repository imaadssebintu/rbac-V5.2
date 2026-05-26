import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  MoreVert,
  Delete,
  Archive,
  Block,
  Report,
  CheckCircle,
  DoneAll,
  Schedule
} from '@mui/icons-material';
import { messageAPI } from '../../services/api';
import { formatDate } from '../../utils/helpers';

const MessageList = ({ conversations, onSelectConversation, selectedConversationId }) => {
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const listRef = useRef();

  useEffect(() => {
    // Scroll to selected conversation
    if (selectedConversationId && listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-conversation-id="${selectedConversationId}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedConversationId]);

  const handleConversationClick = (conversation) => {
    if (onSelectConversation) {
      onSelectConversation(conversation.id);
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;

    try {
      await messageAPI.deleteConversation(conversationId);
      // Refresh conversations list
      setAnchorEl(null);
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const handleArchiveConversation = async (conversationId) => {
    try {
      await messageAPI.archiveConversation(conversationId);
      setAnchorEl(null);
    } catch (error) {
      console.error('Error archiving conversation:', error);
    }
  };

  const handleBlockUser = async (userId) => {
    if (!window.confirm('Are you sure you want to block this user?')) return;

    try {
      await messageAPI.blockUser(userId);
      setAnchorEl(null);
    } catch (error) {
      console.error('Error blocking user:', error);
    }
  };

  const getLastMessagePreview = (lastMessage) => {
    if (!lastMessage) return '';

    if (lastMessage.type === 'image') {
      return '📷 Photo';
    }

    if (lastMessage.type === 'file') {
      return '📎 File';
    }

    return lastMessage.content.length > 50
      ? lastMessage.content.substring(0, 50) + '...'
      : lastMessage.content;
  };

  const getMessageStatusIcon = (message) => {
    if (!message) return null;

    if (message.status === 'delivered') {
      return <DoneAll sx={{ fontSize: 16, color: 'text.secondary' }} />;
    }

    if (message.status === 'read') {
      return <DoneAll sx={{ fontSize: 16, color: 'primary.main' }} />;
    }

    if (message.status === 'sent') {
      return <CheckCircle sx={{ fontSize: 16, color: 'text.secondary' }} />;
    }

    return <Schedule sx={{ fontSize: 16, color: 'text.secondary' }} />;
  };

  const ConversationItem = ({ conversation }) => {
    const isSelected = selectedConversationId === conversation.id;
    const unreadCount = conversation.unreadCount || 0;
    const lastMessage = conversation.lastMessage;

    return (
      <ListItem
        button
        selected={isSelected}
        onClick={() => handleConversationClick(conversation)}
        sx={{
          borderRadius: 2,
          mb: 1,
          '&:hover': { bgcolor: 'action.hover' },
          '&.Mui-selected': {
            bgcolor: 'primary.light',
            '&:hover': { bgcolor: 'primary.light' }
          },
          position: 'relative'
        }}
        data-conversation-id={conversation.id}
      >
        {/* Unread badge */}
        {unreadCount > 0 && (
          <Badge
            badgeContent={unreadCount}
            color="error"
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              '& .MuiBadge-badge': {
                fontSize: '0.6rem',
                height: 18,
                minWidth: 18
              }
            }}
          />
        )}

        <ListItemAvatar>
          <Badge
            color="success"
            variant="dot"
            invisible={!conversation.user?.online}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right'
            }}
          >
            <Avatar src={conversation.user?.profilePicture}>
              {conversation.user?.name?.charAt(0)}
            </Avatar>
          </Badge>
        </ListItemAvatar>

        <ListItemText
          primary={
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" fontWeight={unreadCount > 0 ? 'bold' : 'normal'}>
                {conversation.user?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {lastMessage ? formatDate(lastMessage.createdAt, 'relative') : ''}
              </Typography>
            </Box>
          }
          secondary={
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography
                variant="body2"
                color={unreadCount > 0 ? 'text.primary' : 'text.secondary'}
                sx={{
                  fontWeight: unreadCount > 0 ? 'medium' : 'normal',
                  maxWidth: '70%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {lastMessage && getMessageStatusIcon(lastMessage)}
                {lastMessage?.senderId === 'me' ? 'You: ' : ''}
                {getLastMessagePreview(lastMessage)}
              </Typography>

              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setAnchorEl(e.currentTarget);
                  setSelectedConversation(conversation);
                }}
                sx={{ ml: 1 }}
              >
                <MoreVert fontSize="small" />
              </IconButton>
            </Box>
          }
        />
      </ListItem>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (conversations.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No conversations
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Start a conversation by messaging a guide or traveler
        </Typography>
      </Box>
    );
  }

  return (
    <Box ref={listRef} sx={{ height: '100%', overflow: 'auto' }}>
      <List>
        {conversations.map((conversation) => (
          <ConversationItem key={conversation.id} conversation={conversation} />
        ))}
      </List>

      {/* Conversation Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {selectedConversation && (
          <>
            <MenuItem onClick={() => handleArchiveConversation(selectedConversation.id)}>
              <Archive sx={{ mr: 1 }} />
              Archive
            </MenuItem>

            <MenuItem onClick={() => handleDeleteConversation(selectedConversation.id)} sx={{ color: 'error.main' }}>
              <Delete sx={{ mr: 1 }} />
              Delete
            </MenuItem>

            <Divider />

            <MenuItem onClick={() => handleBlockUser(selectedConversation.user?.id)}>
              <Block sx={{ mr: 1 }} />
              Block User
            </MenuItem>

            <MenuItem>
              <Report sx={{ mr: 1 }} />
              Report
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
};

export default MessageList;
