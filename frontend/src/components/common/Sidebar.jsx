import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Typography,
  IconButton,
  Badge,
  Chip,
  Collapse,
  Tooltip
} from '@mui/material';
import {
  Home,
  Person,
  DirectionsWalk,
  ChatBubble,
  Settings,
  Explore,
  Notifications,
  Analytics,
  CalendarToday,
  Payment,
  Groups,
  Group,
  AdminPanelSettings,
  TrendingUp,
  ExpandLess,
  ExpandMore,
  Logout,
  Menu as MenuIcon,
  Close
} from '@mui/icons-material';
import { ROUTES } from '../../utils/constants';

const Sidebar = ({ open, onClose, mobile = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const role = (user?.role || '').toLowerCase();
  const roleLabel = role === 'walker' ? 'Guide' : role === 'walkee' ? 'Traveler' : (user?.role || 'User');

  const [expanded, setExpanded] = useState({
    walker: false,
    admin: false
  });

  const navigationItems = [
    { path: ROUTES.HOME, label: 'Home', icon: <Home />, action: () => {
       // Force navigation to dashboard home
       navigate(ROUTES.HOME);
    }},
    { path: ROUTES.PROFILE, label: 'Profile', icon: <Person /> },
    { path: ROUTES.EXPLORE, label: 'Explore', icon: <Explore /> },
    { path: ROUTES.TASKS, label: 'Trips', icon: <DirectionsWalk /> },
    { path: ROUTES.MESSAGES, label: 'Messages', icon: <ChatBubble />, badge: 3 },
    { path: ROUTES.NOTIFICATIONS, label: 'Notifications', icon: <Notifications />, badge: 5 },
    { path: ROUTES.SCHEDULE, label: 'Schedule', icon: <CalendarToday /> },
    { path: ROUTES.ANALYTICS, label: 'Analytics', icon: <Analytics /> },
    { path: ROUTES.SOCIAL, label: 'Social', icon: <Group /> },
    { path: ROUTES.SETTINGS, label: 'Settings', icon: <Settings /> }
  ];

  const walkerItems = role === 'walker' ? [
    { path: '/guide/earnings', label: 'Earnings', icon: <Payment /> },
    { path: '/guide/clients', label: 'Travelers', icon: <Group /> },
    { path: '/guide/availability', label: 'Availability', icon: <CalendarToday /> },
    { path: '/guide/performance', label: 'Performance', icon: <TrendingUp /> }
  ] : [];

  const adminItems = role === 'admin' ? [
    { path: '/admin/users', label: 'User Management', icon: <Group /> },
    { path: '/admin/trips', label: 'Trip Management', icon: <DirectionsWalk /> },
    { path: '/admin/reports', label: 'Reports', icon: <Analytics /> },
    { path: '/admin/webhooks', label: 'Webhook Audit', icon: <AdminPanelSettings /> },
    { path: '/admin/system', label: 'System Settings', icon: <Settings /> }
  ] : [];

  const handleNavigate = (path) => {
    navigate(path);
    if (mobile) {
      onClose();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    if (mobile) {
      onClose();
    }
  };

  const toggleExpand = (section) => {
    setExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const drawerContent = (
    <Box sx={{ width: 280, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Groups sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h6" fontWeight="bold">
            Voya
          </Typography>
        </Box>

        {mobile && (
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        )}
      </Box>

      <Divider />

      {/* User Profile */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar
          src={user?.profilePicture}
          sx={{ width: 50, height: 50 }}
        >
          {user?.name?.charAt(0)}
        </Avatar>

        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <Typography variant="subtitle1" fontWeight="bold" noWrap>
            {user?.name}
          </Typography>
          <Chip
            label={roleLabel}
            size="small"
            color={user?.role === 'admin' ? 'error' : user?.role === 'walker' ? 'primary' : 'secondary'}
            sx={{ mt: 0.5 }}
          />
        </Box>
      </Box>

      <Divider />

      {/* Navigation */}
      <List sx={{ flex: 1, overflow: 'auto' }}>
        {navigationItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={isActive(item.path)}
              onClick={() => {
                if (item.action) {
                  item.action();
                } else {
                  handleNavigate(item.path);
                }
              }}
              sx={{
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'primary.light',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.light' },
                  '& .MuiListItemIcon-root': { color: 'white' }
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.badge ? (
                  <Badge badgeContent={item.badge} color="error">
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}

        {/* Guide-specific items */}
        {walkerItems.length > 0 && (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={() => toggleExpand('walker')}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <DirectionsWalk />
                </ListItemIcon>
                <ListItemText primary="Guide Tools" />
                {expanded.walker ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>

            <Collapse in={expanded.walker} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {walkerItems.map((item) => (
                  <ListItem key={item.path} disablePadding>
                    <ListItemButton
                      selected={isActive(item.path)}
                      onClick={() => handleNavigate(item.path)}
                      sx={{ pl: 4, borderRadius: 1, mx: 1, mb: 0.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </>
        )}

        {/* Admin-specific items */}
        {adminItems.length > 0 && (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={() => toggleExpand('admin')}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <AdminPanelSettings />
                </ListItemIcon>
                <ListItemText primary="Admin Panel" />
                {expanded.admin ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>

            <Collapse in={expanded.admin} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {adminItems.map((item) => (
                  <ListItem key={item.path} disablePadding>
                    <ListItemButton
                      selected={isActive(item.path)}
                      onClick={() => handleNavigate(item.path)}
                      sx={{ pl: 4, borderRadius: 1, mx: 1, mb: 0.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </>
        )}
      </List>

      <Divider />

      {/* Footer */}
      <Box sx={{ p: 2 }}>
        <ListItemButton onClick={handleLogout}>
          <ListItemIcon>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </Box>
    </Box>
  );

  if (mobile) {
    return (
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            bgcolor: isDarkMode ? 'background.dark' : 'background.paper'
          }
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 280,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 280,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: isDarkMode ? 'background.dark' : 'background.paper'
        }
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
