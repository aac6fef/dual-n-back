import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { useSettings } from '../contexts/SettingsContext';
import { Link } from 'react-router-dom';
import { BrainCircuit, Timer, Target, Ear, AlertCircle, History } from 'lucide-react';

import Button from '../components/ui/Button';
import Grid from '../components/Grid';
import GameControls, { FeedbackState } from '../components/GameControls';
import GameHeader from '../components/GameHeader';
import { InfoPanel, Stat } from '../components/InfoPanel';
import './GamePage.css';

// --- Data Structures mirroring Rust backend ---
interface GameTurn {
  visual_stimulus: { position: number };
  audio_stimulus: { letter: string };
}

interface UserSettings {
  n_level: number;
  speed_ms: number;
  session_length: number;
  grid_size: number;
}

interface GameState {
  isRunning: boolean;
  settings: UserSettings;
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
  const { settings: contextSettings, isLoading: settingsLoading } = useSettings();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPostGame, setIsPostGame] = useState(false); // State to manage post-game summary view
  const userInputRef = useRef<UserInput>({ position_match: false, audio_match: false });
  
  // State for immediate feedback
  const [hasRespondedVisual, setHasRespondedVisual] = useState(false);
  const [hasRespondedAudio, setHasRespondedAudio] = useState(false);
  const [positionFeedback, setPositionFeedback] = useState<FeedbackState>(null);
  const [audioFeedback, setAudioFeedback] = useState<FeedbackState>(null);
  const [positionMissed, setPositionMissed] = useState(false);
  const [audioMissed, setAudioMissed] = useState(false);

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
    // Only play sounds if the game is actively running.
    if (gameState && gameState.isRunning) {
      const letter = gameState.currentTurn?.audio_stimulus.letter;
      if (letter) {
        const playSound = () => {
          try {
            const soundName = `letter_${letter}.mp3`;
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
    }
  }, [gameState?.currentTurnIndex, gameState?.isRunning]); // Depend on turn index and running state

  // --- Missed Feedback Effect ---
  useEffect(() => {
    let posTimer: number;
    let audTimer: number;
    const animationDuration = gameState ? gameState.settings.speed_ms / 2 : 500;

    if (positionMissed) {
      posTimer = setTimeout(() => setPositionMissed(false), animationDuration);
    }
    if (audioMissed) {
      audTimer = setTimeout(() => setAudioMissed(false), animationDuration);
    }

    return () => {
      clearTimeout(posTimer);
      clearTimeout(audTimer);
    };
  }, [positionMissed, audioMissed, gameState]);

  // --- Game Loop Effect ---
  useEffect(() => {
    if (!gameState || !gameState.isRunning) {
      return;
    }

    const gameSpeed = gameState.settings.speed_ms;

    const timerId = setTimeout(async () => {
      try {
        // --- Missed Match Detection ---
        if (gameState.currentTurnIndex > 0) {
          if (gameState.correctVisualMatch && !userInputRef.current.position_match) {
            setPositionMissed(true);
          }
          if (gameState.correctAudioMatch && !userInputRef.current.audio_match) {
            setAudioMissed(true);
          }
        }
        
        // Submit the input for the current turn.
        await invoke('submit_user_input', { userInput: userInputRef.current });
        userInputRef.current = { position_match: false, audio_match: false };

        // Get the state for the *next* turn.
        const newState = await invoke<GameState>('get_game_state');

        // The backend has now determined if the game should continue.
        if (newState.isRunning) {
          setGameState(newState);
          setHasRespondedVisual(false);
          setHasRespondedAudio(false);
          setPositionFeedback(null);
          setAudioFeedback(null);
        } else {
          // The game is over. The backend has sent the final stats.
          setGameState(s => s ? { ...s, isRunning: false } : null);

          setTimeout(() => {
            setGameState(newState);
            setIsPostGame(true);
          }, gameSpeed);
        }
      } catch (error) {
        console.error("Failed to advance turn:", error);
        setGameState(s => s ? { ...s, isRunning: false } : null);
      }
    }, gameSpeed);

    return () => clearTimeout(timerId);
  }, [gameState]); // Re-run this effect whenever the gameState object itself changes.

  const handleStartGame = useCallback(async () => {
    setIsLoading(true);
    setIsPostGame(false); // Reset post-game state
    try {
      await invoke('start_game');
      const newState = await invoke<GameState>('get_game_state');
      setGameState(newState);
      userInputRef.current = { position_match: false, audio_match: false };
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
    if (settingsLoading) {
      return <p>{t('settings.loading')}</p>;
    }

    // Post-Game Summary View
    if (isPostGame && gameState) {
      return (
        <div className="post-game-container">
          <InfoPanel title={t('game.postGameTitle')}>
            <div className="stats-group-horizontal">
              <Stat icon={<Target />} label={t('history.visualHitRate')} value={`${(gameState.visualHitRate * 100).toFixed(1)}%`} />
              <Stat icon={<AlertCircle />} label={t('history.visualFaRate')} value={`${(gameState.visualFalseAlarmRate * 100).toFixed(1)}%`} />
            </div>
            <div className="stats-group-horizontal">
              <Stat icon={<Ear />} label={t('history.audioHitRate')} value={`${(gameState.audioHitRate * 100).toFixed(1)}%`} />
              <Stat icon={<AlertCircle />} label={t('history.audioFaRate')} value={`${(gameState.audioFalseAlarmRate * 100).toFixed(1)}%`} />
            </div>
          </InfoPanel>
          <p className="history-prompt">
            <Trans
              i18nKey="game.historyPrompt"
              values={{ historyLink: t('nav.history') }}
              components={[
                <Link to="/history" className="history-link">
                  <History size={16} />
                </Link>
              ]}
            />
          </p>
          <Button onClick={handleStartGame} loading={isLoading}>
            {t('game.playAgain')}
          </Button>
        </div>
      );
    }

    // Pre-Game View
    if (!gameState) {
      return (
        <>
          <InfoPanel>
            <div className="stats-group-horizontal">
              <Stat icon={<BrainCircuit />} label={t('gameStatus.nLevel')} value={contextSettings.n_level} />
              <Stat icon={<Timer />} label={t('gameStatus.speed')} value={`${contextSettings.speed_ms}ms`} />
            </div>
          </InfoPanel>
          <Button onClick={handleStartGame} loading={isLoading}>
            {t('game.startGame')}
          </Button>
        </>
      );
    }

    // Active Game View
    return (
      <>
        <GameHeader
          nLevel={gameState.settings.n_level}
          turn={gameState.currentTurnIndex}
          totalTurns={gameState.settings.session_length}
          visualHitRate={gameState.visualHitRate * 100}
          audioHitRate={gameState.audioHitRate * 100}
        />
        <Grid
          key={gameState.currentTurnIndex}
          activeIndex={gameState.currentTurn?.visual_stimulus.position ?? null}
        />
        <GameControls
          onPositionMatch={handlePositionMatch}
          onAudioMatch={handleAudioMatch}
          positionDisabled={hasRespondedVisual}
          audioDisabled={hasRespondedAudio}
          positionFeedback={positionFeedback}
          audioFeedback={audioFeedback}
          positionMissed={positionMissed}
          audioMissed={audioMissed}
          animationDuration={gameState.settings.speed_ms / 2}
        />
      </>
    );
  };

  return (
    <div className="game-page-container">
      <h1 className="page-title">{t('game.title')}</h1>
      {renderGameContent()}
    </div>
  );
};

export default GamePage;
