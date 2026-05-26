import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Box
} from '@mui/material';
import {
  DarkMode,
  LightMode,
  SettingsBrightness
} from '@mui/icons-material';

const ThemeToggle = ({ variant = 'icon' }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  const handleToggle = () => {
    toggleTheme();
  };

  if (variant === 'switch') {
    return (
      <FormControlLabel
        control={
          <Switch
            checked={isDarkMode}
            onChange={handleToggle}
            color="primary"
          />
        }
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isDarkMode ? (
              <>
                <DarkMode fontSize="small" />
                <span>Dark</span>
              </>
            ) : (
              <>
                <LightMode fontSize="small" />
                <span>Light</span>
              </>
            )}
          </Box>
        }
      />
    );
  }

  if (variant === 'button') {
    return (
      <Tooltip title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
        <IconButton
          onClick={handleToggle}
          color="inherit"
          sx={{
            borderRadius: 2,
            bgcolor: isDarkMode ? 'action.selected' : 'action.hover'
          }}
        >
          {isDarkMode ? <LightMode /> : <DarkMode />}
        </IconButton>
      </Tooltip>
    );
  }

  // Default: icon button
  return (
    <Tooltip title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton
        onClick={handleToggle}
        color="inherit"
        size="small"
      >
        {isDarkMode ? <LightMode /> : <DarkMode />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
