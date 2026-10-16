import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useFetch(fn, deps) runs fn() (which must return a promise) whenever deps change.
 * Returns { data, loading, error, reload, setData }. Stale responses are ignored.
 */
export function useFetch(fn, deps = [], { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const run = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const load = useCallback(() => {
    const id = ++run.current;
    setLoading(true);
    setError(null);
    return Promise.resolve()
      .then(() => fnRef.current())
      .then((d) => { if (id === run.current) setData(d); })
      .catch((e) => { if (id === run.current) setError(e); })
      .finally(() => { if (id === run.current) setLoading(false); });
  }, []);

  useEffect(() => {
    if (enabled) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { data, loading, error, reload: load, setData };
}

export function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
