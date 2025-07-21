import React from 'react';
import { useTranslation } from 'react-i18next';
import './KeybindingSettings.css';

interface KeybindingSettingsProps {
  title: string;
  keys: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
}

const KeybindingSettings: React.FC<KeybindingSettingsProps> = ({ title, keys, onAdd, onRemove }) => {
  const { t } = useTranslation();

  return (
    <div className="keybinding-settings">
      <h3>{title}</h3>
      <div className="key-list">
        {keys.map((key, index) => (
          <div key={index} className="key-item">
            <span>{key}</span>
            <button onClick={() => onRemove(index)} className="remove-key-btn">-</button>
          </div>
        ))}
        <button onClick={onAdd} className="add-key-btn">+</button>
      </div>
    </div>
  );
};

export default KeybindingSettings;
