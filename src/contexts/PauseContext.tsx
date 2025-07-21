import React, { createContext, useContext, useCallback, useRef, useMemo } from 'react';

interface PauseContextType {
  setPauseListener: (listener: (() => void) | null) => void;
  requestPause: () => void;
}

const PauseContext = createContext<PauseContextType | undefined>(undefined);

export const PauseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const listenerRef = useRef<(() => void) | null>(null);

  const setPauseListener = useCallback((listener: (() => void) | null) => {
    listenerRef.current = listener;
  }, []);

  const requestPause = useCallback(() => {
    if (listenerRef.current) {
      listenerRef.current();
    }
  }, []);

  const value = useMemo(() => ({ setPauseListener, requestPause }), [setPauseListener, requestPause]);

  return (
    <PauseContext.Provider value={value}>
      {children}
    </PauseContext.Provider>
  );
};

export const usePause = (): PauseContextType => {
  const context = useContext(PauseContext);
  if (!context) {
    throw new Error('usePause must be used within a PauseProvider');
  }
  return context;
};
