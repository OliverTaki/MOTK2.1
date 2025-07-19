import { Request, Response, NextFunction } from 'express';

export interface CacheOptions {
  ttl: number; // Time to live in seconds
  key?: string; // Custom cache key
  condition?: (req: Request, res: Response) => boolean; // Condition to cache
  tags?: string[]; // Tags for cache invalidation
}

export interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  tags: string[];
  hits: number;
}

/**
 * In-memory cache service with TTL and tag-based invalidation
 * For production, this should be replaced with Redis or similar
 */
export class CacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get value from cache
   */
  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    // Increment hit counter
    entry.hits++;
    
    return entry.data as T;
  }

  /**
   * Set value in cache
   */
  set(key: string, data: any, ttl: number = 300, tags: string[] = []): void {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl,
      tags,
      hits: 0
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidate cache entries by tags
   */
  invalidateByTags(tags: string[]): number {
    let invalidated = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    
    return invalidated;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    totalHits: number;
    entries: Array<{
      key: string;
      size: number;
      hits: number;
      age: number;
      ttl: number;
      tags: string[];
    }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      size: JSON.stringify(entry.data).length,
      hits: entry.hits,
      age: Math.floor((Date.now() - entry.timestamp) / 1000),
      ttl: entry.ttl,
      tags: entry.tags
    }));

    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);

    return {
      size: this.cache.size,
      totalHits,
      entries
    };
  }

  /**
   * Express middleware for caching responses
   */
  middleware(options: CacheOptions) {
    return (req: Request, res: Response, next: NextFunction) => {
      // Generate cache key
      const cacheKey = options.key || this.generateKey(req);
      
      // Check condition if provided
      if (options.condition && !options.condition(req, res)) {
        return next();
      }

      // Try to get from cache
      const cached = this.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(this: Response, body: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, body, options.ttl, options.tags || []);
        }
        
        return originalJson.call(this, body);
      };

      next();
    };
  }

  /**
   * Generate cache key from request
   */
  private generateKey(req: Request): string {
    const { method, path, query } = req;
    const queryString = Object.keys(query).length > 0 ? JSON.stringify(query) : '';
    return `${method}:${path}:${queryString}`;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Destroy the cache service
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Common cache configurations
export const CacheConfigs = {
  // Short-term cache for frequently accessed data
  SHORT: { ttl: 60, tags: ['short'] }, // 1 minute
  
  // Medium-term cache for semi-static data
  MEDIUM: { ttl: 300, tags: ['medium'] }, // 5 minutes
  
  // Long-term cache for static data
  LONG: { ttl: 3600, tags: ['long'] }, // 1 hour
  
  // Entity-specific caches
  ENTITIES: { ttl: 300, tags: ['entities'] },
  SHEETS: { ttl: 180, tags: ['sheets'] },
  FILES: { ttl: 600, tags: ['files'] },
  AUTH: { ttl: 900, tags: ['auth'] }, // 15 minutes
  
  // Conditional caching
  AUTHENTICATED_ONLY: {
    ttl: 300,
    tags: ['auth'],
    condition: (req: Request) => !!req.user
  },
  
  GET_ONLY: {
    ttl: 300,
    tags: ['readonly'],
    condition: (req: Request) => req.method === 'GET'
  }
};