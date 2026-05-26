import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography
} from '@mui/material';
import { Home as HomeIcon, Logout as LogoutIcon } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const DashboardHeader = ({ title }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/', { replace: true });
  };

  const headerClickTimeoutRef = React.useRef(null);

  const handleHeaderClick = () => {
    if (headerClickTimeoutRef.current) {
      clearTimeout(headerClickTimeoutRef.current);
      headerClickTimeoutRef.current = null;
      navigate('/landing');
    } else {
      headerClickTimeoutRef.current = setTimeout(() => {
        headerClickTimeoutRef.current = null;
        navigate(-1);
      }, 300);
    }
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: isDarkMode ? '#1E1E1E' : '#FFFFFF',
        borderBottom: `1px solid ${isDarkMode ? '#333' : '#DBDBDB'}`
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button startIcon={<HomeIcon />} onClick={handleHeaderClick}>
            Voya
          </Button>
          {title ? (
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
          ) : null}
        </Box>

        <Box>
          <IconButton onClick={handleMenuOpen}>
            <Avatar src={user?.profilePicture} sx={{ width: 32, height: 32 }}>
              {user?.name?.charAt(0)}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem
              onClick={() => {
                handleMenuClose();
                navigate('/profile');
              }}
            >
              Profile
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleMenuClose();
                navigate('/settings');
              }}
            >
              Settings
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1, width: 20, height: 20 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default DashboardHeader;
