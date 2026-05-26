import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const { token } = useAuth();

  const getSocketUrl = () => {
    const explicitUrl = process.env.REACT_APP_SOCKET_URL;
    if (explicitUrl) return explicitUrl;

    const isLocalFrontend = typeof window !== 'undefined'
      && ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const useRemoteApiInLocal = process.env.REACT_APP_USE_REMOTE_API_IN_LOCAL === 'true';

    const apiUrl = (isLocalFrontend && !useRemoteApiInLocal)
      ? (process.env.REACT_APP_LOCAL_API_URL || 'http://localhost:5000/api')
      : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api');

    return apiUrl.replace(/\/api\/?$/, '');
  };

  useEffect(() => {
    if (token) {
      const newSocket = io(getSocketUrl(), {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Socket connected');
      });

      newSocket.on('connect_error', (error) => {
        console.warn('Socket connection error:', error?.message || error);
      });

      newSocket.on('new_message', (data) => {
        setNotifications(prev => [...prev, data]);
      });

      newSocket.on('task_update', (data) => {
        setNotifications(prev => [...prev, data]);
      });

      return () => newSocket.close();
    }
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, notifications, setNotifications }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
