import { useState, useCallback } from 'react';

export function useUndoRedo<T>(initialState: T) {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setIndex] = useState(0);

  const state = history[index];

  const setState = useCallback((newState: T | ((prevState: T) => T)) => {
    setHistory(prev => {
      const nextHistory = prev.slice(0, index + 1);
      const nextState = typeof newState === 'function' ? (newState as Function)(prev[index]) : newState;
      nextHistory.push(nextState);
      setIndex(nextHistory.length - 1);
      return nextHistory;
    });
  }, [index]);

  const undo = useCallback(() => {
    if (index > 0) {
      setIndex(prev => prev - 1);
    }
  }, [index]);

  const redo = useCallback(() => {
    if (index < history.length - 1) {
      setIndex(prev => prev + 1);
    }
  }, [index, history.length]);

  return { state, setState, undo, redo, canUndo: index > 0, canRedo: index < history.length - 1 };
}
