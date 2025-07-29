import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setup, $fetch } from '@nuxt/test-utils/e2e';

describe('API Performance Tests', async () => {
  await setup({
    // Test configuration
  });

  const PERFORMANCE_THRESHOLD = 1000; // 1 second in milliseconds

  // Helper function to measure response time
  const measureResponseTime = async (
    url: string,
    options?: any,
  ): Promise<number> => {
    const startTime = performance.now();
    await $fetch(url, options);
    const endTime = performance.now();
    return endTime - startTime;
  };

  // Helper function to run multiple requests and get average
  const measureAverageResponseTime = async (
    url: string,
    iterations: number = 5,
    options?: any,
  ): Promise<{
    average: number;
    min: number;
    max: number;
    all: number[];
  }> => {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const time = await measureResponseTime(url, options);
      times.push(time);

      // Small delay between requests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      average: times.reduce((sum, time) => sum + time, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      all: times,
    };
  };

  describe('Meals API Performance', () => {
    it('should fetch meals list within performance threshold', async () => {
      const stats = await measureAverageResponseTime('/api/meals');

      console.log(
        `Meals API - Average: ${stats.average.toFixed(
          2,
        )}ms, Min: ${stats.min.toFixed(2)}ms, Max: ${stats.max.toFixed(2)}ms`,
      );

      expect(stats.average).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(stats.max).toBeLessThan(PERFORMANCE_THRESHOLD * 1.5); // Allow 50% buffer for max
    });

    it('should fetch meals with filters within performance threshold', async () => {
      const stats = await measureAverageResponseTime(
        '/api/meals?limit=10&offset=0',
      );

      console.log(
        `Meals API (filtered) - Average: ${stats.average.toFixed(2)}ms`,
      );

      expect(stats.average).toBeLessThan(PERFORMANCE_THRESHOLD);
    });

    it('should fetch meal analytics within performance threshold', async () => {
      const stats = await measureAverageResponseTime(
        '/api/meals/analytics?days=30',
      );

      console.log(
        `Meals Analytics API - Average: ${stats.average.toFixed(2)}ms`,
      );

      expect(stats.average).toBeLessThan(PERFORMANCE_THRESHOLD);
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const startTime = performance.now();

      const promises = Array.from({ length: concurrentRequests }, () =>
        $fetch('/api/meals?limit=5'),
      );

      await Promise.all(promises);

      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / concurrentRequests;

      console.log(
        `Concurrent requests - Total: ${totalTime.toFixed(
          2,
        )}ms, Average: ${averageTime.toFixed(2)}ms`,
      );

      // Concurrent requests should not take significantly longer than sequential
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLD);
    });
  });

  describe('Cats API Performance', () => {
    it('should fetch cats list within performance threshold', async () => {
      const stats = await measureAverageResponseTime('/api/cats');

      console.log(`Cats API - Average: ${stats.average.toFixed(2)}ms`);

      expect(stats.average).toBeLessThan(PERFORMANCE_THRESHOLD);
    });

    it('should fetch cats with search within performance threshold', async () => {
      const stats = await measureAverageResponseTime('/api/cats?name=test');

      console.log(`Cats API (search) - Average: ${stats.average.toFixed(2)}ms`);

      expect(stats.average).toBeLessThan(PERFORMANCE_THRESHOLD);
    });
  });

  describe('Foods API Performance', () => {
    it('should fetch foods list within performance threshold', async () => {
      const stats = await measureAverageResponseTime('/api/foods');

      console.log(`Foods API - Average: ${stats.average.toFixed(2)}ms`);

      expect(stats.average).toBeLessThan(PERFORMANCE_THRESHOLD);
    });

    it('should fetch foods with filters within performance threshold', async () => {
      const stats = await measureAverageResponseTime('/api/foods?type=DRY');

      console.log(
        `Foods API (filtered) - Average: ${stats.average.toFixed(2)}ms`,
      );

      expect(stats.average).toBeLessThan(PERFORMANCE_THRESHOLD);
    });
  });

  describe('Database Query Performance', () => {
    it('should handle large dataset queries efficiently', async () => {
      // Test with larger limit to simulate heavy queries
      const stats = await measureAverageResponseTime('/api/meals?limit=100');

      console.log(
        `Large dataset query - Average: ${stats.average.toFixed(2)}ms`,
      );

      expect(stats.average).toBeLessThan(PERFORMANCE_THRESHOLD * 2); // Allow more time for large datasets
    });

    it('should handle complex filtering efficiently', async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const stats = await measureAverageResponseTime(
        `/api/meals?startDate=${thirtyDaysAgo.toISOString()}&endDate=${now.toISOString()}&foodType=DRY`,
      );

      console.log(`Complex filtering - Average: ${stats.average.toFixed(2)}ms`);

      expect(stats.average).toBeLessThan(PERFORMANCE_THRESHOLD);
    });
  });

  describe('Caching Performance', () => {
    it('should show improved performance on repeated requests', async () => {
      const url = '/api/meals?limit=20';

      // First request (cold)
      const firstRequestTime = await measureResponseTime(url);

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second request (should be cached)
      const secondRequestTime = await measureResponseTime(url);

      console.log(
        `Caching test - First: ${firstRequestTime.toFixed(
          2,
        )}ms, Second: ${secondRequestTime.toFixed(2)}ms`,
      );

      // Second request should be faster or at least not significantly slower
      expect(secondRequestTime).toBeLessThanOrEqual(firstRequestTime * 1.2);
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks during repeated requests', async () => {
      if (!('memory' in performance)) {
        console.log('Memory API not available, skipping memory test');
        return;
      }

      const initialMemory = (performance as any).memory.usedJSHeapSize;

      // Make many requests to test for memory leaks
      for (let i = 0; i < 50; i++) {
        await $fetch('/api/meals?limit=10');
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(
        `Memory usage - Initial: ${(initialMemory / 1024 / 1024).toFixed(
          2,
        )}MB, Final: ${(finalMemory / 1024 / 1024).toFixed(2)}MB, Increase: ${(
          memoryIncrease
          / 1024
          / 1024
        ).toFixed(2)}MB`,
      );

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle invalid requests quickly', async () => {
      const stats = await measureAverageResponseTime(
        '/api/meals?invalid=parameter',
        {
          ignoreResponseError: true,
        },
      );

      console.log(`Error handling - Average: ${stats.average.toFixed(2)}ms`);

      // Error responses should be fast
      expect(stats.average).toBeLessThan(PERFORMANCE_THRESHOLD / 2);
    });
  });
});

// Performance benchmark utility
export class PerformanceBenchmark {
  private results: Array<{
    name: string;
    duration: number;
    timestamp: number;
  }> = [];

  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();

    this.results.push({
      name,
      duration: endTime - startTime,
      timestamp: Date.now(),
    });

    return result;
  }

  getResults() {
    return this.results;
  }

  getAverageTime(name: string): number {
    const filtered = this.results.filter(r => r.name === name);
    if (filtered.length === 0) return 0;

    return filtered.reduce((sum, r) => sum + r.duration, 0) / filtered.length;
  }

  getSlowestOperations(limit: number = 5) {
    return [...this.results]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  clear() {
    this.results = [];
  }

  generateReport(): string {
    const report = ['Performance Benchmark Report', '='.repeat(30)];

    const operationNames = [...new Set(this.results.map(r => r.name))];

    for (const name of operationNames) {
      const operations = this.results.filter(r => r.name === name);
      const average = this.getAverageTime(name);
      const min = Math.min(...operations.map(r => r.duration));
      const max = Math.max(...operations.map(r => r.duration));

      report.push(`${name}:`);
      report.push(`  Count: ${operations.length}`);
      report.push(`  Average: ${average.toFixed(2)}ms`);
      report.push(`  Min: ${min.toFixed(2)}ms`);
      report.push(`  Max: ${max.toFixed(2)}ms`);
      report.push('');
    }

    const slowest = this.getSlowestOperations();
    if (slowest.length > 0) {
      report.push('Slowest Operations:');
      slowest.forEach((op, index) => {
        report.push(`  ${index + 1}. ${op.name}: ${op.duration.toFixed(2)}ms`);
      });
    }

    return report.join('\n');
  }
}
