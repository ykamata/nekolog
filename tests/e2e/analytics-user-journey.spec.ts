import { test, expect } from '@playwright/test';

test.describe('Analytics Page User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to analytics page
    await page.goto('/analytics');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('complete analytics page workflow', async ({ page }) => {
    // Test 1: Page loads with default chart
    await expect(page.locator('.meal-chart-container')).toBeVisible();
    await expect(page.locator('.chart-controls')).toBeVisible();

    // Test 2: Chart filters are present
    await expect(page.locator('[data-testid="cat-selection-filter"]')).toBeVisible();
    await expect(page.locator('[data-testid="date-range-picker"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-type-toggle"]')).toBeVisible();

    // Test 3: Default chart type is line chart
    const lineButton = page.locator('[data-testid="chart-type-toggle"] button[data-chart-type="line"]');
    await expect(lineButton).toHaveClass(/bg-blue-600/);

    // Test 4: Switch to bar chart
    const barButton = page.locator('[data-testid="chart-type-toggle"] button[data-chart-type="bar"]');
    await barButton.click();
    await expect(barButton).toHaveClass(/bg-blue-600/);
    await expect(lineButton).toHaveClass(/bg-white/);

    // Test 5: Chart updates when switching types
    await page.waitForTimeout(500); // Wait for chart animation
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Test 6: Filter by cat
    const catSelect = page.locator('[data-testid="cat-selection-filter"] select');
    await catSelect.selectOption({ index: 1 }); // Select first cat

    // Wait for data to update
    await page.waitForResponse(response =>
      response.url().includes('/api/analytics/meals') && response.status() === 200,
    );

    // Test 7: Change date range
    const startDateInput = page.locator('[data-testid="date-range-picker"] input[type="date"]').first();
    const endDateInput = page.locator('[data-testid="date-range-picker"] input[type="date"]').last();

    await startDateInput.fill('2024-01-01');
    await endDateInput.fill('2024-01-31');

    // Wait for data to update
    await page.waitForResponse(response =>
      response.url().includes('/api/analytics/meals') && response.status() === 200,
    );

    // Test 8: Use date range preset
    const thisWeekButton = page.locator('[data-testid="preset-this-week"]');
    if (await thisWeekButton.isVisible()) {
      await thisWeekButton.click();
      await page.waitForTimeout(500);
    }

    // Test 9: Apply food type filter
    const dryFoodButton = page.locator('[data-testid="food-type-filter"] button[data-food-type="DRY"]');
    if (await dryFoodButton.isVisible()) {
      await dryFoodButton.click();
      await page.waitForTimeout(500);
    }

    // Test 10: Check chart summary updates
    const summaryCards = page.locator('.summary-card');
    await expect(summaryCards.first()).toBeVisible();
    await expect(summaryCards.first()).toContainText('総カロリー');

    // Test 11: Reset filters
    const resetButton = page.locator('[data-testid="reset-filters"]');
    if (await resetButton.isVisible()) {
      await resetButton.click();

      // Verify filters are reset
      await expect(catSelect).toHaveValue('');
      await expect(lineButton).toHaveClass(/bg-blue-600/);
    }
  });

  test('handles loading states correctly', async ({ page }) => {
    // Intercept API calls to simulate slow response
    await page.route('/api/analytics/meals*', async (route) => {
      await page.waitForTimeout(2000); // Simulate slow API
      await route.continue();
    });

    // Navigate to page
    await page.goto('/analytics');

    // Should show loading state
    const loadingSpinner = page.locator('.animate-spin');
    await expect(loadingSpinner).toBeVisible();

    // Wait for loading to complete
    await page.waitForLoadState('networkidle');
    await expect(loadingSpinner).not.toBeVisible();
  });

  test('displays error states and recovery', async ({ page }) => {
    // Intercept API calls to simulate error
    await page.route('/api/analytics/meals*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/analytics');

    // Should show error state
    const errorContainer = page.locator('.error-container');
    await expect(errorContainer).toBeVisible();
    await expect(errorContainer).toContainText('データの読み込みに失敗しました');

    // Should have retry button
    const retryButton = page.locator('.retry-button');
    await expect(retryButton).toBeVisible();

    // Mock successful retry
    await page.unroute('/api/analytics/meals*');
    await page.route('/api/analytics/meals*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            dailyCalories: [
              { date: '2024-01-01', calories: 250.5, type: 'DRY' },
              { date: '2024-01-02', calories: 280.0, type: 'WET' },
            ],
            summary: {
              totalMeals: 5,
              totalCalories: 530.5,
              averageCaloriesPerMeal: 106.1,
            },
          },
        }),
      });
    });

    // Click retry button
    await retryButton.click();

    // Should show chart after successful retry
    await expect(errorContainer).not.toBeVisible();
    await expect(page.locator('.chart-wrapper')).toBeVisible();
  });

  test('handles empty data gracefully', async ({ page }) => {
    // Mock empty data response
    await page.route('/api/analytics/meals*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            dailyCalories: [],
            summary: {
              totalMeals: 0,
              totalCalories: 0,
              averageCaloriesPerMeal: 0,
            },
          },
        }),
      });
    });

    await page.goto('/analytics');

    // Should show no data message
    const noDataMessage = page.locator('.no-data-message');
    await expect(noDataMessage).toBeVisible();
    await expect(noDataMessage).toContainText('データがありません');

    // Summary should show zeros
    const summaryCards = page.locator('.summary-card');
    await expect(summaryCards.first()).toContainText('0.0 kcal');
  });

  test('persists filter state in URL', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Change filters
    const catSelect = page.locator('[data-testid="cat-selection-filter"] select');
    await catSelect.selectOption({ index: 1 });

    const barButton = page.locator('[data-testid="chart-type-toggle"] button[data-chart-type="bar"]');
    await barButton.click();

    // Check URL parameters
    await expect(page).toHaveURL(/catId=/);
    await expect(page).toHaveURL(/chartType=bar/);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Filters should be restored
    await expect(barButton).toHaveClass(/bg-blue-600/);
    // Cat selection should be restored (check by value)
    const selectedOption = await catSelect.inputValue();
    expect(selectedOption).not.toBe('');
  });

  test('keyboard navigation works correctly', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Test tab navigation through chart type buttons
    const lineButton = page.locator('[data-testid="chart-type-toggle"] button[data-chart-type="line"]');
    const barButton = page.locator('[data-testid="chart-type-toggle"] button[data-chart-type="bar"]');

    await lineButton.focus();
    await expect(lineButton).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(barButton).toBeFocused();

    // Test Enter key activation
    await page.keyboard.press('Enter');
    await expect(barButton).toHaveClass(/bg-blue-600/);

    // Test arrow key navigation in date inputs
    const startDateInput = page.locator('[data-testid="date-range-picker"] input[type="date"]').first();
    await startDateInput.focus();
    await expect(startDateInput).toBeFocused();

    await page.keyboard.press('Tab');
    const endDateInput = page.locator('[data-testid="date-range-picker"] input[type="date"]').last();
    await expect(endDateInput).toBeFocused();
  });

  test('chart interactions work on different screen sizes', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Chart should be visible and properly sized
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    const canvasBox = await canvas.boundingBox();
    expect(canvasBox?.width).toBeGreaterThan(800);

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500); // Wait for responsive adjustments

    const tabletCanvasBox = await canvas.boundingBox();
    expect(tabletCanvasBox?.width).toBeLessThan(canvasBox?.width || 0);

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Filters should be stacked vertically on mobile
    const filtersContainer = page.locator('.filters-container');
    await expect(filtersContainer).toHaveClass(/flex-col/);

    // Chart should still be visible
    await expect(canvas).toBeVisible();

    const mobileCanvasBox = await canvas.boundingBox();
    expect(mobileCanvasBox?.width).toBeLessThan(400);
  });

  test('debug panel functionality', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Enable debug mode (if debug toggle exists)
    const debugToggle = page.locator('[data-testid="debug-toggle"]');
    if (await debugToggle.isVisible()) {
      await debugToggle.click();

      // Debug panel should appear
      const debugPanel = page.locator('.debug-panel');
      await expect(debugPanel).toBeVisible();

      // Should show performance metrics
      await expect(debugPanel).toContainText('パフォーマンス');
      await expect(debugPanel).toContainText('データ取得時間');
      await expect(debugPanel).toContainText('レンダリング時間');

      // Should show API call history
      await expect(debugPanel).toContainText('API呼び出し履歴');

      // Toggle debug mode off
      await debugToggle.click();
      await expect(debugPanel).not.toBeVisible();
    }
  });

  test('accessibility compliance', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Check for proper ARIA labels
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('role', 'img');
    await expect(canvas).toHaveAttribute('aria-label');

    // Check for proper heading structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);

    // Check for proper form labels
    const selects = page.locator('select');
    for (let i = 0; i < await selects.count(); i++) {
      const select = selects.nth(i);
      const id = await select.getAttribute('id');
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toBeVisible();
      }
    }

    // Check color contrast (basic check)
    const buttons = page.locator('button');
    for (let i = 0; i < Math.min(await buttons.count(), 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const styles = await button.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            backgroundColor: computed.backgroundColor,
            color: computed.color,
          };
        });

        // Basic check that colors are defined
        expect(styles.backgroundColor).not.toBe('');
        expect(styles.color).not.toBe('');
      }
    }
  });

  test('performance under load', async ({ page }) => {
    // Mock large dataset
    const largeDataset = {
      success: true,
      data: {
        dailyCalories: Array.from({ length: 365 }, (_, i) => ({
          date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
          calories: 250 + Math.random() * 100,
          type: i % 2 === 0 ? 'DRY' : 'WET',
        })),
        summary: {
          totalMeals: 1095,
          totalCalories: 109500,
          averageCaloriesPerMeal: 100,
        },
      },
    };

    await page.route('/api/analytics/meals*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeDataset),
      });
    });

    // Measure page load time
    const startTime = Date.now();
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Should load within reasonable time (5 seconds)
    expect(loadTime).toBeLessThan(5000);

    // Chart should still be responsive
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Test filter interactions with large dataset
    const barButton = page.locator('[data-testid="chart-type-toggle"] button[data-chart-type="bar"]');
    const filterStartTime = Date.now();
    await barButton.click();
    await page.waitForTimeout(100); // Wait for chart update
    const filterTime = Date.now() - filterStartTime;

    // Filter changes should be responsive (under 2 seconds)
    expect(filterTime).toBeLessThan(2000);
  });
});
