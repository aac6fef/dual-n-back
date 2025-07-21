import React from 'react';
import './Switch.css';

interface SwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const Switch: React.FC<SwitchProps> = ({ id, label, checked, onChange, disabled = false }) => {
  return (
    <div className={`switch-control ${disabled ? 'disabled' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <label className="switch">
        <input id={id} type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
        <span className="slider-round"></span>
      </label>
    </div>
  );
};

export default Switch;
