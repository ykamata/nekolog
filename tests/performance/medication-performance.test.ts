import { test, expect } from '@playwright/test';

test.describe('Medication Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up performance monitoring
    await page.addInitScript(() => {
      window.performanceMetrics = {
        navigationStart: performance.now(),
        loadTimes: [],
        renderTimes: [],
        apiCallTimes: [],
      };
    });
  });

  test('should load medications page within performance budget', async ({ page }) => {
    const startTime = Date.now();

    // Navigate to medications page
    await page.goto('/medications');

    // Wait for page to be fully loaded
    await page.waitForSelector('.medications-container');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Performance budget: page should load within 2 seconds
    expect(loadTime).toBeLessThan(2000);

    // Check Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals = {};

          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
            if (entry.name === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
            }
          });

          resolve(vitals);
        }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

        // Fallback timeout
        setTimeout(() => resolve({}), 5000);
      });
    });

    // FCP should be under 1.8 seconds
    if (metrics.fcp) {
      expect(metrics.fcp).toBeLessThan(1800);
    }

    // LCP should be under 2.5 seconds
    if (metrics.lcp) {
      expect(metrics.lcp).toBeLessThan(2500);
    }
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    // Create a large number of medications for testing
    await page.goto('/medications');
    await page.waitForSelector('.medications-container');

    // Simulate creating 100 medications (in a real test, you'd seed the database)
    await page.evaluate(() => {
      // Mock the store to return a large dataset
      const mockMedications = Array.from({ length: 100 }, (_, i) => ({
        id: `med-${i}`,
        name: `テスト薬${i}`,
        type: i % 3 === 0 ? 'MEDICINE' : i % 3 === 1 ? 'SUPPLEMENT' : 'VITAMIN',
        description: `テスト用の薬${i}です`,
        dosage: '1日1回',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Override the medications store
      if (window.$nuxt && window.$nuxt.$pinia) {
        const medicationsStore = window.$nuxt.$pinia._s.get('medications');
        if (medicationsStore) {
          medicationsStore.medications = mockMedications;
        }
      }
    });

    // Trigger re-render
    await page.reload();
    await page.waitForSelector('.medications-container');

    const startTime = Date.now();

    // Test search performance with large dataset
    await page.locator('.search-input').fill('テスト薬5');
    await page.waitForTimeout(100); // Debounce time

    const searchTime = Date.now() - startTime;

    // Search should complete within 500ms even with large dataset
    expect(searchTime).toBeLessThan(500);

    // Check that results are filtered correctly
    const visibleItems = await page.locator('.medication-item:visible').count();
    expect(visibleItems).toBeGreaterThan(0);
    expect(visibleItems).toBeLessThan(20); // Should be filtered

    // Test scrolling performance
    const scrollStartTime = Date.now();

    await page.evaluate(() => {
      const container = document.querySelector('.medications-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });

    await page.waitForTimeout(100);
    const scrollTime = Date.now() - scrollStartTime;

    // Scrolling should be smooth (under 100ms)
    expect(scrollTime).toBeLessThan(100);
  });

  test('should load medication records efficiently', async ({ page }) => {
    await page.goto('/medication-records');
    await page.waitForSelector('.records-container');

    // Measure initial load time
    const loadStartTime = Date.now();
    await page.waitForLoadState('networkidle');
    const initialLoadTime = Date.now() - loadStartTime;

    expect(initialLoadTime).toBeLessThan(1500);

    // Test pagination performance
    const paginationStartTime = Date.now();

    if (await page.locator('.pagination-next').isVisible()) {
      await page.locator('.pagination-next').click();
      await page.waitForSelector('.record-item');
    }

    const paginationTime = Date.now() - paginationStartTime;
    expect(paginationTime).toBeLessThan(800);

    // Test filtering performance
    const filterStartTime = Date.now();

    await page.locator('.status-filter').selectOption('ADMINISTERED');
    await page.waitForTimeout(200); // Wait for filter to apply

    const filterTime = Date.now() - filterStartTime;
    expect(filterTime).toBeLessThan(300);
  });

  test('should render medication calendar efficiently', async ({ page }) => {
    await page.goto('/medication-calendar');

    const calendarLoadStart = Date.now();
    await page.waitForSelector('.calendar-container');
    await page.waitForSelector('.calendar-day');
    const calendarLoadTime = Date.now() - calendarLoadStart;

    // Calendar should load within 1 second
    expect(calendarLoadTime).toBeLessThan(1000);

    // Test month navigation performance
    const navStartTime = Date.now();

    await page.locator('.calendar-nav-button').first().click();
    await page.waitForSelector('.calendar-day');

    const navTime = Date.now() - navStartTime;
    expect(navTime).toBeLessThan(400);

    // Test day selection performance
    const daySelectStart = Date.now();

    await page.locator('.calendar-day.current-month').first().click();
    await page.waitForSelector('.day-details');

    const daySelectTime = Date.now() - daySelectStart;
    expect(daySelectTime).toBeLessThan(200);
  });

  test('should handle API calls efficiently', async ({ page }) => {
    // Monitor network requests
    const apiCalls = [];

    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          startTime: Date.now(),
        });
      }
    });

    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        const call = apiCalls.find(c => c.url === response.url());
        if (call) {
          call.endTime = Date.now();
          call.duration = call.endTime - call.startTime;
          call.status = response.status();
        }
      }
    });

    await page.goto('/medications');
    await page.waitForLoadState('networkidle');

    // Check API call performance
    const medicationApiCalls = apiCalls.filter(call =>
      call.url.includes('/api/medications') && call.method === 'GET',
    );

    expect(medicationApiCalls.length).toBeGreaterThan(0);

    medicationApiCalls.forEach((call) => {
      expect(call.duration).toBeLessThan(1000); // API calls should complete within 1 second
      expect(call.status).toBe(200);
    });

    // Test create medication API performance
    await page.locator('.add-button').click();
    await page.locator('input[name="name"]').fill('パフォーマンステスト薬');
    await page.locator('select[name="type"]').selectOption('MEDICINE');

    const createStartTime = Date.now();
    await page.locator('.submit-button').click();
    await page.waitForSelector('.modal-overlay', { state: 'hidden' });
    const createTime = Date.now() - createStartTime;

    expect(createTime).toBeLessThan(2000);

    // Check that create API call was efficient
    const createApiCalls = apiCalls.filter(call =>
      call.url.includes('/api/medications') && call.method === 'POST',
    );

    expect(createApiCalls.length).toBeGreaterThan(0);
    createApiCalls.forEach((call) => {
      expect(call.duration).toBeLessThan(1500);
      expect(call.status).toBe(201);
    });
  });

  test('should optimize memory usage', async ({ page }) => {
    await page.goto('/medications');
    await page.waitForSelector('.medications-container');

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit,
        };
      }
      return null;
    });

    if (initialMemory) {
      // Perform memory-intensive operations
      for (let i = 0; i < 10; i++) {
        await page.locator('.add-button').click();
        await page.locator('input[name="name"]').fill(`メモリテスト薬${i}`);
        await page.locator('select[name="type"]').selectOption('MEDICINE');
        await page.locator('.submit-button').click();
        await page.waitForSelector('.modal-overlay', { state: 'hidden' });
      }

      // Get memory usage after operations
      const finalMemory = await page.evaluate(() => {
        if (performance.memory) {
          return {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit,
          };
        }
        return null;
      });

      if (finalMemory) {
        const memoryIncrease = finalMemory.used - initialMemory.used;
        const memoryIncreasePercent = (memoryIncrease / initialMemory.used) * 100;

        // Memory increase should be reasonable (less than 50% increase)
        expect(memoryIncreasePercent).toBeLessThan(50);

        // Should not exceed 80% of available memory
        const memoryUsagePercent = (finalMemory.used / finalMemory.limit) * 100;
        expect(memoryUsagePercent).toBeLessThan(80);
      }
    }
  });

  test('should handle concurrent operations efficiently', async ({ page }) => {
    await page.goto('/medication-records');
    await page.waitForSelector('.records-container');

    // Simulate concurrent record creation
    const concurrentOperations = [];
    const startTime = Date.now();

    for (let i = 0; i < 5; i++) {
      concurrentOperations.push(
        (async () => {
          await page.locator('.add-record-button').click();
          await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
          await page.locator('select[name="catId"]').selectOption({ index: 1 });
          await page.locator('input[name="quantity"]').fill('1');
          await page.locator('input[name="administeredAt"]').fill(`2024-01-${20 + i}T08:00`);
          await page.locator('select[name="status"]').selectOption('ADMINISTERED');
          await page.locator('.submit-button').click();
          await page.waitForSelector('.modal-overlay', { state: 'hidden' });
        })(),
      );
    }

    await Promise.all(concurrentOperations);
    const totalTime = Date.now() - startTime;

    // Concurrent operations should complete within reasonable time
    expect(totalTime).toBeLessThan(10000); // 10 seconds for 5 operations

    // Verify all records were created
    const recordCount = await page.locator('.record-item').count();
    expect(recordCount).toBeGreaterThanOrEqual(5);
  });

  test('should optimize bundle size and loading', async ({ page }) => {
    // Monitor resource loading
    const resources = [];

    page.on('response', (response) => {
      if (response.url().includes('.js') || response.url().includes('.css')) {
        resources.push({
          url: response.url(),
          size: response.headers()['content-length'],
          type: response.url().includes('.js') ? 'javascript' : 'css',
          status: response.status(),
        });
      }
    });

    await page.goto('/medications');
    await page.waitForLoadState('networkidle');

    // Check JavaScript bundle sizes
    const jsResources = resources.filter(r => r.type === 'javascript');
    const totalJsSize = jsResources.reduce((total, resource) => {
      return total + (parseInt(resource.size) || 0);
    }, 0);

    // Total JS should be under 1MB (1,048,576 bytes)
    expect(totalJsSize).toBeLessThan(1048576);

    // Check CSS bundle sizes
    const cssResources = resources.filter(r => r.type === 'css');
    const totalCssSize = cssResources.reduce((total, resource) => {
      return total + (parseInt(resource.size) || 0);
    }, 0);

    // Total CSS should be under 200KB (204,800 bytes)
    expect(totalCssSize).toBeLessThan(204800);

    // All resources should load successfully
    resources.forEach((resource) => {
      expect(resource.status).toBe(200);
    });
  });

  test('should maintain performance during data updates', async ({ page }) => {
    await page.goto('/medication-calendar');
    await page.waitForSelector('.calendar-container');

    // Create baseline measurement
    const baselineStart = Date.now();
    await page.locator('.calendar-day.current-month').first().click();
    await page.waitForSelector('.day-details');
    const baselineTime = Date.now() - baselineStart;

    // Add multiple records to increase data load
    for (let i = 0; i < 10; i++) {
      await page.locator('.add-record-button').click();
      await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
      await page.locator('select[name="catId"]').selectOption({ index: 1 });
      await page.locator('input[name="quantity"]').fill('1');
      await page.locator('input[name="administeredAt"]').fill(`2024-01-15T${8 + i}:00`);
      await page.locator('select[name="status"]').selectOption('ADMINISTERED');
      await page.locator('.submit-button').click();
      await page.waitForSelector('.modal-overlay', { state: 'hidden' });
    }

    // Measure performance with increased data
    const loadedStart = Date.now();
    await page.locator('.calendar-day.current-month').first().click();
    await page.waitForSelector('.day-details');
    const loadedTime = Date.now() - loadedStart;

    // Performance should not degrade significantly (less than 3x slower)
    expect(loadedTime).toBeLessThan(baselineTime * 3);

    // Should still be under absolute threshold
    expect(loadedTime).toBeLessThan(1000);
  });
});
