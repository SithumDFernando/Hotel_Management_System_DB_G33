import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/utils/formatters';

// useFetch(fetcher, deps, { enabled, failMessage }) -> { data, isLoading, error, refetch }
// `fetcher` is called with an AbortSignal; stale responses are ignored.
// failMessage ("Couldn't load bookings.") leads the error text, so ErrorState says
// what failed before why.
export default function useFetch(fetcher, deps = [], { enabled = true, failMessage } = {}) {
  const [data, setData] = useState(null);
  const [isLoading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    Promise.resolve(fetcherRef.current(ctrl.signal))
      .then((res) => {
        if (!ctrl.signal.aborted) setData(res);
      })
      .catch((err) => {
        if (ctrl.signal.aborted || err?.code === 'ERR_CANCELED') return;
        setError(failMessage ? `${failMessage} ${errorMessage(err)}` : errorMessage(err));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { data, isLoading, error, refetch, setData };
}
