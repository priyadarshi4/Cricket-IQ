import React, { createContext, useContext } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const HistoryCtx = createContext(null);

/**
 * PredictionHistoryProvider — stores last 20 predictions in localStorage.
 * Wrap App in this provider, then call usePredictionHistory() in any component.
 */
export function PredictionHistoryProvider({ children }) {
  const [history, setHistory, clearHistory] = useLocalStorage('ciq_history', []);

  const addPrediction = (result) => {
    setHistory(prev => [{
      ...result,
      timestamp: new Date().toISOString(),
      id: Date.now(),
    }, ...prev].slice(0, 20));          // keep last 20
  };

  return (
    <HistoryCtx.Provider value={{ history, addPrediction, clearHistory }}>
      {children}
    </HistoryCtx.Provider>
  );
}

export function usePredictionHistory() {
  const ctx = useContext(HistoryCtx);
  if (!ctx) throw new Error('Must be inside PredictionHistoryProvider');
  return ctx;
}
