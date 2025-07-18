import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { resourceDir, join } from '@tauri-apps/api/path';
import Button from '../components/ui/Button';
import Grid from '../components/Grid';
import GameControls from '../components/GameControls';
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
  is_running: boolean;
  n_level: number;
  session_length: number;
  current_turn_index: number;
  current_turn: GameTurn | null;
  visual_stats: AccuracyStats;
  audio_stats: AccuracyStats;
}

interface UserInput {
  position_match: boolean;
  audio_match: boolean;
}

// --- Helper Function ---
const calculateAccuracy = (stats: AccuracyStats): number => {
  const total = stats.true_positives + stats.true_negatives + stats.false_positives + stats.false_negatives;
  if (total === 0) return 100.0;
  const correct = stats.true_positives + stats.true_negatives;
  return (correct / total) * 100;
};

const GamePage: React.FC = () => {
  const { t } = useTranslation();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const updateGameState = useCallback(async () => {
    try {
      const newState = await invoke<GameState>('get_game_state');
      setGameState(newState);
      if (newState.current_turn?.audio_stimulus.letter) {
        const soundName = `${newState.current_turn.audio_stimulus.letter}.aiff`;
        const resourcesPath = await resourceDir();
        const soundPath = await join(resourcesPath, 'sounds', soundName);
        const audioSrc = convertFileSrc(soundPath);
        
        const audio = new Audio(audioSrc);
        audio.play().catch(e => console.error("Error playing audio:", e));
      }
    } catch (error) {
      console.error("Failed to get game state:", error);
    }
  }, []);

  const handleStartGame = async () => {
    setIsLoading(true);
    try {
      await invoke('start_game');
      await updateGameState();
    } catch (error) {
      console.error("Failed to start game:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserInput = async (positionMatch: boolean, audioMatch: boolean) => {
    if (!gameState?.is_running) return;

    const userInput: UserInput = {
      position_match: positionMatch,
      audio_match: audioMatch,
    };

    try {
      await invoke('submit_user_input', { userInput });
      await updateGameState();
    } catch (error) {
      console.error("Failed to submit user input:", error);
    }
  };

  const renderGameContent = () => {
    if (!gameState || !gameState.is_running) {
      return (
        <div style={{ marginTop: '1.5rem' }}>
          {gameState && (
            <div className="game-over-summary">
              <h2>{t('game.gameOver')}</h2>
              <p>{t('game.finalVisualAccuracy', { accuracy: calculateAccuracy(gameState.visual_stats).toFixed(1) })}</p>
              <p>{t('game.finalAudioAccuracy', { accuracy: calculateAccuracy(gameState.audio_stats).toFixed(1) })}</p>
            </div>
          )}
          <Button onClick={handleStartGame} loading={isLoading}>
            {t('game.startGame')}
          </Button>
        </div>
      );
    }

    return (
      <>
        <GameStatus
          nLevel={gameState.n_level}
          turn={gameState.current_turn_index}
          totalTurns={gameState.session_length}
          visualAccuracy={calculateAccuracy(gameState.visual_stats)}
          audioAccuracy={calculateAccuracy(gameState.audio_stats)}
        />
        <Grid activeIndex={gameState.current_turn?.visual_stimulus.position ?? null} />
        <GameControls
          onPositionMatch={() => handleUserInput(true, false)}
          onAudioMatch={() => handleUserInput(false, true)}
          disabled={!gameState.is_running}
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
