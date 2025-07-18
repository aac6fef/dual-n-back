import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { useLocalStorage } from '../hooks/useLocalStorage';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Switch from '../components/ui/Switch';
import { Sliders, Monitor, Database, Download } from 'lucide-react';
import './SettingsPage.css';

interface UserSettings {
  n_level: number;
  speed_ms: number;
  grid_size: number;
  session_length: number;
}

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [nLevel, setNLevel] = useState(2);
  const [speed, setSpeed] = useState(2000);
  const [gridSize, setGridSize] = useState(3);
  const [sessionLength, setSessionLength] = useState(30);
  
  // Client-side only settings
  const [visualFeedback, setVisualFeedback] = useLocalStorage('settings:visualFeedback', true);
  const [theme, setTheme] = useLocalStorage('settings:theme', 'dark');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const minSessionLength = Math.max(20, 5 * nLevel);
  const isSessionLengthInvalid = sessionLength < minSessionLength;

  // Load settings from backend on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettings = await invoke<UserSettings>('load_user_settings');
        setNLevel(loadedSettings.n_level);
        setSpeed(loadedSettings.speed_ms);
        setGridSize(loadedSettings.grid_size);
        setSessionLength(loadedSettings.session_length);
      } catch (error) {
        console.error("Failed to load settings, using default values:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

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
      alert(`Session length must be at least ${minSessionLength} for N-Level ${nLevel}.`);
      return;
    }
    setIsSaving(true);
    const settingsToSave: UserSettings = {
      n_level: nLevel,
      speed_ms: speed,
      grid_size: gridSize,
      session_length: sessionLength,
    };
    try {
      await invoke('save_user_settings', { settings: settingsToSave });
      // Optionally show a success message to the user
    } catch (error) {
      console.error("Failed to save settings:", error);
      // Optionally show an error message to the user
    } finally {
      setIsSaving(false);
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
        contents: csvData,
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
            <label htmlFor="grid-size">{t('settings.coreTraining.gridSize', { size: gridSize })}</label>
            <input
              type="range"
              id="grid-size"
              min="3"
              max="5"
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
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
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
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
          <Button type="submit" loading={isSaving} disabled={isSessionLengthInvalid}>
            {t('settings.saveButton')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
