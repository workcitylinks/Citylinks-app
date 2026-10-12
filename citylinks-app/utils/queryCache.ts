import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

// In-memory memory store for instant <1ms lookups
const memoryStore = new Map<string, CacheEntry<any>>();

// In-flight deduplication promise store
const inflightPromises = new Map<string, Promise<any>>();

const CACHE_STORAGE_PREFIX = '@citylinks_cache_';

/**
 * High-performance Cache Manager for CityLinks Mobile App
 * - In-memory cache for instant synchronous lookups
 * - In-flight request deduplication to prevent concurrent duplicate backend calls
 * - Persistent storage fallback for offline / immediate load
 */
export const queryCache = {
  /**
   * Get cached data if still within TTL
   */
  get<T>(key: string): T | null {
    const entry = memoryStore.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttlMs;
    if (isExpired) {
      memoryStore.delete(key);
      return null;
    }
    return entry.data as T;
  },

  /**
   * Set cached data with custom TTL (defaults to 2 minutes / 120,000ms)
   */
  set<T>(key: string, data: T, ttlMs: number = 120_000, persist: boolean = false): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttlMs,
    };
    memoryStore.set(key, entry);

    if (persist) {
      try {
        AsyncStorage.setItem(`${CACHE_STORAGE_PREFIX}${key}`, JSON.stringify(entry)).catch(() => {});
      } catch (e) {
        // Ignore storage write failure
      }
    }
  },

  /**
   * Async get from AsyncStorage if memory cache missed (warm up)
   */
  async getPersistent<T>(key: string): Promise<T | null> {
    // Check memory first
    const mem = this.get<T>(key);
    if (mem !== null) return mem;

    try {
      const stored = await AsyncStorage.getItem(`${CACHE_STORAGE_PREFIX}${key}`);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);
      const isExpired = Date.now() - entry.timestamp > entry.ttlMs;
      if (isExpired) {
        AsyncStorage.removeItem(`${CACHE_STORAGE_PREFIX}${key}`).catch(() => {});
        return null;
      }

      // Populate memory store
      memoryStore.set(key, entry);
      return entry.data;
    } catch {
      return null;
    }
  },

  /**
   * Invalidate specific key or keys starting with prefix
   */
  invalidate(keyOrPrefix: string): void {
    for (const key of memoryStore.keys()) {
      if (key.startsWith(keyOrPrefix) || key === keyOrPrefix) {
        memoryStore.delete(key);
        AsyncStorage.removeItem(`${CACHE_STORAGE_PREFIX}${key}`).catch(() => {});
      }
    }
  },

  /**
   * Clear all cached query entries
   */
  clear(): void {
    memoryStore.clear();
  },

  /**
   * In-flight deduplication wrapper:
   * If a fetch for this key is already running, returns the existing promise
   */
  fetchWithDeduplication<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const existing = inflightPromises.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = fetcher().finally(() => {
      inflightPromises.delete(key);
    });

    inflightPromises.set(key, promise);
    return promise;
  },
};
