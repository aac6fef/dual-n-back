import React, { createContext, useState, useContext, useMemo } from 'react';

interface GameStatusContextType {
  isGameRunning: boolean;
  setIsGameRunning: (isRunning: boolean) => void;
}

const GameStatusContext = createContext<GameStatusContextType | undefined>(undefined);

export const GameStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isGameRunning, setIsGameRunning] = useState(false);

  const value = useMemo(() => ({
    isGameRunning,
    setIsGameRunning,
  }), [isGameRunning]);

  return (
    <GameStatusContext.Provider value={value}>
      {children}
    </GameStatusContext.Provider>
  );
};

export const useGameStatus = (): GameStatusContextType => {
  const context = useContext(GameStatusContext);
  if (!context) {
    throw new Error('useGameStatus must be used within a GameStatusProvider');
  }
  return context;
};
