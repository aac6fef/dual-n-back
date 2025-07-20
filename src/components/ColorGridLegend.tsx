import React from 'react';
import './ColorGridLegend.css';

const ColorGridLegend: React.FC = () => {
  const cells = Array.from({ length: 9 }, (_, i) => i);

  return (
    <div className="color-grid-legend">
      {cells.map(cellNumber => (
        <div key={cellNumber} className={`legend-grid-cell cell-${cellNumber}`}>
          <span>{cellNumber}</span>
        </div>
      ))}
    </div>
  );
};

export default ColorGridLegend;
