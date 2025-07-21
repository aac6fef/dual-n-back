import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { save, confirm } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { useSettings } from '../contexts/SettingsContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Switch from '../components/ui/Switch';
import SettingItem from '../components/SettingItem'; // Import the new component
import KeybindingSettings from '../components/KeybindingSettings';
import {
  Sliders,
  Monitor,
  Keyboard,
  Database,
  Download,
  Trash2,
  Code,
  BrainCircuit,
  Clock,
  ListChecks,
  Languages,
  Sun,
  Moon,
  Beaker,
  ZapOff,
} from 'lucide-react';
import './SettingsPage.css';

// Constants for magic numbers
const DEBOUNCE_DELAY = 500;
const MIN_N_LEVEL = 1;
const MAX_N_LEVEL = 9;
const MIN_SPEED_NORMAL = 1500;
const MIN_SPEED_FAST = 500;
const MAX_SPEED = 5000;
const MIN_SESSION_BASE = 20;
const SESSION_LENGTH_FACTOR = 5;
const MAX_SESSION_LENGTH = 100;

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { settings, setSettings, saveSettings, resetSettings, isLoading } = useSettings();
  const [isGeneratingHistory, setIsGeneratingHistory] = useState(false);
  const [isListening, setIsListening] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  const { n_level, speed_ms, session_length, theme, language, allowFastSpeed, reduceMotion, positionKeys, audioKeys } = settings;

  const minSpeed = allowFastSpeed ? MIN_SPEED_FAST : MIN_SPEED_NORMAL;
  const minSessionLength = Math.max(MIN_SESSION_BASE, SESSION_LENGTH_FACTOR * n_level);
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
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(handler);
  }, [settings, saveSettings, isSessionLengthInvalid]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isListening) return;

      e.preventDefault();
      e.stopPropagation();

      const newKey = e.key;

      setSettings(prev => {
        const currentKeys = isListening === 'position' ? prev.positionKeys : prev.audioKeys;
        if (currentKeys.includes(newKey)) {
          setIsListening(null);
          return prev;
        }

        if (isListening === 'position') {
          return { ...prev, positionKeys: [...prev.positionKeys, newKey] };
        } else {
          return { ...prev, audioKeys: [...prev.audioKeys, newKey] };
        }
      });

      setIsListening(null);
    };

    if (isListening) {
      window.addEventListener('keydown', handleKeyDown, true);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isListening, setSettings]);

  // Centralized handler for changing settings
  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };

      // Adjust dependent settings immediately
      if (key === 'n_level') {
        const newMinSession = Math.max(MIN_SESSION_BASE, SESSION_LENGTH_FACTOR * value);
        if (newSettings.session_length < newMinSession) {
          newSettings.session_length = newMinSession;
        }
      }

      if (key === 'allowFastSpeed') {
        const newMinSpeed = value ? MIN_SPEED_FAST : MIN_SPEED_NORMAL;
        if (newSettings.speed_ms < newMinSpeed) {
          newSettings.speed_ms = newMinSpeed;
        }
      }
      
      return newSettings;
    });
  };

  const handleAddKey = (type: 'position' | 'audio') => {
    setIsListening(type);
  };

  const handleRemoveKey = (type: 'position' | 'audio', index: number) => {
    setSettings(prev => {
      if (type === 'position') {
        const newKeys = [...prev.positionKeys];
        newKeys.splice(index, 1);
        return { ...prev, positionKeys: newKeys };
      } else {
        const newKeys = [...prev.audioKeys];
        newKeys.splice(index, 1);
        return { ...prev, audioKeys: newKeys };
      }
    });
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
      {isListening && (
        <div className="key-listener-overlay" onClick={() => setIsListening(null)}>
          <div className="key-listener-box">{t('settings.keybindings.listening')}</div>
        </div>
      )}
      <h1 className="page-title">{t('settings.title')}</h1>
      <div>
        <Card className="settings-card">
          <h2 className="card-title">
            <Sliders size={20} />
            {t('settings.coreTraining.title')}
          </h2>
          <SettingItem
            icon={<BrainCircuit size={18} />}
            label={t('settings.coreTraining.nLevel', { level: n_level })}
          >
            <input
              type="range"
              id="n-level"
              min={MIN_N_LEVEL}
              max={MAX_N_LEVEL}
              value={n_level}
              onChange={(e) => handleSettingChange('n_level', Number(e.target.value))}
              className="slider"
            />
          </SettingItem>
          <SettingItem
            icon={<Clock size={18} />}
            label={t('settings.coreTraining.speed', { speed: speed_ms })}
          >
            <input
              type="range"
              id="speed"
              min={minSpeed}
              max={MAX_SPEED}
              step="100"
              value={speed_ms}
              onChange={(e) => handleSettingChange('speed_ms', Number(e.target.value))}
              className="slider"
            />
          </SettingItem>
          <SettingItem
            icon={<ListChecks size={18} />}
            label={t('settings.coreTraining.sessionLength', { length: session_length })}
          >
            <>
              <input
                type="range"
                id="session-length"
                min={minSessionLength}
                max={MAX_SESSION_LENGTH}
                value={session_length}
                onChange={(e) => handleSettingChange('session_length', Number(e.target.value))}
                className={`slider ${isSessionLengthInvalid ? 'invalid' : ''}`}
              />
              {isSessionLengthInvalid && (
                <div className="error-message">
                  {t('settings.coreTraining.sessionLengthError', { minLength: minSessionLength, nLevel: n_level })}
                </div>
              )}
            </>
          </SettingItem>
        </Card>

        <Card className="settings-card">
          <h2 className="card-title">
            <Monitor size={20} />
            {t('settings.interface.title')}
          </h2>
          <SettingItem
            isRow
            icon={theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
            label={t('settings.interface.lightTheme')}
          >
            <Switch
              id="theme-switcher"
              label=""
              checked={theme === 'light'}
              onChange={(e) => handleSettingChange('theme', e.target.checked ? 'light' : 'dark')}
            />
          </SettingItem>
          <SettingItem
            isRow
            icon={<Languages size={18} />}
            label={t('settings.interface.language')}
          >
            <select
              id="language-select"
              className="select-input"
              value={language}
              onChange={(e) => handleSettingChange('language', e.target.value)}
            >
              <option value="en">English</option>
              <option value="zh_cn">简体中文</option>
            </select>
          </SettingItem>
          <SettingItem
            isRow
            icon={<ZapOff size={18} />}
            label={t('settings.interface.reduceMotion')}
          >
            <Switch
              id="reduce-motion-switcher"
              label=""
              checked={reduceMotion}
              onChange={(e) => handleSettingChange('reduceMotion', e.target.checked)}
            />
          </SettingItem>
        </Card>

        <Card className="settings-card">
          <h2 className="card-title">
            <Keyboard size={20} />
            {t('settings.keybindings.title')}
          </h2>
          <KeybindingSettings
            title={t('settings.keybindings.position')}
            keys={positionKeys}
            onAdd={() => handleAddKey('position')}
            onRemove={(index) => handleRemoveKey('position', index)}
          />
          <KeybindingSettings
            title={t('settings.keybindings.audio')}
            keys={audioKeys}
            onAdd={() => handleAddKey('audio')}
            onRemove={(index) => handleRemoveKey('audio', index)}
          />
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
          <div className="developer-options">
            <SettingItem
              isRow
              icon={<Code size={18} />}
              label={t('settings.developer.allowFastSpeed')}
            >
              <Switch
                id="allow-fast-speed"
                label=""
                checked={allowFastSpeed}
                onChange={(e) => handleSettingChange('allowFastSpeed', e.target.checked)}
              />
            </SettingItem>
            <Button
              type="button"
              variant="secondary"
              onClick={handleGenerateHistory}
              loading={isGeneratingHistory}
              className="btn-full-width"
            >
              <Beaker size={16} className="btn-icon" />
              {t('settings.developer.generateHistory')}
            </Button>
          </div>
        </Card>

      </div>
    </div>
  );
};

export default SettingsPage;
