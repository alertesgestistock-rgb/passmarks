import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTelegram } from '@/hooks/useTelegram';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const { isTelegram, colorScheme } = useTelegram();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('pm_theme') || 'dark';
  });

  // Inside Telegram, follow Telegram's own light/dark setting instead of the
  // stored web preference — matches the host app, as Telegram Mini Apps do.
  useEffect(() => {
    if (isTelegram && colorScheme) {
      setTheme(colorScheme);
    }
  }, [isTelegram, colorScheme]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('pm_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
