import { test, expect } from '@playwright/test';
import { TestSetup } from './utils/test-setup';
import { testCats, testFoods, generateTestData } from './utils/test-data';

test.describe('Data Visualization', () => {
  let testSetup: TestSetup;

  test.beforeEach(async ({ page }) => {
    testSetup = new TestSetup(page);
    await testSetup.setupCleanDatabase();

    // Create test data for analytics
    await testSetup.createTestCats([testCats[0], testCats[1]]);
    await testSetup.createTestFoods([testFoods[0], testFoods[1]]); // DRY and WET

    // Create meal records for analytics
    const analyticsData = generateTestData.mealRecordsForAnalytics(
      testCats[0].name,
      testFoods[0].name,
      7, // 7 days of data
    );
    await testSetup.createTestMealRecords(analyticsData);
  });

  test.afterEach(async () => {
    await testSetup.setupCleanDatabase();
  });

  test.describe('Analytics Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/analytics');
      await testSetup.waitForPageLoad();
    });

    test('should display analytics page with charts', async ({ page }) => {
      // Check page title
      await expect(page.locator('h1')).toContainText('データ分析');

      // Check for chart container
      await expect(
        page.locator('.chart-container, canvas, [class*="chart"]'),
      ).toBeVisible();

      // Check for filter controls
      await expect(page.locator('select, .filter-button')).toBeVisible();
    });

    test('should display meal chart with data', async ({ page }) => {
      // Wait for chart to load
      await page.waitForSelector('canvas, .chart-container', {
        timeout: 10000,
      });

      // Check if chart canvas is present
      const chartCanvas = page.locator('canvas');
      if ((await chartCanvas.count()) > 0) {
        await expect(chartCanvas).toBeVisible();

        // Verify chart has rendered (canvas should have content)
        const canvasContent = await chartCanvas.evaluate(
          (canvas: HTMLCanvasElement) => {
            const ctx = canvas.getContext('2d');
            if (!ctx) return false;

            // Check if canvas has been drawn on
            const imageData = ctx.getImageData(
              0,
              0,
              canvas.width,
              canvas.height,
            );
            return imageData.data.some(pixel => pixel !== 0);
          },
        );

        expect(canvasContent).toBeTruthy();
      }
    });

    test('should filter data by cat selection', async ({ page }) => {
      // Wait for page to load completely
      await testSetup.waitForPageLoad();

      // Find cat filter dropdown
      const catFilter = page
        .locator('select')
        .filter({ hasText: testCats[0].name })
        .first();
      if ((await catFilter.count()) > 0) {
        // Select specific cat
        await catFilter.selectOption(testCats[0].name);

        // Wait for chart to update
        await page.waitForTimeout(1000);

        // Verify chart updated (implementation specific)
        await expect(page.locator('canvas, .chart-container')).toBeVisible();
      }
    });

    test('should filter data by date range', async ({ page }) => {
      // Look for date range inputs
      const startDateInput = page.locator('input[type="date"]').first();
      const endDateInput = page.locator('input[type="date"]').last();

      if (
        (await startDateInput.count()) > 0
        && (await endDateInput.count()) > 0
      ) {
        // Set date range to last 3 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 3);

        await startDateInput.fill(startDate.toISOString().split('T')[0]);
        await endDateInput.fill(endDate.toISOString().split('T')[0]);

        // Wait for chart to update
        await page.waitForTimeout(1000);

        // Verify chart is still visible
        await expect(page.locator('canvas, .chart-container')).toBeVisible();
      }
    });

    test('should toggle between chart types', async ({ page }) => {
      // Look for chart type toggle buttons
      const lineChartButton = page
        .locator('button')
        .filter({ hasText: 'ライン' });
      const barChartButton = page.locator('button').filter({ hasText: 'バー' });

      if (
        (await lineChartButton.count()) > 0
        && (await barChartButton.count()) > 0
      ) {
        // Switch to bar chart
        await barChartButton.click();
        await page.waitForTimeout(1000);
        await expect(page.locator('canvas')).toBeVisible();

        // Switch back to line chart
        await lineChartButton.click();
        await page.waitForTimeout(1000);
        await expect(page.locator('canvas')).toBeVisible();
      }
    });

    test('should display food type breakdown', async ({ page }) => {
      // Look for food type filter or breakdown
      const dryFoodFilter = page
        .locator('button, input')
        .filter({ hasText: 'ドライ' });
      const wetFoodFilter = page
        .locator('button, input')
        .filter({ hasText: 'ウェット' });

      if ((await dryFoodFilter.count()) > 0) {
        await dryFoodFilter.click();
        await page.waitForTimeout(1000);
        await expect(page.locator('canvas, .chart-container')).toBeVisible();
      }

      if ((await wetFoodFilter.count()) > 0) {
        await wetFoodFilter.click();
        await page.waitForTimeout(1000);
        await expect(page.locator('canvas, .chart-container')).toBeVisible();
      }
    });

    test('should display daily calorie totals', async ({ page }) => {
      // Look for calorie display elements
      const calorieElements = page.locator(
        '.calorie-total, .daily-calories, [class*="calorie"]',
      );

      if ((await calorieElements.count()) > 0) {
        await expect(calorieElements.first()).toBeVisible();

        // Check if numeric values are displayed
        const calorieText = await calorieElements.first().textContent();
        expect(calorieText).toMatch(/\d+/);
      }
    });

    test('should handle empty data state', async ({ page }) => {
      // Clear all meal records to test empty state
      await testSetup.clearAllMealRecords();
      await page.reload();
      await testSetup.waitForPageLoad();

      // Check for empty state message or placeholder
      const emptyStateElements = page.locator(
        '.empty-state, .no-data, [class*="empty"]',
      );
      if ((await emptyStateElements.count()) > 0) {
        await expect(emptyStateElements.first()).toBeVisible();
      }
      else {
        // If no specific empty state, chart should still be present but may show no data
        await expect(page.locator('canvas, .chart-container')).toBeVisible();
      }
    });
  });

  test.describe('Responsive Chart Behavior', () => {
    test('should display charts properly on desktop', async ({ page }) => {
      // Set desktop viewport
      await testSetup.setViewportSize(1200, 800);
      await page.goto('/analytics');
      await testSetup.waitForPageLoad();

      // Check chart is visible and properly sized
      const chartContainer = page.locator('.chart-container, canvas').first();
      await expect(chartContainer).toBeVisible();

      // Verify chart dimensions are appropriate for desktop
      const boundingBox = await chartContainer.boundingBox();
      expect(boundingBox?.width).toBeGreaterThan(400);
    });

    test('should display charts properly on tablet', async ({ page }) => {
      // Set tablet viewport
      await testSetup.setViewportSize(768, 1024);
      await page.goto('/analytics');
      await testSetup.waitForPageLoad();

      // Check chart is visible and responsive
      const chartContainer = page.locator('.chart-container, canvas').first();
      await expect(chartContainer).toBeVisible();

      // Verify chart adapts to tablet size
      const boundingBox = await chartContainer.boundingBox();
      expect(boundingBox?.width).toBeLessThan(800);
      expect(boundingBox?.width).toBeGreaterThan(300);
    });

    test('should display charts properly on mobile', async ({ page }) => {
      // Set mobile viewport
      await testSetup.setViewportSize(375, 667);
      await page.goto('/analytics');
      await testSetup.waitForPageLoad();

      // Check chart is visible and mobile-optimized
      const chartContainer = page.locator('.chart-container, canvas').first();
      await expect(chartContainer).toBeVisible();

      // Verify chart fits mobile screen
      const boundingBox = await chartContainer.boundingBox();
      expect(boundingBox?.width).toBeLessThan(400);
    });
  });

  test.describe('Chart Interactions', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/analytics');
      await testSetup.waitForPageLoad();
    });

    test('should handle chart hover interactions', async ({ page }) => {
      const chartCanvas = page.locator('canvas').first();

      if ((await chartCanvas.count()) > 0) {
        // Hover over chart
        await chartCanvas.hover();

        // Look for tooltip or hover effects
        const tooltip = page.locator('.tooltip, [class*="tooltip"]');
        if ((await tooltip.count()) > 0) {
          await expect(tooltip).toBeVisible();
        }
      }
    });

    test('should handle chart click interactions', async ({ page }) => {
      const chartCanvas = page.locator('canvas').first();

      if ((await chartCanvas.count()) > 0) {
        // Click on chart
        await chartCanvas.click();

        // Verify no errors occurred (chart should still be visible)
        await expect(chartCanvas).toBeVisible();
      }
    });

    test('should maintain chart state during window resize', async ({
      page,
    }) => {
      // Start with desktop size
      await testSetup.setViewportSize(1200, 800);

      const chartCanvas = page.locator('canvas').first();
      await expect(chartCanvas).toBeVisible();

      // Resize to mobile
      await testSetup.setViewportSize(375, 667);
      await page.waitForTimeout(1000);

      // Chart should still be visible and responsive
      await expect(chartCanvas).toBeVisible();

      // Resize back to desktop
      await testSetup.setViewportSize(1200, 800);
      await page.waitForTimeout(1000);

      await expect(chartCanvas).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load charts within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/analytics');
      await testSetup.waitForPageLoad();

      // Wait for chart to be visible
      await expect(page.locator('canvas, .chart-container')).toBeVisible();

      const loadTime = Date.now() - startTime;

      // Chart should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      // Create larger dataset
      const largeMealData = generateTestData.mealRecordsForAnalytics(
        testCats[0].name,
        testFoods[0].name,
        30, // 30 days of data
      );
      await testSetup.createTestMealRecords(largeMealData);

      const startTime = Date.now();

      await page.goto('/analytics');
      await testSetup.waitForPageLoad();

      // Wait for chart to render
      await expect(page.locator('canvas, .chart-container')).toBeVisible();

      const loadTime = Date.now() - startTime;

      // Should still load within reasonable time even with more data
      expect(loadTime).toBeLessThan(10000);
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/analytics');
      await testSetup.waitForPageLoad();
    });

    test('should have proper accessibility attributes', async ({ page }) => {
      await testSetup.checkAccessibility();

      // Check for chart accessibility
      const chartCanvas = page.locator('canvas').first();
      if ((await chartCanvas.count()) > 0) {
        const ariaLabel = await chartCanvas.getAttribute('aria-label');
        const role = await chartCanvas.getAttribute('role');

        // Chart should have accessibility attributes
        expect(ariaLabel || role).toBeTruthy();
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Test tab navigation through filter controls
      await page.keyboard.press('Tab');

      // Verify focus is visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // Continue tabbing through interactive elements
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
    });
  });
});
