import React from 'react';
import { useTranslation } from 'react-i18next';
import './GameStatus.css';

import { Target, Ear, BrainCircuit, Repeat, AlertCircle } from 'lucide-react';

interface GameStatusProps {
  nLevel: number;
  turn: number;
  totalTurns: number;
  visualHitRate: number;
  visualFalseAlarmRate: number;
  audioHitRate: number;
  audioFalseAlarmRate: number;
}

const GameStatus: React.FC<GameStatusProps> = ({
  nLevel,
  turn,
  totalTurns,
  visualHitRate,
  visualFalseAlarmRate,
  audioHitRate,
  audioFalseAlarmRate,
}) => {
  const { t } = useTranslation();
  return (
    <div className="game-status-container">
      <div className="status-item">
        <BrainCircuit className="status-icon" size={18} />
        <span className="status-label">{t('gameStatus.nLevel')}</span>
        <span className="status-value">{nLevel}</span>
      </div>
      <div className="status-item">
        <Repeat className="status-icon" size={18} />
        <span className="status-label">{t('gameStatus.turn')}</span>
        <span className="status-value">
          {turn} / {totalTurns}
        </span>
      </div>
      <div className="status-item">
        <Target className="status-icon" size={18} />
        <span className="status-label">{t('gameStatus.vHit')}</span>
        <span className="status-value">{visualHitRate.toFixed(1)}%</span>
      </div>
      <div className="status-item">
        <AlertCircle className="status-icon" size={18} />
        <span className="status-label">{t('gameStatus.vFa')}</span>
        <span className="status-value">{visualFalseAlarmRate.toFixed(1)}%</span>
      </div>
      <div className="status-item">
        <Ear className="status-icon" size={18} />
        <span className="status-label">{t('gameStatus.aHit')}</span>
        <span className="status-value">{audioHitRate.toFixed(1)}%</span>
      </div>
      <div className="status-item">
        <AlertCircle className="status-icon" size={18} />
        <span className="status-label">{t('gameStatus.aFa')}</span>
        <span className="status-value">{audioFalseAlarmRate.toFixed(1)}%</span>
      </div>
    </div>
  );
};

export default GameStatus;
