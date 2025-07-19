import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import Button from '../components/ui/Button';
import Grid from '../components/Grid';
import GameControls, { FeedbackState } from '../components/GameControls';
import GameStatus from '../components/GameStatus';

// --- Data Structures mirroring Rust backend ---
interface AccuracyStats {
  true_positives: number;
  true_negatives: number;
  false_positives: number;
  false_negatives: number;
}

interface GameTurn {
  visual_stimulus: { position: number };
  audio_stimulus: { letter: string };
}

interface GameState {
  isRunning: boolean;
  nLevel: number;
  sessionLength: number;
  currentTurnIndex: number;
  currentTurn: GameTurn | null;
  visualHitRate: number;
  visualFalseAlarmRate: number;
  audioHitRate: number;
  audioFalseAlarmRate: number;
  correctVisualMatch: boolean;
  correctAudioMatch: boolean;
}

interface UserInput {
  position_match: boolean;
  audio_match: boolean;
}

const GamePage: React.FC = () => {
  const { t } = useTranslation();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const userInputRef = useRef<UserInput>({ position_match: false, audio_match: false });
  
  // State for immediate feedback
  const [hasRespondedVisual, setHasRespondedVisual] = useState(false);
  const [hasRespondedAudio, setHasRespondedAudio] = useState(false);
  const [positionFeedback, setPositionFeedback] = useState<FeedbackState>(null);
  const [audioFeedback, setAudioFeedback] = useState<FeedbackState>(null);

  // --- Debugging Effect ---
  useEffect(() => {
    if (gameState && gameState.isRunning) {
      const visual = gameState.currentTurn?.visual_stimulus.position;
      const audio = gameState.currentTurn?.audio_stimulus.letter;
      console.log(
        `Turn ${gameState.currentTurnIndex}: Visual Stimulus -> ${visual ?? 'N/A'}, Audio Stimulus -> ${audio ?? 'N/A'}`
      );
    }
  }, [gameState]);

  // --- Audio Playback Effect ---
  useEffect(() => {
    const letter = gameState?.currentTurn?.audio_stimulus.letter;
    if (letter) {
      const playSound = () => {
        try {
          const soundName = `${letter}.aiff`;
          // Assets in `public` are served from the root.
          const audioSrc = `/sounds/${soundName}`;
          
          const audio = new Audio(audioSrc);
          audio.play().catch(e => {
            console.error(`Error playing ${audioSrc}:`, e);
          });
        } catch (error) {
          console.error("Error preparing audio:", error);
        }
      };
      playSound();
    }
  }, [gameState?.currentTurn?.audio_stimulus.letter, gameState?.currentTurnIndex]); // Depend on specific properties

  // --- Game Loop Effect ---
  useEffect(() => {
    if (!gameState?.isRunning) {
      return;
    }

    const advanceTurn = async () => {
      try {
        // Submit the input from the *previous* turn
        await invoke('submit_user_input', { userInput: userInputRef.current });
        
        // Reset for the new turn
        userInputRef.current = { position_match: false, audio_match: false };

        // Get the state for the *new* turn
        const newState = await invoke<GameState>('get_game_state');
        setGameState(newState);
        
        // Reset feedback for the new turn
        setHasRespondedVisual(false);
        setHasRespondedAudio(false);
        setPositionFeedback(null);
        setAudioFeedback(null);

      } catch (error) {
        console.error("Failed to advance turn:", error);
    // Stop the game on error to prevent infinite loops
    setGameState(s => s ? { ...s, isRunning: false } : null);
  }
};

    // TODO: Replace with speed from UserSettings
    const timerId = setTimeout(advanceTurn, 2000); 

    return () => clearTimeout(timerId);
  }, [gameState?.isRunning, gameState?.currentTurnIndex]); // More specific dependencies

  const handleStartGame = useCallback(async () => {
    setIsLoading(true);
    // User interaction (the click) should be enough to unlock the audio context.
    // The previous attempt with a silent sound is a good fallback, but let's try without it first for simplicity.
    
    try {
      await invoke('start_game');
      const newState = await invoke<GameState>('get_game_state');
      setGameState(newState);
      userInputRef.current = { position_match: false, audio_match: false };
      // Reset feedback for new game
      setHasRespondedVisual(false);
      setHasRespondedAudio(false);
      setPositionFeedback(null);
      setAudioFeedback(null);
    } catch (error) {
      console.error("Failed to start game:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePositionMatch = () => {
    if (!gameState?.isRunning || hasRespondedVisual) return;
    
    const isCorrect = gameState.correctVisualMatch;
    setPositionFeedback(isCorrect ? 'correct' : 'incorrect');
    setHasRespondedVisual(true);
    userInputRef.current.position_match = true;
  };

  const handleAudioMatch = () => {
    if (!gameState?.isRunning || hasRespondedAudio) return;

    const isCorrect = gameState.correctAudioMatch;
    setAudioFeedback(isCorrect ? 'correct' : 'incorrect');
    setHasRespondedAudio(true);
    userInputRef.current.audio_match = true;
  };

  const renderGameContent = () => {
    const currentGameState = gameState; // Capture state for render
    
    // console.log("Rendering with state:", currentGameState); // For debugging

    if (!currentGameState) {
      return (
        <div style={{ marginTop: '1.5rem' }}>
          <Button onClick={handleStartGame} loading={isLoading}>
            {t('game.startGame')}
          </Button>
        </div>
      );
    }

    if (!currentGameState.isRunning) {
      return (
        <div style={{ marginTop: '1.5rem' }}>
          <div className="game-over-summary">
            <h2>{t('game.gameOver')}</h2>
            <p>{t('game.summaryVisual', { hitRate: (currentGameState.visualHitRate * 100).toFixed(1), faRate: (currentGameState.visualFalseAlarmRate * 100).toFixed(1) })}</p>
            <p>{t('game.summaryAudio', { hitRate: (currentGameState.audioHitRate * 100).toFixed(1), faRate: (currentGameState.audioFalseAlarmRate * 100).toFixed(1) })}</p>
          </div>
          <Button onClick={handleStartGame} loading={isLoading}>
            {t('game.startGame')}
          </Button>
        </div>
      );
    }

    return (
      <>
        <GameStatus
          nLevel={currentGameState.nLevel}
          turn={currentGameState.currentTurnIndex}
          totalTurns={currentGameState.sessionLength}
          visualHitRate={currentGameState.visualHitRate * 100}
          visualFalseAlarmRate={currentGameState.visualFalseAlarmRate * 100}
          audioHitRate={currentGameState.audioHitRate * 100}
          audioFalseAlarmRate={currentGameState.audioFalseAlarmRate * 100}
        />
        <Grid 
          key={currentGameState.currentTurnIndex}
          activeIndex={currentGameState.currentTurn?.visual_stimulus.position ?? null} 
        />
        <GameControls
          onPositionMatch={handlePositionMatch}
          onAudioMatch={handleAudioMatch}
          positionDisabled={hasRespondedVisual}
          audioDisabled={hasRespondedAudio}
          positionFeedback={positionFeedback}
          audioFeedback={audioFeedback}
        />
      </>
    );
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h1 className="page-title">{t('game.title')}</h1>
      {renderGameContent()}
    </div>
  );
};

export default GamePage;
