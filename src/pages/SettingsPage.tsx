import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Switch from '../components/ui/Switch';
import { Sliders, Monitor, Database, Download } from 'lucide-react';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  // Placeholder state for settings
  const [nLevel, setNLevel] = useState(2);
  const [speed, setSpeed] = useState(2000);
  const [gridSize, setGridSize] = useState(3);
  const [sessionLength, setSessionLength] = useState(30);
  const [visualFeedback, setVisualFeedback] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState('dark');

  const minSessionLength = Math.max(20, 5 * nLevel);
  const isSessionLengthInvalid = sessionLength < minSessionLength;

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

  const handleSave = () => {
    setIsSaving(true);
    console.log('Saving settings:', { nLevel, speed, gridSize, sessionLength, visualFeedback });
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
    }, 1500);
  };

  return (
    <div className="settings-container">
      <h1 className="page-title">Settings</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <Card className="settings-card">
          <h2 className="card-title">
            <Sliders size={20} />
            Core Training
          </h2>
          <div className="form-group">
            <label htmlFor="n-level">N-Level: {nLevel}</label>
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
            <label htmlFor="speed">Speed (ms): {speed}</label>
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
            <label htmlFor="grid-size">Grid Size: {gridSize}x{gridSize}</label>
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
            <label htmlFor="session-length">Session Length: {sessionLength}</label>
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
                Session length must be at least {minSessionLength} for N-Level {nLevel}.
              </div>
            )}
          </div>
        </Card>

        <Card className="settings-card">
          <h2 className="card-title">
            <Monitor size={20} />
            Interface
          </h2>
          <Switch
            id="visual-feedback"
            label="Visual Feedback"
            checked={visualFeedback}
            onChange={(e) => setVisualFeedback(e.target.checked)}
          />
          <Switch
            id="theme-switcher"
            label="Light Theme"
            checked={theme === 'light'}
            onChange={(e) => setTheme(e.target.checked ? 'light' : 'dark')}
          />
          <div className="form-group">
            <label htmlFor="language-select">Language</label>
            <select id="language-select" className="select-input">
              <option value="en">English</option>
              <option value="zh_cn">简体中文</option>
            </select>
          </div>
        </Card>

        <Card className="settings-card">
          <h2 className="card-title">
            <Database size={20} />
            Data Management
          </h2>
          <Button type="button" variant="secondary" onClick={() => console.log('Exporting data...')}>
            <Download size={16} className="btn-icon" />
            Export Data
          </Button>
        </Card>

        <div className="save-button-container">
          <Button type="submit" loading={isSaving}>
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
