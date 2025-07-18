import React from 'react';
import './Switch.css';

interface SwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Switch: React.FC<SwitchProps> = ({ id, label, checked, onChange }) => {
  return (
    <div className="switch-control">
      <label htmlFor={id}>{label}</label>
      <label className="switch">
        <input id={id} type="checkbox" checked={checked} onChange={onChange} />
        <span className="slider-round"></span>
      </label>
    </div>
  );
};

export default Switch;
