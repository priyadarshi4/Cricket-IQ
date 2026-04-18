import { useState, useCallback } from 'react';
import { runPrediction } from '../utils/prediction';

/**
 * usePrediction — manages prediction state + fake async delay
 * so the UI feels responsive when models "run".
 */
export function usePrediction() {
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const predict = useCallback(async (params) => {
    const { team1, team2 } = params;
    if (!team1 || !team2)       { setError('Select both teams.');         return; }
    if (team1 === team2)        { setError('Teams must be different.');    return; }
    setError('');
    setResult(null);
    setLoading(true);
    // Simulate model inference latency (feels more real)
    await new Promise(r => setTimeout(r, 650 + Math.random() * 300));
    try {
      const r = runPrediction(params);
      setResult(r);
    } catch (e) {
      setError('Prediction failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError('');
  }, []);

  return { result, loading, error, predict, reset };
}
