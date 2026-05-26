import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  InputBase,
  Box
} from '@mui/material';
import {
  Home as HomeIcon,
  Search as SearchIcon,
  Explore as ExploreIcon,
  FavoriteBorder as LikeIcon,
  ChatBubbleOutline as MessageIcon,
  AddCircleOutline as AddIcon,
  NotificationsNone as NotifIcon
} from '@mui/icons-material';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import SettingsIcon from '@mui/icons-material/Settings';

const Header = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { themeMode, setThemeMode, isDarkMode } = useTheme();
  const { user, logout } = useAuth();
  const { notifications } = useSocket();
  const navigate = useNavigate();

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        background: isDarkMode ? '#1E1E1E' : '#FFFFFF',
        borderBottom: `1px solid ${isDarkMode ? '#333' : '#DBDBDB'}`
      }}
      elevation={0}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1, sm: 3 } }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <Box
            component="span"
            sx={{
              fontSize: '1.8rem',
              fontWeight: 700,
              fontFamily: '"Fraunces", serif',
              background: 'linear-gradient(45deg, #0B6E99, #F28C28)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Voya
          </Box>
        </Box>

        {/* Search Bar - Instagram Style */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            position: 'relative',
            width: '268px'
          }}
        >
          <SearchIcon
            sx={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#8E8E8E'
            }}
          />
          <InputBase
            placeholder="Search"
            sx={{
              pl: 5,
              width: '100%',
              bgcolor: isDarkMode ? '#262626' : '#EFEFEF',
              borderRadius: 8,
              py: 0.5,
              fontSize: 14,
              '& input': { py: 1 }
            }}
          />
        </Box>

        {/* Navigation Icons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/')}>
            <HomeIcon sx={{ fontSize: 28 }} />
          </IconButton>

          <IconButton>
            <Badge badgeContent={notifications.length} color="error">
              <MessageIcon sx={{ fontSize: 28 }} />
            </Badge>
          </IconButton>

          <IconButton>
            <AddIcon sx={{ fontSize: 32, color: '#E4405F' }} />
          </IconButton>

          <IconButton>
            <ExploreIcon sx={{ fontSize: 28 }} />
          </IconButton>

          <IconButton>
            <Badge badgeContent={4} color="error">
              <NotifIcon sx={{ fontSize: 28 }} />
            </Badge>
          </IconButton>

          {/* Profile Menu */}
          <IconButton onClick={handleMenu}>
            <Avatar
              src={user?.profilePicture}
              sx={{ width: 28, height: 28 }}
            >
              {user?.name?.charAt(0)}
            </Avatar>
          </IconButton>

          <IconButton onClick={() => navigate('/settings')} title="Settings">
            <SettingsIcon />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={() => { handleClose(); navigate('/profile'); }}>
              Profile
            </MenuItem>
            <MenuItem onClick={() => { handleClose(); navigate('/settings'); }}>
              Settings
            </MenuItem>
            <MenuItem onClick={() => { setThemeMode('light'); handleClose(); }}>
              Light Mode {themeMode === 'light' ? '✓' : ''}
            </MenuItem>
            <MenuItem onClick={() => { setThemeMode('dark'); handleClose(); }}>
              Dark Mode {themeMode === 'dark' ? '✓' : ''}
            </MenuItem>
            <MenuItem onClick={() => { setThemeMode('system'); handleClose(); }}>
              System {themeMode === 'system' ? '✓' : ''}
            </MenuItem>
            <MenuItem onClick={logout}>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
