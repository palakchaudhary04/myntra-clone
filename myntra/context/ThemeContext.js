import React, { createContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../constants/theme';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(lightTheme);

  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    const savedMode = await AsyncStorage.getItem('userTheme');
    if (savedMode) {
      setTheme(savedMode === 'dark' ? darkTheme : lightTheme);
    } else {
      // Auto-detect device setting on first launch
      const systemMode = Appearance.getColorScheme();
      setTheme(systemMode === 'dark' ? darkTheme : lightTheme);
    }
  };

  const toggleTheme = async () => {
    const newMode = theme === lightTheme ? 'dark' : 'light';
    setTheme(newMode === 'dark' ? darkTheme : lightTheme);
    await AsyncStorage.setItem('userTheme', newMode);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};