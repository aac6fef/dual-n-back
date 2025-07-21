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
  reduceMotion: boolean;
  positionKeys: string[];
  audioKeys: string[];
  autoAdjustNLevel: boolean;
  highAccuracyThreshold: number;
  lowAccuracyThreshold: number;
}

// Default settings to be used on first load or if loading fails
const defaultSettings: AppSettings = {
  n_level: 2,
  speed_ms: 2000,
  session_length: 30,
  theme: 'dark',
  language: 'en',
  allowFastSpeed: false,
  reduceMotion: false,
  positionKeys: ['p', 'h', '[', 'ArrowRight'],
  audioKeys: ['a', 'l', ']', 'ArrowLeft'],
  autoAdjustNLevel: true,
  highAccuracyThreshold: 90,
  lowAccuracyThreshold: 50,
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
  const [reduceMotion, setReduceMotion] = useLocalStorage('settings:reduceMotion', defaultSettings.reduceMotion);
  const [positionKeys, setPositionKeys] = useLocalStorage('settings:positionKeys', defaultSettings.positionKeys);
  const [audioKeys, setAudioKeys] = useLocalStorage('settings:audioKeys', defaultSettings.audioKeys);
  const [autoAdjustNLevel, setAutoAdjustNLevel] = useLocalStorage('settings:autoAdjustNLevel', defaultSettings.autoAdjustNLevel);
  const [highAccuracyThreshold, setHighAccuracyThreshold] = useLocalStorage('settings:highAccuracyThreshold', defaultSettings.highAccuracyThreshold);
  const [lowAccuracyThreshold, setLowAccuracyThreshold] = useLocalStorage('settings:lowAccuracyThreshold', defaultSettings.lowAccuracyThreshold);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const loaded = await invoke<UserSettings>('load_user_settings');
      const fullSettings = {
        ...loaded,
        theme,
        language,
        allowFastSpeed,
        reduceMotion,
        positionKeys,
        audioKeys,
        autoAdjustNLevel,
        highAccuracyThreshold,
        lowAccuracyThreshold,
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
        reduceMotion,
        positionKeys,
        audioKeys,
        autoAdjustNLevel,
        highAccuracyThreshold,
        lowAccuracyThreshold,
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
    setSettings(prev => ({ ...prev, theme, language, allowFastSpeed, reduceMotion, positionKeys, audioKeys, autoAdjustNLevel, highAccuracyThreshold, lowAccuracyThreshold }));
  }, [theme, language, allowFastSpeed, reduceMotion, positionKeys, audioKeys, autoAdjustNLevel, highAccuracyThreshold, lowAccuracyThreshold]);

  // Effect to apply theme and language changes globally
  useEffect(() => {
    // Apply theme class to the root element for global scope
    const root = document.documentElement;
    if (settings.theme === 'light') {
      root.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
    }

    if (settings.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    if (i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.theme, settings.language, settings.reduceMotion, i18n]);

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
    setReduceMotion(settings.reduceMotion);
    setPositionKeys(settings.positionKeys);
    setAudioKeys(settings.audioKeys);
    setAutoAdjustNLevel(settings.autoAdjustNLevel);
    setHighAccuracyThreshold(settings.highAccuracyThreshold);
    setLowAccuracyThreshold(settings.lowAccuracyThreshold);

    // Update initial state to reflect the saved state
    setInitialState(settings);
  };

  const resetSettings = async () => {
    await invoke('reset_all_data');
    
    // Reset all local storage values to default
    setTheme(defaultSettings.theme);
    setLanguage(defaultSettings.language);
    setAllowFastSpeed(defaultSettings.allowFastSpeed);
    setReduceMotion(defaultSettings.reduceMotion);
    setPositionKeys(defaultSettings.positionKeys);
    setAudioKeys(defaultSettings.audioKeys);
    setAutoAdjustNLevel(defaultSettings.autoAdjustNLevel);
    setHighAccuracyThreshold(defaultSettings.highAccuracyThreshold);
    setLowAccuracyThreshold(defaultSettings.lowAccuracyThreshold);

    // Directly set the state to default settings
    setSettings(defaultSettings);
    setInitialState(defaultSettings);
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
