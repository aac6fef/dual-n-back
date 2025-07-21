import React from 'react';
import './Stat.css';

interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  className?: string;
}

const Stat: React.FC<StatProps> = ({ icon, label, value, className = '' }) => {
  return (
    <div className={`stat-item ${className}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-text">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
      </div>
    </div>
  );
};

export default Stat;
