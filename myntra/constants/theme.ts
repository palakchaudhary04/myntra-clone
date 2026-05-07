import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: typeof Colors.light;
  themeMode: ThemeMode;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(Appearance.getColorScheme() || 'light');

  useEffect(() => {
    // Load persisted theme on launch
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('user-theme');
      if (savedTheme) {
        setThemeMode(savedTheme as ThemeMode);
      } else {
        // Fallback to device appearance
        setThemeMode(Appearance.getColorScheme() || 'light');
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
    await AsyncStorage.setItem('user-theme', newMode);
  };

  const theme = Colors[themeMode];

  return React.createElement(ThemeContext.Provider, { value: { theme, themeMode, toggleTheme } }, children);
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};