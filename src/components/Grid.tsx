import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import './Grid.css';

interface GridProps {
  activeIndex?: number | null;
}

const Grid: React.FC<GridProps> = ({ activeIndex = null }) => {
  const { settings } = useSettings();
  const size = 3;
  const cells = Array.from({ length: size * size });

  const gridStyle = {
    gridTemplateColumns: `repeat(${size}, 1fr)`,
  };

  return (
    <div className="grid-container" style={gridStyle}>
      {cells.map((_, index) => {
        const isActive = activeIndex === index;
        const cellStyle = {
          animationDuration: isActive ? `${settings.speed_ms}ms` : undefined,
        };
        return (
          <div
            key={index}
            className={`grid-cell ${isActive ? 'active' : ''}`}
            style={cellStyle}
          />
        );
      })}
    </div>
  );
};

export default Grid;
