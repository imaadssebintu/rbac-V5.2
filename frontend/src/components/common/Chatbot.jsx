import React, { useMemo, useState } from 'react';
import { Box, Fab, Drawer, Typography, IconButton } from '@mui/material';
import { Chat as ChatIcon, Close as CloseIcon } from '@mui/icons-material';
import ReactChatbotKit from 'react-chatbot-kit';
import 'react-chatbot-kit/build/main.css';
import createChatbotConfig from './chatbot/config';
import MessageParser from './chatbot/MessageParser';
import ActionProvider from './chatbot/ActionProvider';
import { useAuth } from '../../context/AuthContext';

const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const config = useMemo(() => createChatbotConfig(user), [user]);

  return (
    <>
      <Fab
        color="primary"
        aria-label="chat"
        onClick={() => setOpen(true)}
        sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1400 }}
      >
        <ChatIcon />
      </Fab>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: { xs: 320, sm: 360 }, p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Voya Assistant</Typography>
            <IconButton onClick={() => setOpen(false)}><CloseIcon /></IconButton>
          </Box>

          <Box
            sx={{
              mt: 1,
              flex: 1,
              overflow: 'hidden',
              '& .react-chatbot-kit-chat-container': {
                width: '100%',
                height: '100%'
              },
              '& .react-chatbot-kit-chat-inner-container': {
                height: '100%'
              },
              '& .react-chatbot-kit-chat-bot-message': {
                marginLeft: 0
              }
            }}
          >
            <ReactChatbotKit
              config={config}
              messageParser={MessageParser}
              actionProvider={ActionProvider}
            />
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default Chatbot;
