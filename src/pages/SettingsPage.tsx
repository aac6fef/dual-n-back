import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { useSettings } from '../contexts/SettingsContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Switch from '../components/ui/Switch';
import { Sliders, Monitor, Database, Download, CheckCircle } from 'lucide-react';
import './SettingsPage.css';

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
  const { t } = useTranslation();
  const { settings, setSettings, saveSettings, isLoading, isDirty } = useSettings();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  const { n_level, speed_ms, session_length, grid_size, visualFeedback, theme, language } = settings;

  const minSessionLength = Math.max(20, 5 * n_level);
  const isSessionLengthInvalid = session_length < minSessionLength;

  useBeforeUnload(isDirty, t('settings.unsavedChanges'));

  // Effect to adjust session length if n-level changes make it invalid
  useEffect(() => {
    if (session_length < minSessionLength) {
      setSettings(prev => ({ ...prev, session_length: minSessionLength }));
    }
  }, [n_level, session_length, minSessionLength, setSettings]);

  const handleSave = async () => {
    if (isSessionLengthInvalid) {
      alert(t('settings.coreTraining.sessionLengthError', { minLength: minSessionLength, nLevel: n_level }));
      return;
    }
    setSaveStatus('saving');
    try {
      await new Promise(resolve => setTimeout(resolve, 200)); // UX delay
      await saveSettings();
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveStatus('idle');
    }
  };

  const handleExport = async () => {
    try {
      const csvData = await invoke<string>('export_history_as_csv');
      const filePath = await save({
        title: 'Save Game History',
        defaultPath: 'nback-history.csv',
        filters: [{
          name: 'CSV',
          extensions: ['csv']
        }],
      });

      if (filePath) {
        await writeTextFile(filePath, csvData);
      }
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
            <label htmlFor="n-level">{t('settings.coreTraining.nLevel', { level: n_level })}</label>
            <input
              type="range"
              id="n-level"
              min="1"
              max="9"
              value={n_level}
              onChange={(e) => setSettings(s => ({ ...s, n_level: Number(e.target.value) }))}
              className="slider"
            />
          </div>
          <div className="form-group">
            <label htmlFor="speed">{t('settings.coreTraining.speed', { speed: speed_ms })}</label>
            <input
              type="range"
              id="speed"
              min="500"
              max="5000"
              step="100"
              value={speed_ms}
              onChange={(e) => setSettings(s => ({ ...s, speed_ms: Number(e.target.value) }))}
              className="slider"
            />
          </div>
          <div className="form-group">
            <label htmlFor="session-length">{t('settings.coreTraining.sessionLength', { length: session_length })}</label>
            <input
              type="range"
              id="session-length"
              min={minSessionLength}
              max="100"
              value={session_length}
              onChange={(e) => setSettings(s => ({ ...s, session_length: Number(e.target.value) }))}
              className={`slider ${isSessionLengthInvalid ? 'invalid' : ''}`}
            />
            {isSessionLengthInvalid && (
              <div className="error-message">
                {t('settings.coreTraining.sessionLengthError', { minLength: minSessionLength, nLevel: n_level })}
              </div>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="grid-size">{t('settings.coreTraining.gridSize', { size: grid_size })}</label>
            <input
              type="range"
              id="grid-size"
              min="3"
              max="5"
              value={grid_size}
              onChange={(e) => setSettings(s => ({ ...s, grid_size: Number(e.target.value) }))}
              className="slider"
            />
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
            onChange={(e) => setSettings(s => ({ ...s, visualFeedback: e.target.checked }))}
          />
          <Switch
            id="theme-switcher"
            label={t('settings.interface.lightTheme')}
            checked={theme === 'light'}
            onChange={(e) => setSettings(s => ({ ...s, theme: e.target.checked ? 'light' : 'dark' }))}
          />
          <div className="form-group">
            <label htmlFor="language-select">{t('settings.interface.language')}</label>
            <select
              id="language-select"
              className="select-input"
              value={language}
              onChange={(e) => setSettings(s => ({ ...s, language: e.target.value }))}
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
