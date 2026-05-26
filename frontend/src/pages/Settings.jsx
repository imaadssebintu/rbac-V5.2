import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Grid
} from '@mui/material';
import {
  Notifications,
  Security,
  PrivacyTip,
  Payment,
  Language,
  Help,
  Delete,
  Logout,
  DarkMode,
  Email,
  Phone,
  LocationOn
} from '@mui/icons-material';

const Settings = () => {
  const { user, logout } = useAuth();
  const { themeMode, setThemeMode, isDarkMode } = useTheme();

  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      sounds: false,
      taskUpdates: true,
      messages: true
    },
    privacy: {
      profileVisible: true,
      showLocation: false,
      showWalkHistory: true,
      allowMessages: true
    },
    preferences: {
      language: 'en',
      currency: 'USD',
      distanceUnit: 'miles',
      timeFormat: '12h'
    }
  });

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const handleSaveAll = () => {
    // API call to save settings
    alert('Settings saved successfully!');
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      {/* Account Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <Security sx={{ mr: 1 }} /> Account
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Email"
                secondary={user?.email || 'Not set'}
              />
              <Button size="small">Change</Button>
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Phone"
                secondary={user?.phone || 'Not set'}
              />
              <Button size="small">Add</Button>
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Password"
                secondary="••••••••"
              />
              <Button size="small">Change</Button>
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <Notifications sx={{ mr: 1 }} /> Notifications
          </Typography>
          {Object.entries(settings.notifications).map(([key, value]) => (
            <FormControlLabel
              key={key}
              control={
                <Switch
                  checked={value}
                  onChange={(e) => handleSettingChange('notifications', key, e.target.checked)}
                />
              }
              label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              sx={{ display: 'block', mb: 1 }}
            />
          ))}
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <PrivacyTip sx={{ mr: 1 }} /> Privacy
          </Typography>
          {Object.entries(settings.privacy).map(([key, value]) => (
            <FormControlLabel
              key={key}
              control={
                <Switch
                  checked={value}
                  onChange={(e) => handleSettingChange('privacy', key, e.target.checked)}
                />
              }
              label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              sx={{ display: 'block', mb: 1 }}
            />
          ))}
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <Language sx={{ mr: 1 }} /> Preferences
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Language</InputLabel>
                <Select
                  value={settings.preferences.language}
                  onChange={(e) => handleSettingChange('preferences', 'language', e.target.value)}
                  label="Language"
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="es">Spanish</MenuItem>
                  <MenuItem value="fr">French</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Currency</InputLabel>
                <Select
                  value={settings.preferences.currency}
                  onChange={(e) => handleSettingChange('preferences', 'currency', e.target.value)}
                  label="Currency"
                >
                  <MenuItem value="USD">USD ($)</MenuItem>
                  <MenuItem value="EUR">EUR (€)</MenuItem>
                  <MenuItem value="GBP">GBP (£)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Distance Unit</InputLabel>
                <Select
                  value={settings.preferences.distanceUnit}
                  onChange={(e) => handleSettingChange('preferences', 'distanceUnit', e.target.value)}
                  label="Distance Unit"
                >
                  <MenuItem value="miles">Miles</MenuItem>
                  <MenuItem value="km">Kilometers</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Time Format</InputLabel>
                <Select
                  value={settings.preferences.timeFormat}
                  onChange={(e) => handleSettingChange('preferences', 'timeFormat', e.target.value)}
                  label="Time Format"
                >
                  <MenuItem value="12h">12-hour</MenuItem>
                  <MenuItem value="24h">24-hour</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <DarkMode sx={{ mr: 1 }} /> Theme
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Theme Mode</InputLabel>
            <Select
              value={themeMode}
              onChange={(e) => setThemeMode(e.target.value)}
              label="Theme Mode"
            >
              <MenuItem value="light">Light</MenuItem>
              <MenuItem value="dark">Dark</MenuItem>
              <MenuItem value="system">System</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card sx={{ border: '2px solid', borderColor: 'error.main' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="error">
            Danger Zone
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            These actions are irreversible. Please proceed with caution.
          </Alert>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => {
                if (window.confirm('Are you sure you want to delete your account?')) {
                  // API call to delete account
                }
              }}
            >
              Delete Account
            </Button>
            <Button
              variant="outlined"
              startIcon={<Logout />}
              onClick={() => {
                if (window.confirm('Are you sure you want to logout?')) {
                  logout();
                }
              }}
            >
              Logout
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleSaveAll}
        >
          Save All Changes
        </Button>
      </Box>
    </Container>
  );
};

export default Settings;
