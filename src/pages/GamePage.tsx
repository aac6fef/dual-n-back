import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Pause, Play, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { confirm } from '@tauri-apps/plugin-dialog';
import { useSettings } from '../contexts/SettingsContext';
import { useGameStatus } from '../contexts/GameStatusContext';
import { usePause } from '../contexts/PauseContext';
import { BrainCircuit, Timer} from 'lucide-react';

import Button from '../components/ui/Button';
import Grid from '../components/Grid';
import GameControls, { FeedbackState } from '../components/GameControls';
import GameHeader from '../components/GameHeader';
import Card from '../components/ui/Card';
import Stat from '../components/ui/Stat';
import { GameSessionSummary, calculateAccuracy } from '../utils/stats'; // Import for type safety
import './GamePage.css';

// --- Data Structures mirroring Rust backend ---
interface FrontendStimulus {
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
  currentStimulus: FrontendStimulus | null;
  visualAccuracy: number;
  visualFalseAlarmRate: number;
  audioAccuracy: number;
  audioFalseAlarmRate: number;
  isVisualMatch: boolean;
  isAudioMatch: boolean;
}

interface UserResponse {
  visual_match: boolean;
  audio_match: boolean;
}

const GamePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setIsGameRunning } = useGameStatus();
  const { setPauseListener } = usePause();
  const { settings: contextSettings, setSettings, isLoading: settingsLoading } = useSettings();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const userResponseRef = useRef<UserResponse>({ visual_match: false, audio_match: false });
  const previousMatchStatusRef = useRef({ isVisualMatch: false, isAudioMatch: false });
  const gameLoopTimerRef = useRef<number | null>(null);
  
  // State for immediate feedback
  const [hasRespondedVisual, setHasRespondedVisual] = useState(false);
  const [hasRespondedAudio, setHasRespondedAudio] = useState(false);
  const [positionFeedback, setPositionFeedback] = useState<FeedbackState>(null);
  const [audioFeedback, setAudioFeedback] = useState<FeedbackState>(null);
  const [positionMissed, setPositionMissed] = useState(false);
  const [audioMissed, setAudioMissed] = useState(false);
  const audioCache = useRef<Record<string, HTMLAudioElement>>({});

  // --- Keyboard Listener Effect ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameState || !gameState.isRunning || isPaused) return;

      if (contextSettings.positionKeys.includes(event.key)) {
        handlePositionMatch();
      }
      if (contextSettings.audioKeys.includes(event.key)) {
        handleAudioMatch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, isPaused, contextSettings.positionKeys, contextSettings.audioKeys]);

  // --- Pause Listener Effect ---
  useEffect(() => {
    // Register a listener that can be called from other components
    const pauseListener = () => {
      if (gameState?.isRunning && !isPaused) {
        setIsPaused(true);
      }
    };
    setPauseListener(pauseListener);

    // Cleanup listener on component unmount
    return () => {
      setPauseListener(null);
    };
  }, [gameState?.isRunning, isPaused, setPauseListener]);

  // --- Audio Playback Effect ---
  useEffect(() => {
    if (gameState?.isRunning && !isPaused) {
      const letter = gameState.currentStimulus?.audio_stimulus.letter;
      if (letter) {
        const soundName = `letter_${letter}.mp3`;
        const audioSrc = `/sounds/${soundName}`;

        let audio = audioCache.current[audioSrc];
        if (!audio) {
          audio = new Audio(audioSrc);
          audioCache.current[audioSrc] = audio;
        }
        
        audio.play().catch(e => console.error(`Error playing ${audioSrc}:`, e));
      }
    }
  }, [gameState?.currentStimulus, gameState?.isRunning]);

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
    if (!gameState || !gameState.isRunning || isPaused) {
      return;
    }

    previousMatchStatusRef.current = {
      isVisualMatch: gameState.isVisualMatch,
      isAudioMatch: gameState.isAudioMatch,
    };

    const gameSpeed = gameState.settings.speed_ms;

    gameLoopTimerRef.current = window.setTimeout(async () => {
      try {
        if (gameState.currentTurnIndex > 0) {
          if (previousMatchStatusRef.current.isVisualMatch && !userResponseRef.current.visual_match) {
            setPositionMissed(true);
          }
          if (previousMatchStatusRef.current.isAudioMatch && !userResponseRef.current.audio_match) {
            setAudioMissed(true);
          }
        }

        await invoke('submit_user_input', { userResponse: userResponseRef.current });
        userResponseRef.current = { visual_match: false, audio_match: false };

        const newState = await invoke<GameState>('get_game_state');

        if (newState.isRunning) {
          setGameState(newState);
          setHasRespondedVisual(false);
          setHasRespondedAudio(false);
          setPositionFeedback(null);
          setAudioFeedback(null);
        } else {
          // Game is over. Update state and set transitioning flag to prevent UI flash.
          setGameState(s => s ? { ...s, isRunning: false } : null);
          setIsGameRunning(false);
          setIsTransitioning(true);
          
          // Use a new timer that is NOT tracked by the effect's cleanup ref.
          // This ensures the navigation is not cancelled by the re-render.
          setTimeout(async () => {
            try {
              // Add a small delay to ensure the session is persisted before fetching.
              await new Promise(resolve => setTimeout(resolve, 100));
              const history = await invoke<GameSessionSummary[]>('get_game_history');
              if (history.length > 0) {
                const latestSession = [...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                
                // Check for auto-adjustment
                if (contextSettings.autoAdjustNLevel) {
                  const visualAccuracy = calculateAccuracy(latestSession.visual_stats);
                  const audioAccuracy = calculateAccuracy(latestSession.audio_stats);
                  const overallAccuracy = (visualAccuracy + audioAccuracy) / 2;

                  if (overallAccuracy > contextSettings.highAccuracyThreshold) {
                    const confirmed = await confirm(t('game.increaseDifficultyPrompt') + '\n\n' + t('game.disableSuggestionInSettings'), {
                      title: t('game.difficultySuggestionTitle'),
                      okLabel: t('game.increase'),
                      cancelLabel: t('game.cancel'),
                    });
                    if (confirmed) {
                      setSettings(prev => ({ ...prev, n_level: Math.min(9, prev.n_level + 1) }));
                    }
                  } else if (overallAccuracy < contextSettings.lowAccuracyThreshold) {
                    const confirmed = await confirm(t('game.decreaseDifficultyPrompt') + '\n\n' + t('game.disableSuggestionInSettings'), {
                      title: t('game.difficultySuggestionTitle'),
                      okLabel: t('game.decrease'),
                      cancelLabel: t('game.cancel'),
                    });
                    if (confirmed) {
                      setSettings(prev => ({ ...prev, n_level: Math.max(1, prev.n_level - 1) }));
                    }
                  }
                }

                navigate(`/results/${latestSession.id}`, { state: { fromGame: true } });
              } else {
                navigate('/'); // Fallback if history is empty
              }
            } catch (e) {
              console.error("Failed to fetch history after game:", e);
              navigate('/'); // Fallback on error
            }
          }, 500);
        }
      } catch (error) {
        console.error("Failed to advance turn:", error);
        setGameState(s => s ? { ...s, isRunning: false } : null);
        setIsGameRunning(false);
      }
    }, gameSpeed);

    return () => {
      if (gameLoopTimerRef.current) {
        clearTimeout(gameLoopTimerRef.current);
      }
    };
  }, [gameState, navigate, isPaused]);

  const handleStartGame = useCallback(async () => {
    setIsLoading(true);
    setIsTransitioning(false); // Reset transitioning state
    try {
      await invoke('start_game');
      const newState = await invoke<GameState>('get_game_state');
      setGameState(newState);
      if (newState.isRunning) {
        setIsGameRunning(true);
      }
      userResponseRef.current = { visual_match: false, audio_match: false };
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
    
    const isCorrect = gameState.isVisualMatch;
    setPositionFeedback(isCorrect ? 'correct' : 'incorrect');
    setHasRespondedVisual(true);
    userResponseRef.current.visual_match = true;
  };

  const handleAudioMatch = () => {
    if (!gameState?.isRunning || hasRespondedAudio) return;

    const isCorrect = gameState.isAudioMatch;
    setAudioFeedback(isCorrect ? 'correct' : 'incorrect');
    setHasRespondedAudio(true);
    userResponseRef.current.audio_match = true;
  };

  const handlePauseToggle = () => {
    setIsPaused(prev => !prev);
  };

  const handleQuitGame = () => {
    // Stop the timer by setting isRunning to false
    setGameState(s => s ? { ...s, isRunning: false } : null);
    setIsGameRunning(false);
    // Navigate back to the home page
    navigate('/');
  };

  const renderGameContent = () => {
    if (settingsLoading) {
      return <p>{t('settings.loading')}</p>;
    }

    // Pre-Game View
    if (!gameState || (!gameState.isRunning && !isTransitioning)) {
      return (
        <div className="pre-game-container">
          <Card className="pre-game-card">
            <div className="stats-group-horizontal">
              <Stat icon={<BrainCircuit />} label={t('gameStatus.nLevel')} value={contextSettings.n_level} />
              <Stat icon={<Timer />} label={t('gameStatus.speed')} value={`${contextSettings.speed_ms}ms`} />
            </div>
          </Card>
          <Button onClick={handleStartGame} loading={isLoading} variant="primary" className="start-game-btn">
            {t('game.startGame')}
          </Button>
        </div>
      );
    }

    // Active Game View
    return (
      <>
        <GameHeader
          nLevel={gameState.settings.n_level}
          turn={gameState.currentTurnIndex}
          totalTurns={gameState.settings.session_length}
          visualAccuracy={gameState.visualAccuracy}
          audioAccuracy={gameState.audioAccuracy}
        />
        <div className="game-actions">
          <Button onClick={handlePauseToggle} variant="secondary" className="action-btn">
            {isPaused ? <Play /> : <Pause />}
            {isPaused ? t('game.resume') : t('game.pause')}
          </Button>
          <Button onClick={handleQuitGame} variant="danger" className="action-btn">
            <X />
            {t('game.quit')}
          </Button>
        </div>
        <Grid
          key={gameState.currentTurnIndex}
          activeIndex={gameState.currentStimulus?.visual_stimulus.position ?? null}
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
