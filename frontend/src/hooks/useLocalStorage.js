import { useState, useEffect } from 'react';

/**
 * useLocalStorage — syncs state to localStorage.
 * Useful for persisting prediction history, favourite teams, etc.
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota errors
    }
  }, [key, value]);

  const remove = () => {
    window.localStorage.removeItem(key);
    setValue(initialValue);
  };

  return [value, setValue, remove];
}
