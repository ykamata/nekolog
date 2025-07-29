import { describe, it, expect, beforeEach } from 'vitest';
import Cache, { apiCache, createCacheKey } from '~/utils/cache';

describe('Cache Performance Tests', () => {
  let testCache: Cache<any>;

  beforeEach(() => {
    testCache = new Cache('test', { ttl: 1000, maxSize: 100 });
  });

  it('should set and get items quickly', () => {
    const startTime = performance.now();

    // Set 100 items
    for (let i = 0; i < 100; i++) {
      testCache.set(`key${i}`, { data: `value${i}`, index: i });
    }

    const setTime = performance.now() - startTime;

    const getStartTime = performance.now();

    // Get all 100 items
    for (let i = 0; i < 100; i++) {
      const result = testCache.get(`key${i}`);
      expect(result).toBeDefined();
    }

    const getTime = performance.now() - getStartTime;

    console.log(`Cache set time: ${setTime.toFixed(2)}ms`);
    console.log(`Cache get time: ${getTime.toFixed(2)}ms`);

    // Both operations should be very fast
    expect(setTime).toBeLessThan(50);
    expect(getTime).toBeLessThan(50);
  });

  it('should handle cache misses efficiently', () => {
    const startTime = performance.now();

    // Try to get 100 non-existent items
    for (let i = 0; i < 100; i++) {
      const result = testCache.get(`nonexistent${i}`);
      expect(result).toBeNull();
    }

    const missTime = performance.now() - startTime;

    console.log(`Cache miss time: ${missTime.toFixed(2)}ms`);

    // Cache misses should be very fast
    expect(missTime).toBeLessThan(20);
  });

  it('should handle getOrSet pattern efficiently', async () => {
    let fetchCount = 0;

    const fetcher = async () => {
      fetchCount++;
      // Simulate some async work
      await new Promise(resolve => setTimeout(resolve, 10));
      return { data: 'fetched', timestamp: Date.now() };
    };

    const startTime = performance.now();

    // First call should fetch
    const result1 = await testCache.getOrSet('test-key', fetcher);
    const firstCallTime = performance.now() - startTime;

    const secondStartTime = performance.now();

    // Second call should use cache
    const result2 = await testCache.getOrSet('test-key', fetcher);
    const secondCallTime = performance.now() - secondStartTime;

    console.log(`First call time: ${firstCallTime.toFixed(2)}ms`);
    console.log(`Second call time: ${secondCallTime.toFixed(2)}ms`);

    expect(fetchCount).toBe(1); // Should only fetch once
    expect(result1).toEqual(result2); // Should return same result
    expect(secondCallTime).toBeLessThan(5); // Cached call should be very fast
  });

  it('should handle cache invalidation efficiently', () => {
    // Set up test data
    for (let i = 0; i < 50; i++) {
      testCache.set(`user:${i}`, { id: i, name: `User ${i}` });
      testCache.set(`post:${i}`, { id: i, title: `Post ${i}` });
    }

    expect(testCache.size()).toBe(100);

    const startTime = performance.now();

    // Invalidate all user keys
    testCache.invalidatePattern(/^user:/);

    const invalidateTime = performance.now() - startTime;

    console.log(`Invalidation time: ${invalidateTime.toFixed(2)}ms`);

    expect(testCache.size()).toBe(50); // Should have removed 50 user keys
    expect(invalidateTime).toBeLessThan(20); // Should be fast

    // Verify user keys are gone but post keys remain
    expect(testCache.get('user:0')).toBeNull();
    expect(testCache.get('post:0')).toBeDefined();
  });

  it('should handle memory pressure gracefully', () => {
    const largeCache = new Cache('large', { maxSize: 10 });

    const startTime = performance.now();

    // Add more items than max size
    for (let i = 0; i < 20; i++) {
      largeCache.set(`key${i}`, { data: `value${i}` });
    }

    const addTime = performance.now() - startTime;

    console.log(`Large dataset add time: ${addTime.toFixed(2)}ms`);

    // Should maintain max size
    expect(largeCache.size()).toBe(10);

    // Should be reasonably fast even with eviction
    expect(addTime).toBeLessThan(50);

    // Most recent items should still be there
    expect(largeCache.get('key19')).toBeDefined();
    expect(largeCache.get('key18')).toBeDefined();

    // Oldest items should be evicted
    expect(largeCache.get('key0')).toBeNull();
    expect(largeCache.get('key1')).toBeNull();
  });

  it('should create cache keys efficiently', () => {
    const startTime = performance.now();

    const keys: string[] = [];
    for (let i = 0; i < 1000; i++) {
      keys.push(createCacheKey('meals', 'user', i, 'filter', { type: 'DRY' }));
    }

    const keyTime = performance.now() - startTime;

    console.log(`Cache key creation time: ${keyTime.toFixed(2)}ms`);

    expect(keyTime).toBeLessThan(50);
    expect(keys.length).toBe(1000);
    expect(keys[0]).toContain('meals:user:0');
  });

  it('should handle concurrent access efficiently', async () => {
    const concurrentOperations = 50;
    const startTime = performance.now();

    // Simulate concurrent cache operations
    const promises = Array.from(
      { length: concurrentOperations },
      async (_, i) => {
        testCache.set(`concurrent${i}`, { value: i });
        const result = testCache.get(`concurrent${i}`);
        expect(result).toBeDefined();
        return result;
      },
    );

    const results = await Promise.all(promises);
    const concurrentTime = performance.now() - startTime;

    console.log(`Concurrent operations time: ${concurrentTime.toFixed(2)}ms`);

    expect(results.length).toBe(concurrentOperations);
    expect(concurrentTime).toBeLessThan(100);
  });

  it('should cleanup expired items efficiently', async () => {
    const shortTtlCache = new Cache('short', { ttl: 50 }); // 50ms TTL

    // Add items
    for (let i = 0; i < 20; i++) {
      shortTtlCache.set(`temp${i}`, { value: i });
    }

    expect(shortTtlCache.size()).toBe(20);

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 100));

    const cleanupStartTime = performance.now();

    // Trigger cleanup by trying to get an item
    const result = shortTtlCache.get('temp0');

    const cleanupTime = performance.now() - cleanupStartTime;

    console.log(`Cleanup time: ${cleanupTime.toFixed(2)}ms`);

    expect(result).toBeNull(); // Should be expired
    expect(cleanupTime).toBeLessThan(20); // Cleanup should be fast
  });
});

describe('API Cache Integration', () => {
  it('should integrate with API cache efficiently', () => {
    const startTime = performance.now();

    // Simulate API response caching
    const mockApiResponse = {
      data: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        timestamp: Date.now(),
      })),
      pagination: { total: 100, page: 1, hasMore: false },
    };

    const cacheKey = createCacheKey('api', 'meals', 'page:1', 'limit:100');
    apiCache.set(cacheKey, mockApiResponse);

    const setTime = performance.now() - startTime;

    const getStartTime = performance.now();
    const cachedResponse = apiCache.get(cacheKey);
    const getTime = performance.now() - getStartTime;

    console.log(`API cache set time: ${setTime.toFixed(2)}ms`);
    console.log(`API cache get time: ${getTime.toFixed(2)}ms`);

    expect(cachedResponse).toEqual(mockApiResponse);
    expect(setTime).toBeLessThan(20);
    expect(getTime).toBeLessThan(5);
  });
});
