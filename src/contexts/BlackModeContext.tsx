import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface BlackModeContextType {
  isBlackMode: boolean;
  activateBlackMode: () => void;
  deactivateBlackMode: () => void;
}

const BlackModeContext = createContext<BlackModeContextType | undefined>(undefined);

const BM_STORE_KEY = '_bm';

export const BlackModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isBlackMode, setIsBlackMode] = useState(() => localStorage.getItem(BM_STORE_KEY) === '1');

  useEffect(() => {
    if (isBlackMode) {
      document.documentElement.classList.add('bm-active');
    } else {
      document.documentElement.classList.remove('bm-active');
    }
  }, [isBlackMode]);

  const activateBlackMode = () => {
    localStorage.setItem(BM_STORE_KEY, '1');
    setIsBlackMode(true);
  };

  const deactivateBlackMode = () => {
    localStorage.removeItem(BM_STORE_KEY);
    setIsBlackMode(false);
  };

  return (
    <BlackModeContext.Provider value={{ isBlackMode, activateBlackMode, deactivateBlackMode }}>
      {children}
    </BlackModeContext.Provider>
  );
};

export const useBlackMode = () => {
  const context = useContext(BlackModeContext);
  if (!context) throw new Error('useBlackMode must be used within BlackModeProvider');
  return context;
};
