import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Fab,
  Tooltip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent
} from '@mui/material';
import {
  CallEnd,
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  Chat
} from '@mui/icons-material';
import ChatInterface from '../components/messaging/ChatInterface';

const Call = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [timer, setTimer] = useState(0);
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [chatOpen, setChatOpen] = useState(false);

  const localVideoRef = useRef(null);

  useEffect(() => {
    if (!socket || !id) return;

    socket.emit('start_call', { toUserId: id, type: 'audio' });

    const handleAccepted = (data) => {
      if (String(data?.byUserId) === String(id)) {
        setIsConnected(true);
        setCallStatus('Connected');
      }
    };

    const handleRejected = (data) => {
      if (String(data?.byUserId) === String(id)) {
        setCallStatus('Call rejected');
      }
    };

    const handleEnded = (data) => {
      if (String(data?.byUserId) === String(id)) {
        setCallStatus('Call ended');
      }
    };

    const handleIncoming = (data) => {
      if (String(data?.fromUserId) === String(id)) {
        socket.emit('accept_call', { toUserId: id });
        setIsConnected(true);
        setCallStatus('Connected');
      }
    };

    socket.on('call_accepted', handleAccepted);
    socket.on('call_rejected', handleRejected);
    socket.on('call_ended', handleEnded);
    socket.on('incoming_call', handleIncoming);

    const fallbackTimer = setTimeout(() => {
      setIsConnected(true);
      setCallStatus('Connected');
    }, 2000);

    return () => {
      clearTimeout(fallbackTimer);
      socket.off('call_accepted', handleAccepted);
      socket.off('call_rejected', handleRejected);
      socket.off('call_ended', handleEnded);
      socket.off('incoming_call', handleIncoming);
    };
  }, [socket, id]);

  useEffect(() => {
    let interval;
    if (isConnected) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  // Start/Stop local video stream
  useEffect(() => {
    let stream = null;

    const startVideo = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.error("Error accessing media devices:", err);
      }
    };

    if (!isVideoOff) {
      startVideo();
    } else {
      // Stop tracks if video is turned off
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const tracks = localVideoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        localVideoRef.current.srcObject = null;
      }
    }

    return () => {
      if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [isVideoOff]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleEndCall = () => {
    if (socket && id) {
      socket.emit('end_call', { toUserId: id });
    }

    // Cleanup media tracks before navigating
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const tracks = localVideoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    }
    navigate(-1);
  };

  return (
    <Box
      sx={{
        bgcolor: '#000',
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Main Video Area (Remote Stream Placeholder) */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#1a1a1a',
        }}
      >
        {!isConnected ? (
          <Box sx={{ textAlign: 'center', color: 'white' }}>
            <Avatar
              src={`https://ui-avatars.com/api/?name=${id}&background=random`}
              sx={{
                width: 120,
                height: 120,
                mb: 3,
                mx: 'auto',
                border: '4px solid white',
              }}
            />
            <Typography variant="h5" sx={{ mb: 1 }}>
              Calling {id}...
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              {callStatus}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', opacity: 0.3 }}>
            <Typography variant="h3" color="white" fontWeight="bold">
              USER VIDEO
            </Typography>
            <Typography variant="body1" color="white">
              (Remote Stream Placeholder)
            </Typography>
          </Box>
        )}

        {/* Local Video (PiP) */}
        {!isVideoOff && (
          <Paper
            elevation={4}
            sx={{
              position: 'absolute',
              top: 20,
              right: 20,
              width: 180,
              height: 135,
              bgcolor: 'black',
              borderRadius: 2,
              overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.2)',
              zIndex: 10,
            }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)', // Mirror effect
              }}
            />
          </Paper>
        )}

        {/* Call Timer Overlay */}
        {isConnected && (
          <Box
            sx={{
              position: 'absolute',
              top: 20,
              left: 20,
              bgcolor: 'rgba(0,0,0,0.6)',
              px: 2,
              py: 0.5,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                bgcolor: 'error.main',
                borderRadius: '50%',
              }}
            />
            <Typography variant="body2" color="white" fontWeight="bold">
              {formatTime(timer)}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Controls Bar */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          justifyContent: 'center',
          gap: 3,
          bgcolor: 'rgba(0,0,0,0.9)',
        }}
      >
        <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
          <Fab
            color={isMuted ? 'default' : 'secondary'}
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </Fab>
        </Tooltip>

        <Tooltip title={isVideoOff ? 'Start Video' : 'Stop Video'}>
          <Fab
            color={isVideoOff ? 'default' : 'secondary'}
            onClick={() => setIsVideoOff(!isVideoOff)}
          >
            {isVideoOff ? <VideocamOff /> : <Videocam />}
          </Fab>
        </Tooltip>

        <Tooltip title="End Call">
          <Fab
            color="error"
            onClick={handleEndCall}
            sx={{ px: 4, borderRadius: 8 }}
          >
            <CallEnd />
          </Fab>
        </Tooltip>

        <Tooltip title="Chat">
          <IconButton
            sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}
            onClick={() => setChatOpen(true)}
          >
            <Chat />
          </IconButton>
        </Tooltip>
      </Box>

      <Dialog
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            height: { xs: '80vh', md: '70vh' },
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          Chat During Call
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <ChatInterface conversationId={`new-${id}`} />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Call;
