import React from 'react';
import './KeybindingSettings.css';

interface KeybindingSettingsProps {
  icon?: React.ReactNode;
  title: string;
  keys: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
}

const KeybindingSettings: React.FC<KeybindingSettingsProps> = ({ icon, title, keys, onAdd, onRemove }) => {
  return (
    <div className="keybinding-settings">
      <h3 className="keybinding-title">
        {icon}
        {title}
      </h3>
      <div className="keybinding-body">
        <div className="key-list">
          {keys.map((key, index) => (
            <div key={index} className="key-item">
              <span className="key-text">{key}</span>
              <button onClick={() => onRemove(index)} className="key-action-btn remove-key-btn" aria-label={`Remove key ${key}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          ))}
        </div>
        <button onClick={onAdd} className="key-action-btn add-key-btn" aria-label="Add new key">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>
    </div>
  );
};

export default KeybindingSettings;
