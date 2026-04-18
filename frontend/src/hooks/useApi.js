import { useState, useEffect, useCallback, useRef } from 'react';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'API error');
  return json.data;
}

/**
 * useApi(path, deps)
 * Fetches on mount (and when deps change). Returns { data, loading, error, refetch }.
 */
export function useApi(path, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const abortRef = useRef(null);

  const fetch_ = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const d = await apiFetch(path, { signal: abortRef.current.signal });
      setData(d);
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  useEffect(() => { fetch_(); return () => abortRef.current?.abort(); }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

/**
 * useApiPost()
 * Returns a post() function and { data, loading, error }.
 */
export function useApiPost(path) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const post = useCallback(async (body) => {
    setLoading(true);
    setError(null);
    try {
      const d = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
      setData(d);
      return d;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [path]);

  return { post, data, loading, error };
}

export { apiFetch };
export default apiFetch;
