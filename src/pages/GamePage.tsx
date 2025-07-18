import React, { useState, useEffect } from 'react';
import Button from '../components/ui/Button';
import Grid from '../components/Grid';
import GameControls from '../components/GameControls';
import GameStatus from '../components/GameStatus';

const GamePage: React.FC = () => {
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // Placeholder state for game status
  const [nLevel, setNLevel] = useState(2);
  const [turn, setTurn] = useState(0);
  const [totalTurns, setTotalTurns] = useState(20);
  const [visualAccuracy, setVisualAccuracy] = useState(100.0);
  const [audioAccuracy, setAudioAccuracy] = useState(100.0);

  const handleStartGame = () => {
    setIsGameRunning(true);
    setVisualAccuracy(100.0);
    setAudioAccuracy(100.0);
    setTurn(0);
    // In the future, this will call the backend `start_game` command
    console.log('Game started!');
  };

  const handleStopGame = () => {
    setIsGameRunning(false);
    setActiveIndex(null);
    console.log('Game stopped!');
  };

  // Effect to simulate game ticks
  useEffect(() => {
    if (isGameRunning) {
      const interval = setInterval(() => {
        // Simulate a new stimulus
        setActiveIndex(Math.floor(Math.random() * 9));
        setTurn((prevTurn) => {
          if (prevTurn >= totalTurns) {
            setIsGameRunning(false);
            return prevTurn;
          }
          return prevTurn + 1;
        });
        // Simulate accuracy changes
        setVisualAccuracy((prev) => Math.max(0, prev - Math.random() * 2));
        setAudioAccuracy((prev) => Math.max(0, prev - Math.random() * 2));
      }, 2000); // Stimulus every 2 seconds

      return () => clearInterval(interval);
    }
  }, [isGameRunning, totalTurns]);

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Dual N-Back</h1>
      <GameStatus
        nLevel={nLevel}
        turn={turn}
        totalTurns={totalTurns}
        visualAccuracy={visualAccuracy}
        audioAccuracy={audioAccuracy}
      />
      <Grid activeIndex={activeIndex} />
      <GameControls
        onPositionMatch={() => console.log('Position match clicked')}
        onAudioMatch={() => console.log('Audio match clicked')}
        disabled={!isGameRunning}
      />
      <div style={{ marginTop: '1.5rem' }}>
        {!isGameRunning ? (
          <Button onClick={handleStartGame}>Start Game</Button>
        ) : (
          <Button onClick={handleStopGame} variant="secondary">
            Stop Game
          </Button>
        )}
      </div>
    </div>
  );
};

export default GamePage;
