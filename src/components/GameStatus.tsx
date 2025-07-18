import React from 'react';
import './GameStatus.css';

import { Target, Ear, BrainCircuit, Repeat } from 'lucide-react';

interface GameStatusProps {
  nLevel: number;
  turn: number;
  totalTurns: number;
  visualAccuracy: number;
  audioAccuracy: number;
}

const GameStatus: React.FC<GameStatusProps> = ({
  nLevel,
  turn,
  totalTurns,
  visualAccuracy,
  audioAccuracy,
}) => {
  return (
    <div className="game-status-container">
      <div className="status-item">
        <BrainCircuit className="status-icon" size={24} />
        <span className="status-label">N-Level</span>
        <span className="status-value">{nLevel}</span>
      </div>
      <div className="status-item">
        <Repeat className="status-icon" size={24} />
        <span className="status-label">Turn</span>
        <span className="status-value">
          {turn} / {totalTurns}
        </span>
      </div>
      <div className="status-item">
        <Target className="status-icon" size={24} />
        <span className="status-label">Visual</span>
        <span className="status-value">{visualAccuracy.toFixed(1)}%</span>
      </div>
      <div className="status-item">
        <Ear className="status-icon" size={24} />
        <span className="status-label">Audio</span>
        <span className="status-value">{audioAccuracy.toFixed(1)}%</span>
      </div>
    </div>
  );
};

export default GameStatus;
