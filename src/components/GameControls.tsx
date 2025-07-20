import React from 'react';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';
import { Box, Volume2, Check, X, AlertCircle } from 'lucide-react';
import './GameControls.css';

export type FeedbackState = 'correct' | 'incorrect' | null;

interface GameControlsProps {
  onPositionMatch: () => void;
  onAudioMatch: () => void;
  positionDisabled?: boolean;
  audioDisabled?: boolean;
  positionFeedback?: FeedbackState;
  audioFeedback?: FeedbackState;
  positionMissed?: boolean;
  audioMissed?: boolean;
  animationDuration?: number;
}

const FeedbackIcon: React.FC<{ state: FeedbackState }> = ({ state }) => {
  if (state === 'correct') {
    return <Check size={20} className="feedback-icon correct" />;
  }
  if (state === 'incorrect') {
    return <X size={20} className="feedback-icon incorrect" />;
  }
  return null;
};

const MissedIcon: React.FC<{ duration: number; visible: boolean }> = ({ duration, visible }) => (
  <div className="missed-feedback-icon-wrapper">
    {visible ? (
      <AlertCircle
        size={24}
        className="missed-feedback-icon"
        style={{ animationDuration: `${duration}ms` }}
      />
    ) : (
      <div className="missed-feedback-placeholder" />
    )}
  </div>
);

const GameControls: React.FC<GameControlsProps> = ({
  onPositionMatch,
  onAudioMatch,
  positionDisabled = false,
  audioDisabled = false,
  positionFeedback = null,
  audioFeedback = null,
  positionMissed = false,
  audioMissed = false,
  animationDuration = 1000,
}) => {
  const { t } = useTranslation();
  const getButtonClassName = (feedback: FeedbackState) => {
    if (feedback === 'correct') return 'btn-correct';
    if (feedback === 'incorrect') return 'btn-incorrect';
    return '';
  };

  return (
    <div className="game-controls-container">
      <MissedIcon duration={animationDuration} visible={positionMissed} />
      <Button
        onClick={onPositionMatch}
        disabled={positionDisabled}
        className={getButtonClassName(positionFeedback)}
      >
        {positionFeedback ? <FeedbackIcon state={positionFeedback} /> : <Box size={20} className="btn-icon" />}
        {t('game.position')}
      </Button>
      <Button
        onClick={onAudioMatch}
        disabled={audioDisabled}
        className={getButtonClassName(audioFeedback)}
      >
        {audioFeedback ? <FeedbackIcon state={audioFeedback} /> : <Volume2 size={20} className="btn-icon" />}
        {t('game.audio')}
      </Button>
      <MissedIcon duration={animationDuration} visible={audioMissed} />
    </div>
  );
};

export default GameControls;
