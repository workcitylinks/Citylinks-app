import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../api/apiClient';
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

  // Build unique cache key based on endpoint and normalized params
  const serializedParams = params ? JSON.stringify(params) : '';
  const cacheKey = endpoint ? `${endpoint}:${serializedParams}` : '';

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

      // 1. Check in-memory cache unless forced
      if (!force) {
        const memCached = queryCache.get<T>(cacheKey);
        if (memCached !== null) {
          if (isMountedRef.current) {
            setData(memCached);
            setLoading(false);
            setRefreshing(false);
          }
          return memCached;
        }

        // 2. Check persistent cache if enabled
        if (persist) {
          const persCached = await queryCache.getPersistent<T>(cacheKey);
          if (persCached !== null) {
            if (isMountedRef.current) {
              setData(persCached);
              setLoading(false);
              setRefreshing(false);
            }
            return persCached;
          }
        }
      }

      // 3. Perform backend request with in-flight deduplication
      try {
        if (force) {
          setRefreshing(true);
        } else if (!dataRef.current) {
          setLoading(true);
        }

        const result = await queryCache.fetchWithDeduplication(cacheKey, async () => {
          const res = await apiClient.get<T>(endpoint, { params: paramsRef.current });
          return res.data;
        });

        // Store in cache
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

  useEffect(() => {
    if (!enabled || !endpoint) return;

    // Check if we already have cache for this key
    const memCached = queryCache.get<T>(cacheKey);
    if (memCached !== null) {
      setData(memCached);
      setLoading(false);
      return;
    }

    fetchData();
  }, [cacheKey, enabled, endpoint]);

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
