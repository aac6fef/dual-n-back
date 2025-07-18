import React from 'react';
import Button from './ui/Button';
import { Box, Volume2 } from 'lucide-react';
import './GameControls.css';

interface GameControlsProps {
  onPositionMatch: () => void;
  onAudioMatch: () => void;
  disabled?: boolean;
}

const GameControls: React.FC<GameControlsProps> = ({
  onPositionMatch,
  onAudioMatch,
  disabled = false,
}) => {
  return (
    <div className="game-controls-container">
      <Button onClick={onPositionMatch} disabled={disabled}>
        <Box size={20} className="btn-icon" />
        Position
      </Button>
      <Button onClick={onAudioMatch} disabled={disabled}>
        <Volume2 size={20} className="btn-icon" />
        Audio
      </Button>
    </div>
  );
};

export default GameControls;
