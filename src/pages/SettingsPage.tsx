import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { save, confirm } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { useSettings } from '../contexts/SettingsContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Switch from '../components/ui/Switch';
import {
  Sliders,
  Monitor,
  Database,
  Download,
  CheckCircle,
  Trash2,
  Code,
  BrainCircuit,
  Clock,
  ListChecks,
  Languages,
  Sun,
  Moon,
} from 'lucide-react';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { settings, setSettings, saveSettings, resetSettings, isLoading } = useSettings();
  const [isGeneratingHistory, setIsGeneratingHistory] = useState(false);
  const isInitialMount = useRef(true);

  const { n_level, speed_ms, session_length, theme, language, allowFastSpeed } = settings;

  const minSpeed = allowFastSpeed ? 500 : 1500;
  const minSessionLength = Math.max(20, 5 * n_level);
  const isSessionLengthInvalid = session_length < minSessionLength;

  // Auto-save effect with debouncing
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (isSessionLengthInvalid) {
      return;
    }

    const handler = setTimeout(() => {
      saveSettings();
    }, 500); // Debounce saving

    return () => {
      clearTimeout(handler);
    };
  }, [settings, saveSettings, isSessionLengthInvalid]);

  // Effect to adjust session length and speed if settings change make them invalid
  useEffect(() => {
    if (session_length < minSessionLength) {
      setSettings(prev => ({ ...prev, session_length: minSessionLength }));
    }
    if (speed_ms < minSpeed) {
      setSettings(prev => ({ ...prev, speed_ms: minSpeed }));
    }
  }, [n_level, session_length, minSessionLength, speed_ms, minSpeed, setSettings]);

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

  const handleReset = async () => {
    const confirmed = await confirm(t('settings.dataManagement.resetConfirmation'), {
      title: t('settings.dataManagement.resetTitle'),
    });
    if (confirmed) {
      await resetSettings();
      // Maybe show a success message
    }
  };

  const handleGenerateHistory = async () => {
    setIsGeneratingHistory(true);
    try {
      await invoke('generate_fake_history');
      // Maybe show a success message
    } catch (error) {
      console.error("Failed to generate fake history:", error);
    } finally {
      setIsGeneratingHistory(false);
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
      <div>
        <Card className="settings-card">
          <h2 className="card-title">
            <Sliders size={20} />
            {t('settings.coreTraining.title')}
          </h2>
          <div className="setting-item">
            <div className="setting-label">
              <BrainCircuit size={18} />
              <span>{t('settings.coreTraining.nLevel', { level: n_level })}</span>
            </div>
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
          <div className="setting-item">
            <div className="setting-label">
              <Clock size={18} />
              <span>{t('settings.coreTraining.speed', { speed: speed_ms })}</span>
            </div>
            <input
              type="range"
              id="speed"
              min={minSpeed}
              max="5000"
              step="100"
              value={speed_ms}
              onChange={(e) => setSettings(s => ({ ...s, speed_ms: Number(e.target.value) }))}
              className="slider"
            />
          </div>
          <div className="setting-item">
            <div className="setting-label">
              <ListChecks size={18} />
              <span>{t('settings.coreTraining.sessionLength', { length: session_length })}</span>
            </div>
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
        </Card>

        <Card className="settings-card">
          <h2 className="card-title">
            <Monitor size={20} />
            {t('settings.interface.title')}
          </h2>
          <div className="setting-item setting-item-row">
            <div className="setting-label">
              {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
              <span>{t('settings.interface.lightTheme')}</span>
            </div>
            <Switch
              id="theme-switcher"
              label=""
              checked={theme === 'light'}
              onChange={(e) => setSettings(s => ({ ...s, theme: e.target.checked ? 'light' : 'dark' }))}
            />
          </div>
          <div className="setting-item setting-item-row">
            <div className="setting-label">
              <Languages size={18} />
              <span>{t('settings.interface.language')}</span>
            </div>
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
          <div className="data-management-buttons">
            <Button type="button" variant="secondary" onClick={handleExport}>
              <Download size={16} className="btn-icon" />
              {t('settings.dataManagement.export')}
            </Button>
            <Button type="button" variant="danger" onClick={handleReset}>
              <Trash2 size={16} className="btn-icon" />
              {t('settings.dataManagement.reset')}
            </Button>
          </div>
        </Card>

        <Card className="settings-card">
          <h2 className="card-title">
            <Code size={20} />
            {t('settings.developer.title')}
          </h2>
          <Switch
            id="allow-fast-speed"
            label={t('settings.developer.allowFastSpeed')}
            checked={allowFastSpeed}
            onChange={(e) => setSettings(s => ({ ...s, allowFastSpeed: e.target.checked }))}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleGenerateHistory}
            loading={isGeneratingHistory}
          >
            {t('settings.developer.generateHistory')}
          </Button>
        </Card>

        <div className="save-button-container">
          {/* Save button removed for auto-save functionality */}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
