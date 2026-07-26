import { useState, useEffect, useRef, useCallback } from 'react';

type CacheEntry<T> = { data: T; timestamp: number };

const aiPageCache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL = 60_000;

export function clearAiPageCache() {
  aiPageCache.clear();
}

function cacheKey(name: string, args: any[]): string {
  return name + '::' + args.map(a => JSON.stringify(a)).join('|');
}

export function useAiPageData<T>(
  name: string,
  fetcher: () => Promise<T>,
  options?: { ttl?: number; enabled?: boolean; deps?: any[] }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const ttl = options?.ttl ?? DEFAULT_TTL;
  const enabled = options?.enabled ?? true;
  const deps = options?.deps ?? [];

  const fetcherRef = useRef(fetcher);
  useEffect(() => { fetcherRef.current = fetcher; }, [fetcher]);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    const key = cacheKey(name, deps);
    const now = Date.now();
    const cached = aiPageCache.get(key);
    if (cached && now - cached.timestamp < ttl) {
      setData(cached.data);
      setLoading(false);
      setError(null);
      return;
    }
    // Stale-while-revalidate: show stale data immediately, refetch in background
    if (cached) {
      setData(cached.data);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (mountedRef.current) {
        aiPageCache.set(key, { data: result, timestamp: Date.now() });
        setData(result);
        setLoading(false);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err?.message ?? 'Failed to load');
        setLoading(false);
      }
    }
  }, [name, ttl, enabled, ...deps]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
