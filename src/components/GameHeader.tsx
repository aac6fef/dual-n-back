import React from 'react';
import { BrainCircuit, Repeat, Target, Ear } from 'lucide-react';
import './GameHeader.css';

interface GameHeaderProps {
  nLevel: number;
  turn: number;
  totalTurns: number;
  visualHitRate: number;
  audioHitRate: number;
}

const GameHeader: React.FC<GameHeaderProps> = ({
  nLevel,
  turn,
  totalTurns,
  visualHitRate,
  audioHitRate,
}) => {
  return (
    <div className="game-header-container">
      <div className="header-item">
        <BrainCircuit size={20} />
        <span>{nLevel}</span>
      </div>
      <div className="header-item">
        <Target size={20} />
        <span>{visualHitRate.toFixed(0)}%</span>
      </div>
      <div className="header-item">
        <Ear size={20} />
        <span>{audioHitRate.toFixed(0)}%</span>
      </div>
      <div className="header-item">
        <Repeat size={20} />
        <span>{turn + 1}/{totalTurns}</span>
      </div>
    </div>
  );
};

export default GameHeader;
