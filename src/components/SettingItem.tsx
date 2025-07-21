import React from 'react';
import './SettingItem.css';

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  isRow?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({ icon, label, children, isRow = false }) => {
  const layoutClass = isRow ? 'setting-item-row' : 'setting-item-column';

  return (
    <div className={`setting-item ${layoutClass}`}>
      <div className="setting-label">
        {icon}
        <span>{label}</span>
      </div>
      <div className="setting-control">
        {children}
      </div>
    </div>
  );
};

export default SettingItem;
