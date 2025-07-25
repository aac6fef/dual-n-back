import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { locale } from '@tauri-apps/plugin-os';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useTranslation } from 'react-i18next';

export enum AuditoryStimulusSet {
  AllLetters = 'AllLetters',
  NonConfusingLetters = 'NonConfusingLetters',
  TianGanDiZhi = 'TianGanDiZhi',
}

// Interface for settings stored in the backend
export interface UserSettings {
  n_level: number;
  speed_ms: number;
  session_length: number;
  auditory_stimulus_set: AuditoryStimulusSet;
}

// Interface for all settings, including client-side ones
export interface AppSettings extends UserSettings {
  theme: string;
  language: string;
  followSystemLanguage: boolean;
  followSystemTheme: boolean;
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
  auditory_stimulus_set: AuditoryStimulusSet.AllLetters,
  theme: 'dark',
  language: 'en',
  followSystemLanguage: true,
  followSystemTheme: true,
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
  const [followSystemLanguage, setFollowSystemLanguage] = useLocalStorage('settings:followSystemLanguage', defaultSettings.followSystemLanguage);
  const [followSystemTheme, setFollowSystemTheme] = useLocalStorage('settings:followSystemTheme', defaultSettings.followSystemTheme);
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
        followSystemLanguage,
        followSystemTheme,
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
        followSystemLanguage,
        followSystemTheme,
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
    setSettings(prev => ({ ...prev, theme, language, followSystemLanguage, followSystemTheme, allowFastSpeed, reduceMotion, positionKeys, audioKeys, autoAdjustNLevel, highAccuracyThreshold, lowAccuracyThreshold }));
  }, [theme, language, followSystemLanguage, followSystemTheme, allowFastSpeed, reduceMotion, positionKeys, audioKeys, autoAdjustNLevel, highAccuracyThreshold, lowAccuracyThreshold]);

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

  // Effect to sync with system language when the toggle is turned on
  useEffect(() => {
    // Do not run on initial mount, wait for settings to be loaded
    if (isLoading) {
      return;
    }

    if (settings.followSystemLanguage) {
      const syncWithSystem = async () => {
        const systemLocale = await locale();
        const newLanguage = systemLocale?.toLowerCase().startsWith('zh') ? 'zh_cn' : 'en';
        if (settings.language !== newLanguage) {
          setSettings(prev => ({ ...prev, language: newLanguage }));
        }
      };
      syncWithSystem();
    }
  }, [settings.followSystemLanguage, isLoading]);

  // Effect to sync with system theme when the toggle is turned on
  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (settings.followSystemTheme) {
      const syncTheme = async () => {
        const systemTheme = await getCurrentWindow().theme();
        if (systemTheme && settings.theme !== systemTheme) {
          setSettings(prev => ({ ...prev, theme: systemTheme }));
        }
      };
      syncTheme();

      const unlistenPromise = getCurrentWindow().onThemeChanged(({ payload: newTheme }) => {
        setSettings(prev => {
          if (prev.followSystemTheme) {
            return { ...prev, theme: newTheme };
          }
          return prev;
        });
      });

      return () => {
        unlistenPromise.then(unlisten => unlisten());
      };
    }
  }, [settings.followSystemTheme, isLoading]);

  const isDirty = JSON.stringify(initialState) !== JSON.stringify(settings);

  const saveSettings = async () => {
    const backendSettings: UserSettings = {
      n_level: settings.n_level,
      speed_ms: settings.speed_ms,
      session_length: settings.session_length,
      auditory_stimulus_set: settings.auditory_stimulus_set,
    };
    await invoke('save_user_settings', { settings: backendSettings });
    
    // Update local storage values
    setTheme(settings.theme);
    setLanguage(settings.language);
    setFollowSystemLanguage(settings.followSystemLanguage);
    setFollowSystemTheme(settings.followSystemTheme);
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
    setFollowSystemLanguage(defaultSettings.followSystemLanguage);
    setFollowSystemTheme(defaultSettings.followSystemTheme);
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
