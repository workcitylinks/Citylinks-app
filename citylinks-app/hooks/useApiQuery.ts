import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, onApiEnvironmentChange } from '../api/apiClient';
import { queryCache } from '../utils/queryCache';

export interface UseApiQueryOptions<T> {
  params?: Record<string, any>;
  ttlMs?: number;
  enabled?: boolean;
  persist?: boolean;
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
}

export interface UseApiQueryResult<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: any;
  refetch: (opts?: { force?: boolean }) => Promise<T | null>;
  mutate: (newData: T | ((prev: T | null) => T), opts?: { revalidate?: boolean }) => void;
}

/**
 * Core cached data querying hook.
 * Avoids backend and database load by:
 * 1. Immediate in-memory cache return (<1ms)
 * 2. In-flight request deduplication
 * 3. Configurable TTL
 * 4. Cache-aware pull-to-refresh
 */
export function useApiQuery<T = any>(
  endpoint: string | null,
  options: UseApiQueryOptions<T> = {}
): UseApiQueryResult<T> {
  const {
    params,
    ttlMs = 120_000, // 2 minutes default TTL
    enabled = true,
    persist = false,
    initialData,
    onSuccess,
    onError,
  } = options;

  // Scope cache key by active server URL so production and local caches never collide
  const serializedParams = params ? JSON.stringify(params) : '';
  const activeBase = apiClient.defaults.baseURL || 'default';
  const cacheKey = endpoint ? `${activeBase}::${endpoint}:${serializedParams}` : '';

  // Synchronously initialize from in-memory cache if available
  const cachedInitial = cacheKey ? queryCache.get<T>(cacheKey) : null;
  const initialValue = cachedInitial ?? (initialData ?? null);

  const [data, setData] = useState<T | null>(initialValue);
  const [loading, setLoading] = useState<boolean>(!initialValue && Boolean(endpoint) && enabled);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  const dataRef = useRef<T | null>(data);
  dataRef.current = data;
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(
    async (opts?: { force?: boolean }): Promise<T | null> => {
      if (!endpoint || !enabled) return null;

      const force = opts?.force ?? false;
      let hasCachedData = false;

      // 1. Immediately show cached data for this active server if available (0ms render)
      if (!force) {
        const memCached = queryCache.get<T>(cacheKey);
        if (memCached !== null) {
          hasCachedData = true;
          if (isMountedRef.current) {
            setData(memCached);
            setLoading(false);
          }
        } else if (persist) {
          const persCached = await queryCache.getPersistent<T>(cacheKey);
          if (persCached !== null) {
            hasCachedData = true;
            if (isMountedRef.current) {
              setData(persCached);
              setLoading(false);
            }
          }
        }
      }

      // If we don't have cached data yet, show initial loading spinner
      if (!hasCachedData && !dataRef.current) {
        if (isMountedRef.current) setLoading(true);
      }
      if (force && isMountedRef.current) {
        setRefreshing(true);
      }

      // 2. ALWAYS fetch live from the active backend (Stale-While-Revalidate)
      try {
        const result = await queryCache.fetchWithDeduplication(cacheKey, async () => {
          const res = await apiClient.get<T>(endpoint, { params: paramsRef.current });
          return res.data;
        });

        // Store in cache for this server
        queryCache.set(cacheKey, result, ttlMs, persist);

        if (isMountedRef.current) {
          setData(result);
          setError(null);
          onSuccessRef.current?.(result);
        }
        return result;
      } catch (err: any) {
        if (isMountedRef.current) {
          setError(err);
          onErrorRef.current?.(err);
        }
        return null;
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [endpoint, enabled, cacheKey, ttlMs, persist]
  );

  // Initial fetch
  useEffect(() => {
    if (!enabled || !endpoint) return;
    fetchData();
  }, [cacheKey, enabled, endpoint, fetchData]);

  // Instantly re-fetch when the active API environment switches
  useEffect(() => {
    const unsubscribe = onApiEnvironmentChange(() => {
      if (isMountedRef.current && enabled) {
        fetchData({ force: true });
      }
    });
    return () => {
      unsubscribe();
    };
  }, [fetchData, enabled]);

  const mutate = useCallback(
    (newData: T | ((prev: T | null) => T), opts?: { revalidate?: boolean }) => {
      const resolved = typeof newData === 'function' ? (newData as any)(data) : newData;
      setData(resolved);
      if (cacheKey) {
        queryCache.set(cacheKey, resolved, ttlMs, persist);
      }
      if (opts?.revalidate) {
        fetchData({ force: true });
      }
    },
    [data, cacheKey, ttlMs, persist, fetchData]
  );

  return {
    data,
    loading,
    refreshing,
    error,
    refetch: fetchData,
    mutate,
  };
}
