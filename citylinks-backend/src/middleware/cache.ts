import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  data: any;
  expiresAt: number;
}

const memoryStore = new Map<string, CacheEntry>();

/**
 * In-memory API cache middleware with TTL (time to live) in seconds
 * Drastically reduces database query load for frequent, repeated GET requests.
 */
export function cacheResponse(durationSeconds: number = 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Include user id if authenticated so user-specific queries are not leaked across users
    const userId = (req as any).user?.id;
    const userPrefix = userId ? `user:${userId}:` : '';
    const cacheKey = `${userPrefix}${req.originalUrl || req.url}`;
    const now = Date.now();
    const cached = memoryStore.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      // Set HTTP cache header and return cached response directly
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${durationSeconds}`);
      return res.json(cached.data);
    }

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', `public, max-age=${durationSeconds}`);

    // Intercept res.json to capture response before sending
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      // Only cache successful status codes
      if (res.statusCode >= 200 && res.statusCode < 300) {
        memoryStore.set(cacheKey, {
          data: body,
          expiresAt: now + durationSeconds * 1000,
        });
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Invalidate all cached entries matching a prefix or pattern (e.g. on mutation)
 */
export function invalidateCache(pattern?: string) {
  if (!pattern) {
    memoryStore.clear();
    return;
  }
  for (const key of memoryStore.keys()) {
    if (key.includes(pattern)) {
      memoryStore.delete(key);
    }
  }
}
