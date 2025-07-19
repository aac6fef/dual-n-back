import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { useLocalStorage } from '../hooks/useLocalStorage';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Switch from '../components/ui/Switch';
import { Sliders, Monitor, Database, Download, CheckCircle } from 'lucide-react';
import './SettingsPage.css';

interface UserSettings {
  n_level: number;
  speed_ms: number;
  session_length: number;
}

// Hook to prompt user before leaving the page with unsaved changes
const useBeforeUnload = (when: boolean, message: string) => {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (when) {
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [when, message]);
};


const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  
  // --- State for backend settings ---
  const [nLevel, setNLevel] = useState(2);
  const [speed, setSpeed] = useState(2000);
  const [sessionLength, setSessionLength] = useState(30);
  
  // --- State for client-side settings ---
  const [visualFeedback, setVisualFeedback] = useLocalStorage('settings:visualFeedback', true);
  const [theme, setTheme] = useLocalStorage('settings:theme', 'dark');
  const [language, setLanguage] = useLocalStorage('settings:language', i18n.language);

  // --- Component State ---
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [initialState, setInitialState] = useState<any>({});

  const minSessionLength = Math.max(20, 5 * nLevel);
  const isSessionLengthInvalid = sessionLength < minSessionLength;

  const currentSettings = {
    nLevel,
    speed,
    sessionLength,
    visualFeedback,
    theme,
    language,
  };

  const isDirty = JSON.stringify(initialState) !== JSON.stringify(currentSettings);

  useBeforeUnload(isDirty, t('settings.unsavedChanges'));

  // Load settings from backend and local storage on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettings = await invoke<UserSettings>('load_user_settings');
        const initialState = {
          nLevel: loadedSettings.n_level,
          speed: loadedSettings.speed_ms,
          sessionLength: loadedSettings.session_length,
          visualFeedback,
          theme,
          language,
        };
        setNLevel(initialState.nLevel);
        setSpeed(initialState.speed);
        setSessionLength(initialState.sessionLength);
        setInitialState(initialState);
      } catch (error) {
        console.error("Failed to load settings, using default values:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []); // visualFeedback, theme, language are stable from useLocalStorage

  // Effect to sync language between i18n and local storage
  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
    const handleLanguageChange = (lng: string) => {
      setLanguage(lng);
    };
    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [language, i18n, setLanguage]);

  // Effect to adjust session length if n-level changes make it invalid
  useEffect(() => {
    if (isSessionLengthInvalid) {
      setSessionLength(minSessionLength);
    }
  }, [nLevel, minSessionLength, isSessionLengthInvalid]);

  // Effect to toggle theme class on body
  useEffect(() => {
    document.body.classList.toggle('light-theme', theme === 'light');
  }, [theme]);

  const handleSave = async () => {
    if (isSessionLengthInvalid) {
      alert(t('settings.coreTraining.sessionLengthError', { minLength: minSessionLength, nLevel: nLevel }));
      return;
    }
    setSaveStatus('saving');
    const settingsToSave: UserSettings = {
      n_level: nLevel,
      speed_ms: speed,
      session_length: sessionLength,
    };
    try {
      // Simulate a short delay for better UX
      await new Promise(resolve => setTimeout(resolve, 200));
      await invoke('save_user_settings', { settings: settingsToSave });
      setSaveStatus('success');
      setInitialState(currentSettings); // Update initial state to reset dirty check
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveStatus('idle');
    }
  };

  const handleExport = async () => {
    try {
      const csvData = await invoke<string>('export_history_as_csv');
      await save({
        title: 'Save Game History',
        defaultPath: 'nback-history.csv',
        filters: [{
          name: 'CSV',
          extensions: ['csv']
        }],
        // TODO: The `save` dialog does not accept contents directly.
        // The correct flow is: get path from `save`, then write file with `fs` plugin.
        // contents: csvData,
      });
    } catch (error) {
      console.error("Failed to export history:", error);
      // Optionally show an error message to the user
    }
  };

  if (isLoading) {
    return (
      <div className="settings-container">
        <h1 className="page-title">{t('settings.loading')}</h1>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <h1 className="page-title">{t('settings.title')}</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <Card className="settings-card">
          <h2 className="card-title">
            <Sliders size={20} />
            {t('settings.coreTraining.title')}
          </h2>
          <div className="form-group">
            <label htmlFor="n-level">{t('settings.coreTraining.nLevel', { level: nLevel })}</label>
            <input
              type="range"
              id="n-level"
              min="1"
              max="9"
              value={nLevel}
              onChange={(e) => setNLevel(Number(e.target.value))}
              className="slider"
            />
          </div>
          <div className="form-group">
            <label htmlFor="speed">{t('settings.coreTraining.speed', { speed: speed })}</label>
            <input
              type="range"
              id="speed"
              min="500"
              max="5000"
              step="100"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="slider"
            />
          </div>
          <div className="form-group">
            <label htmlFor="session-length">{t('settings.coreTraining.sessionLength', { length: sessionLength })}</label>
            <input
              type="range"
              id="session-length"
              min={minSessionLength}
              max="100"
              value={sessionLength}
              onChange={(e) => setSessionLength(Number(e.target.value))}
              className={`slider ${isSessionLengthInvalid ? 'invalid' : ''}`}
            />
            {isSessionLengthInvalid && (
              <div className="error-message">
                {t('settings.coreTraining.sessionLengthError', { minLength: minSessionLength, nLevel: nLevel })}
              </div>
            )}
          </div>
        </Card>

        <Card className="settings-card">
          <h2 className="card-title">
            <Monitor size={20} />
            {t('settings.interface.title')}
          </h2>
          <Switch
            id="visual-feedback"
            label={t('settings.interface.visualFeedback')}
            checked={visualFeedback}
            onChange={(e) => setVisualFeedback(e.target.checked)}
          />
          <Switch
            id="theme-switcher"
            label={t('settings.interface.lightTheme')}
            checked={theme === 'light'}
            onChange={(e) => setTheme(e.target.checked ? 'light' : 'dark')}
          />
          <div className="form-group">
            <label htmlFor="language-select">{t('settings.interface.language')}</label>
            <select 
              id="language-select" 
              className="select-input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="zh_cn">简体中文</option>
            </select>
          </div>
        </Card>

        <Card className="settings-card">
          <h2 className="card-title">
            <Database size={20} />
            {t('settings.dataManagement.title')}
          </h2>
          <Button type="button" variant="secondary" onClick={handleExport}>
            <Download size={16} className="btn-icon" />
            {t('settings.dataManagement.export')}
          </Button>
        </Card>

        <div className="save-button-container">
          <Button type="submit" loading={saveStatus === 'saving'} disabled={isSessionLengthInvalid || !isDirty}>
            {saveStatus === 'success' ? <CheckCircle size={16} className="btn-icon" /> : null}
            {saveStatus === 'success' ? t('settings.saveSuccess') : t('settings.saveButton')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
