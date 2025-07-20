import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useTranslation } from 'react-i18next';

// Interface for settings stored in the backend
export interface UserSettings {
  n_level: number;
  speed_ms: number;
  session_length: number;
  grid_size: number;
}

// Interface for all settings, including client-side ones
export interface AppSettings extends UserSettings {
  visualFeedback: boolean;
  theme: string;
  language: string;
}

// Default settings to be used on first load or if loading fails
const defaultSettings: AppSettings = {
  n_level: 2,
  speed_ms: 2000,
  session_length: 30,
  grid_size: 3,
  visualFeedback: true,
  theme: 'dark',
  language: 'en',
};

// Type for the context value
interface SettingsContextType {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  saveSettings: () => Promise<void>;
  isLoading: boolean;
  isDirty: boolean;
  initialState: AppSettings;
}

// Create the context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Provider component
export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [initialState, setInitialState] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Local storage hooks
  const [visualFeedback, setVisualFeedback] = useLocalStorage('settings:visualFeedback', defaultSettings.visualFeedback);
  const [theme, setTheme] = useLocalStorage('settings:theme', defaultSettings.theme);
  const [language, setLanguage] = useLocalStorage('settings:language', defaultSettings.language);

  // Load backend settings on initial mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loaded = await invoke<UserSettings>('load_user_settings');
        const fullSettings = {
          ...loaded,
          visualFeedback,
          theme,
          language,
        };
        setSettings(fullSettings);
        setInitialState(fullSettings);
      } catch (error) {
        console.error("Failed to load backend settings, using defaults:", error);
        const fullSettings = {
          ...defaultSettings,
          visualFeedback,
          theme,
          language,
        };
        setSettings(fullSettings);
        setInitialState(fullSettings);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []); // Dependencies are intentionally omitted to run only once

  // Sync local storage values with the main settings state
  useEffect(() => {
    setSettings(prev => ({ ...prev, visualFeedback, theme, language }));
  }, [visualFeedback, theme, language]);

  // Effect to apply theme and language changes globally
  useEffect(() => {
    document.body.classList.toggle('light-theme', settings.theme === 'light');
    if (i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.theme, settings.language, i18n]);

  const isDirty = JSON.stringify(initialState) !== JSON.stringify(settings);

  const saveSettings = async () => {
    const backendSettings: UserSettings = {
      n_level: settings.n_level,
      speed_ms: settings.speed_ms,
      session_length: settings.session_length,
      grid_size: settings.grid_size,
    };
    await invoke('save_user_settings', { settings: backendSettings });
    
    // Update local storage values
    setVisualFeedback(settings.visualFeedback);
    setTheme(settings.theme);
    setLanguage(settings.language);

    // Update initial state to reflect the saved state
    setInitialState(settings);
  };

  const value = {
    settings,
    setSettings,
    saveSettings,
    isLoading,
    isDirty,
    initialState,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook to use the settings context
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
