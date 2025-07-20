import React from 'react';
import './InfoPanel.css';

interface InfoPanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`info-panel-container ${className}`}>
      {title && <h3 className="info-panel-title">{title}</h3>}
      <div className="info-panel-content">
        {children}
      </div>
    </div>
  );
};

interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  className?: string;
}

export const Stat: React.FC<StatProps> = ({ icon, label, value, className = '' }) => {
  return (
    <div className={`info-panel-item ${className}`}>
      <div className="info-panel-icon">{icon}</div>
      <div className="info-panel-text">
        <span className="info-panel-label">{label}</span>
        <span className="info-panel-value">{value}</span>
      </div>
    </div>
  );
};

export default InfoPanel;
