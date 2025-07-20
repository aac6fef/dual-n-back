import React from 'react';
import './Grid.css';

interface GridProps {
  activeIndex?: number | null;
}

const Grid: React.FC<GridProps> = ({ activeIndex = null }) => {
  const size = 3;
  const cells = Array.from({ length: size * size });

  const gridStyle = {
    gridTemplateColumns: `repeat(${size}, 1fr)`,
  };

  return (
    <div className="grid-container" style={gridStyle}>
      {cells.map((_, index) => (
        <div
          key={index}
          className={`grid-cell ${activeIndex === index ? 'active' : ''}`}
        />
      ))}
    </div>
  );
};

export default Grid;
