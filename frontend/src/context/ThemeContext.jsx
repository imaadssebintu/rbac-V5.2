import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';

const ThemeContext = createContext();

const getSystemMode = () => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('themeMode') || 'system';
  });
  const [systemMode, setSystemMode] = useState(getSystemMode());

  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setSystemMode(media.matches ? 'dark' : 'light');

    handleChange();
    if (media.addEventListener) {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  const resolvedTheme = themeMode === 'system' ? systemMode : themeMode;
  const isDarkMode = resolvedTheme === 'dark';

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const value = useMemo(
    () => ({ themeMode, setThemeMode, resolvedTheme, isDarkMode, toggleTheme }),
    [themeMode, resolvedTheme, isDarkMode]
  );

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-theme', resolvedTheme);
    }
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
