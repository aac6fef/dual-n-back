import React from 'react';
import { BrainCircuit, Repeat, Target, Ear } from 'lucide-react';
import './GameHeader.css';

interface GameHeaderProps {
  nLevel: number;
  turn: number;
  totalTurns: number;
  visualAccuracy: number;
  audioAccuracy: number;
}

const GameHeader: React.FC<GameHeaderProps> = ({
  nLevel,
  turn,
  totalTurns,
  visualAccuracy,
  audioAccuracy,
}) => {
  return (
    <div className="game-header-container">
      <div className="header-item">
        <BrainCircuit size={20} />
        <span>{nLevel}</span>
      </div>
      <div className="header-item">
        <Target size={20} />
        <span>{visualAccuracy.toFixed(0)}%</span>
      </div>
      <div className="header-item">
        <Ear size={20} />
        <span>{audioAccuracy.toFixed(0)}%</span>
      </div>
      <div className="header-item">
        <Repeat size={20} />
        <span>{turn + 1}/{totalTurns}</span>
      </div>
    </div>
  );
};

export default GameHeader;
