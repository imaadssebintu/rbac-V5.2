import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import DashboardHeader from './common/DashboardHeader';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  // Determine title based on path
  const getTitle = () => {
      const path = location.pathname.split('/')[1];
      if (!path) return 'Dashboard';
      return path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <DashboardHeader title={getTitle()} />
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
