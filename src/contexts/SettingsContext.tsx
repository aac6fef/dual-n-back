import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useTranslation } from 'react-i18next';

// Interface for settings stored in the backend
export interface UserSettings {
  n_level: number;
  speed_ms: number;
  session_length: number;
}

// Interface for all settings, including client-side ones
export interface AppSettings extends UserSettings {
  theme: string;
  language: string;
  allowFastSpeed: boolean;
}

// Default settings to be used on first load or if loading fails
const defaultSettings: AppSettings = {
  n_level: 2,
  speed_ms: 2000,
  session_length: 30,
  theme: 'dark',
  language: 'en',
  allowFastSpeed: false,
};

// Type for the context value
interface SettingsContextType {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  saveSettings: () => Promise<void>;
  resetSettings: () => Promise<void>;
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
  const [theme, setTheme] = useLocalStorage('settings:theme', defaultSettings.theme);
  const [language, setLanguage] = useLocalStorage('settings:language', defaultSettings.language);
  const [allowFastSpeed, setAllowFastSpeed] = useLocalStorage('settings:allowFastSpeed', defaultSettings.allowFastSpeed);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const loaded = await invoke<UserSettings>('load_user_settings');
      const fullSettings = {
        ...loaded,
        theme,
        language,
        allowFastSpeed,
      };
      setSettings(fullSettings);
      setInitialState(fullSettings);
    } catch (error) {
      console.error("Failed to load backend settings, using defaults:", error);
      const fullSettings = {
        ...defaultSettings,
        theme,
        language,
        allowFastSpeed,
      };
      setSettings(fullSettings);
      setInitialState(fullSettings);
    } finally {
      setIsLoading(false);
    }
  };

  // Load backend settings on initial mount
  useEffect(() => {
    loadSettings();
  }, []); // Dependencies are intentionally omitted to run only once

  // Sync local storage values with the main settings state
  useEffect(() => {
    setSettings(prev => ({ ...prev, theme, language, allowFastSpeed }));
  }, [theme, language, allowFastSpeed]);

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
    };
    await invoke('save_user_settings', { settings: backendSettings });
    
    // Update local storage values
    setTheme(settings.theme);
    setLanguage(settings.language);
    setAllowFastSpeed(settings.allowFastSpeed);

    // Update initial state to reflect the saved state
    setInitialState(settings);
  };

  const resetSettings = async () => {
    await invoke('reset_all_data');
    // Reset all local storage values to default
    setTheme(defaultSettings.theme);
    setLanguage(defaultSettings.language);
    setAllowFastSpeed(defaultSettings.allowFastSpeed);
    // Reload settings from backend (which are now default)
    await loadSettings();
  };

  const value = {
    settings,
    setSettings,
    saveSettings,
    resetSettings,
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
