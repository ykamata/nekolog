interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items in cache
  serialize?: boolean; // Whether to serialize data to localStorage
}

class Cache<T = any> {
  private cache = new Map<string, CacheItem<T>>();
  private readonly defaultTTL: number;
  private readonly maxSize: number;
  private readonly serialize: boolean;
  private readonly storageKey: string;

  constructor(name: string, options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize || 100;
    this.serialize = options.serialize || false;
    this.storageKey = `cache_${name}`;

    // Load from localStorage if serialization is enabled
    if (this.serialize && import.meta.client) {
      this.loadFromStorage();
    }

    // Cleanup expired items periodically
    if (import.meta.client) {
      setInterval(() => this.cleanup(), 60000); // Every minute
    }
  }

  set(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      key,
    };

    // Remove oldest item if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, item);

    // Save to localStorage if serialization is enabled
    if (this.serialize && import.meta.client) {
      this.saveToStorage();
    }
  }

  get(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      if (this.serialize && import.meta.client) {
        this.saveToStorage();
      }
      return null;
    }

    return item.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted && this.serialize && import.meta.client) {
      this.saveToStorage();
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    if (this.serialize && import.meta.client) {
      localStorage.removeItem(this.storageKey);
    }
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Get or set pattern
  async getOrSet(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }

  // Invalidate keys matching pattern
  invalidatePattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
  }

  // Get cache statistics
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: number;
  } {
    let totalSize = 0;
    for (const item of this.cache.values()) {
      totalSize += JSON.stringify(item).length;
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses
      memoryUsage: totalSize,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0 && this.serialize && import.meta.client) {
      this.saveToStorage();
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        for (const [key, item] of Object.entries(data)) {
          this.cache.set(key, item as CacheItem<T>);
        }
      }
    }
    catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.cache.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
    catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }
}

// Create cache instances for different data types
export const apiCache = new Cache('api', {
  ttl: 2 * 60 * 1000, // 2 minutes
  maxSize: 50,
});

export const imageCache = new Cache('images', {
  ttl: 30 * 60 * 1000, // 30 minutes
  maxSize: 100,
  serialize: true,
});

export const userDataCache = new Cache('userData', {
  ttl: 10 * 60 * 1000, // 10 minutes
  maxSize: 20,
  serialize: true,
});

// Utility functions for common caching patterns
export function createCacheKey(...parts: (string | number)[]): string {
  return parts.join(':');
}

export function invalidateRelatedCache(pattern: string): void {
  const regex = new RegExp(pattern);
  apiCache.invalidatePattern(regex);
  userDataCache.invalidatePattern(regex);
}

// Cache decorator for functions
export function cached<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    keyGenerator?: (...args: Parameters<T>) => string;
    ttl?: number;
    cache?: Cache;
  } = {},
): T {
  const cache = options.cache || apiCache;
  const keyGenerator
    = options.keyGenerator || ((...args) => JSON.stringify(args));

  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);

    return cache.getOrSet(key, () => fn(...args), options.ttl);
  }) as T;
}

// Memory-aware cache that adjusts based on available memory
export class AdaptiveCache<T = any> extends Cache<T> {
  private memoryThreshold = 50 * 1024 * 1024; // 50MB

  constructor(name: string, options: CacheOptions = {}) {
    super(name, options);

    if (import.meta.client && 'memory' in performance) {
      // Monitor memory usage
      setInterval(() => this.checkMemoryUsage(), 30000); // Every 30 seconds
    }
  }

  private checkMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory.usedJSHeapSize > this.memoryThreshold) {
        // Clear half the cache when memory usage is high
        const keys = this.keys();
        const keysToDelete = keys.slice(0, Math.floor(keys.length / 2));
        keysToDelete.forEach(key => this.delete(key));
      }
    }
  }
}

export const adaptiveCache = new AdaptiveCache('adaptive', {
  ttl: 5 * 60 * 1000,
  maxSize: 200,
});

export default Cache;
