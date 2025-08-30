import { test, expect } from '@playwright/test';

test.describe('Chart Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Mock analytics data
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
              { date: '2024-01-03', calories: 265.5, type: 'DRY' },
              { date: '2024-01-04', calories: 290.0, type: 'WET' },
              { date: '2024-01-05', calories: 275.5, type: 'DRY' },
            ],
            summary: {
              totalMeals: 15,
              totalCalories: 1361.5,
              averageCaloriesPerMeal: 90.8,
            },
          },
        }),
      });
    });

    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('chart type switching interactions', async ({ page }) => {
    // Verify initial line chart state
    const lineButton = page.locator('[data-testid="chart-type-toggle"] button[data-chart-type="line"]');
    const barButton = page.locator('[data-testid="chart-type-toggle"] button[data-chart-type="bar"]');

    await expect(lineButton).toHaveClass(/bg-blue-600/);
    await expect(barButton).toHaveClass(/bg-white/);

    // Switch to bar chart
    await barButton.click();
    await page.waitForTimeout(500); // Wait for chart animation

    // Verify bar chart state
    await expect(barButton).toHaveClass(/bg-blue-600/);
    await expect(lineButton).toHaveClass(/bg-white/);

    // Verify chart canvas is still visible
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Switch back to line chart
    await lineButton.click();
    await page.waitForTimeout(500);

    // Verify line chart state restored
    await expect(lineButton).toHaveClass(/bg-blue-600/);
    await expect(barButton).toHaveClass(/bg-white/);
  });

  test('food type filtering interactions', async ({ page }) => {
    // Test "すべて" (All) filter
    const allFoodButton = page.locator('[data-testid="food-type-filter"] button[data-food-type="ALL"]');
    if (await allFoodButton.isVisible()) {
      await expect(allFoodButton).toHaveClass(/bg-blue-600/);
    }

    // Test dry food filter
    const dryFoodButton = page.locator('[data-testid="food-type-filter"] button[data-food-type="DRY"]');
    if (await dryFoodButton.isVisible()) {
      await dryFoodButton.click();
      await page.waitForTimeout(500);

      // Should update chart and summary
      await expect(dryFoodButton).toHaveClass(/bg-blue-600/);

      // Summary should show filtered data
      const summaryCards = page.locator('.summary-card');
      const totalCaloriesCard = summaryCards.first();

      // Should show only DRY food calories (250.5 + 265.5 + 275.5 = 791.5)
      await expect(totalCaloriesCard).toContainText('791.5');
    }

    // Test wet food filter
    const wetFoodButton = page.locator('[data-testid="food-type-filter"] button[data-food-type="WET"]');
    if (await wetFoodButton.isVisible()) {
      await wetFoodButton.click();
      await page.waitForTimeout(500);

      await expect(wetFoodButton).toHaveClass(/bg-blue-600/);

      // Should show only WET food calories (280.0 + 290.0 = 570.0)
      const totalCaloriesCard = page.locator('.summary-card').first();
      await expect(totalCaloriesCard).toContainText('570.0');
    }

    // Reset to all foods
    if (await allFoodButton.isVisible()) {
      await allFoodButton.click();
      await page.waitForTimeout(500);

      // Should show total calories again
      const totalCaloriesCard = page.locator('.summary-card').first();
      await expect(totalCaloriesCard).toContainText('1361.5');
    }
  });

  test('date range picker interactions', async ({ page }) => {
    const startDateInput = page.locator('[data-testid="date-range-picker"] input[type="date"]').first();
    const endDateInput = page.locator('[data-testid="date-range-picker"] input[type="date"]').last();

    // Set custom date range
    await startDateInput.fill('2024-01-01');
    await endDateInput.fill('2024-01-03');

    // Wait for API call with new date range
    await page.waitForResponse(response =>
      response.url().includes('/api/analytics/meals')
      && response.url().includes('startDate=2024-01-01')
      && response.url().includes('endDate=2024-01-03'),
    );

    // Chart should update with filtered data
    await page.waitForTimeout(500);
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Test date range validation
    await startDateInput.fill('2024-01-05');
    await endDateInput.fill('2024-01-01'); // End before start

    // Should show validation error
    const errorMessage = page.locator('.error-message');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toContainText('開始日は終了日より前である必要があります');
    }
  });

  test('date range preset interactions', async ({ page }) => {
    // Test "今週" (This Week) preset
    const thisWeekButton = page.locator('[data-testid="preset-this-week"]');
    if (await thisWeekButton.isVisible()) {
      await thisWeekButton.click();

      // Should update date inputs
      await page.waitForTimeout(500);

      const startDateInput = page.locator('[data-testid="date-range-picker"] input[type="date"]').first();
      const endDateInput = page.locator('[data-testid="date-range-picker"] input[type="date"]').last();

      const startValue = await startDateInput.inputValue();
      const endValue = await endDateInput.inputValue();

      expect(startValue).not.toBe('');
      expect(endValue).not.toBe('');
      expect(new Date(startValue).getTime()).toBeLessThanOrEqual(new Date(endValue).getTime());
    }

    // Test "今月" (This Month) preset
    const thisMonthButton = page.locator('[data-testid="preset-this-month"]');
    if (await thisMonthButton.isVisible()) {
      await thisMonthButton.click();
      await page.waitForTimeout(500);

      // Should trigger API call
      await page.waitForResponse(response =>
        response.url().includes('/api/analytics/meals'),
      );
    }

    // Test "過去30日" (Last 30 Days) preset
    const last30DaysButton = page.locator('[data-testid="preset-last-30-days"]');
    if (await last30DaysButton.isVisible()) {
      await last30DaysButton.click();
      await page.waitForTimeout(500);

      const startDateInput = page.locator('[data-testid="date-range-picker"] input[type="date"]').first();
      const startValue = await startDateInput.inputValue();

      // Should be approximately 30 days ago
      const startDate = new Date(startValue);
      const today = new Date();
      const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeGreaterThanOrEqual(29);
      expect(daysDiff).toBeLessThanOrEqual(31);
    }
  });

  test('cat selection interactions', async ({ page }) => {
    // Mock cats data
    await page.route('/api/cats*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'cat1', name: 'ミケ' },
          { id: 'cat2', name: 'タマ' },
        ]),
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const catSelect = page.locator('[data-testid="cat-selection-filter"] select');

    // Verify default "すべての猫" option
    await expect(catSelect).toHaveValue('');

    // Select first cat
    await catSelect.selectOption({ index: 1 });

    // Should trigger API call with catId parameter
    await page.waitForResponse(response =>
      response.url().includes('/api/analytics/meals')
      && response.url().includes('catId=cat1'),
    );

    // Chart should update
    await page.waitForTimeout(500);
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Select second cat
    await catSelect.selectOption({ index: 2 });

    await page.waitForResponse(response =>
      response.url().includes('catId=cat2'),
    );

    // Reset to all cats
    await catSelect.selectOption({ index: 0 });

    await page.waitForResponse(response =>
      response.url().includes('/api/analytics/meals')
      && !response.url().includes('catId='),
    );
  });

  test('chart hover and tooltip interactions', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Get canvas bounding box for hover calculations
    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
      // Hover over chart area (approximate center)
      const centerX = canvasBox.x + canvasBox.width / 2;
      const centerY = canvasBox.y + canvasBox.height / 2;

      await page.mouse.move(centerX, centerY);
      await page.waitForTimeout(500);

      // Chart.js tooltip should appear (if implemented)
      // Note: This is hard to test directly as Chart.js tooltips are canvas-based
      // We can verify the canvas receives mouse events

      // Move mouse to different position
      await page.mouse.move(centerX + 50, centerY);
      await page.waitForTimeout(200);

      // Move mouse away from chart
      await page.mouse.move(0, 0);
      await page.waitForTimeout(200);
    }
  });

  test('chart responsiveness on different screen sizes', async ({ page }) => {
    const canvas = page.locator('canvas');

    // Desktop view (1920x1080)
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    let canvasBox = await canvas.boundingBox();
    const desktopWidth = canvasBox?.width || 0;
    expect(desktopWidth).toBeGreaterThan(800);

    // Tablet view (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    canvasBox = await canvas.boundingBox();
    const tabletWidth = canvasBox?.width || 0;
    expect(tabletWidth).toBeLessThan(desktopWidth);
    expect(tabletWidth).toBeGreaterThan(400);

    // Mobile view (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    canvasBox = await canvas.boundingBox();
    const mobileWidth = canvasBox?.width || 0;
    expect(mobileWidth).toBeLessThan(tabletWidth);
    expect(mobileWidth).toBeGreaterThan(200);

    // Verify chart is still interactive on mobile
    const barButton = page.locator('[data-testid="chart-type-toggle"] button[data-chart-type="bar"]');
    await barButton.click();
    await page.waitForTimeout(500);

    await expect(barButton).toHaveClass(/bg-blue-600/);
  });

  test('multiple filter combinations', async ({ page }) => {
    // Apply multiple filters simultaneously

    // 1. Select cat
    const catSelect = page.locator('[data-testid="cat-selection-filter"] select');
    if (await catSelect.isVisible()) {
      await catSelect.selectOption({ index: 1 });
      await page.waitForTimeout(300);
    }

    // 2. Change chart type
    const barButton = page.locator('[data-testid="chart-type-toggle"] button[data-chart-type="bar"]');
    await barButton.click();
    await page.waitForTimeout(300);

    // 3. Apply food type filter
    const dryFoodButton = page.locator('[data-testid="food-type-filter"] button[data-food-type="DRY"]');
    if (await dryFoodButton.isVisible()) {
      await dryFoodButton.click();
      await page.waitForTimeout(300);
    }

    // 4. Set date range
    const startDateInput = page.locator('[data-testid="date-range-picker"] input[type="date"]').first();
    const endDateInput = page.locator('[data-testid="date-range-picker"] input[type="date"]').last();

    await startDateInput.fill('2024-01-01');
    await endDateInput.fill('2024-01-05');

    // Wait for final API call with all filters
    await page.waitForResponse((response) => {
      const url = response.url();
      return url.includes('/api/analytics/meals')
        && url.includes('startDate=2024-01-01')
        && url.includes('endDate=2024-01-05');
    });

    // Verify all filters are applied
    await expect(barButton).toHaveClass(/bg-blue-600/);
    if (await dryFoodButton.isVisible()) {
      await expect(dryFoodButton).toHaveClass(/bg-blue-600/);
    }

    // Chart should still be visible and functional
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('filter reset functionality', async ({ page }) => {
    // Apply various filters first
    const barButton = page.locator('[data-testid="chart-type-toggle"] button[data-chart-type="bar"]');
    await barButton.click();

    const catSelect = page.locator('[data-testid="cat-selection-filter"] select');
    if (await catSelect.isVisible()) {
      await catSelect.selectOption({ index: 1 });
    }

    const dryFoodButton = page.locator('[data-testid="food-type-filter"] button[data-food-type="DRY"]');
    if (await dryFoodButton.isVisible()) {
      await dryFoodButton.click();
    }

    await page.waitForTimeout(500);

    // Click reset button
    const resetButton = page.locator('[data-testid="reset-filters"]');
    if (await resetButton.isVisible()) {
      await resetButton.click();
      await page.waitForTimeout(500);

      // Verify filters are reset
      const lineButton = page.locator('[data-testid="chart-type-toggle"] button[data-chart-type="line"]');
      await expect(lineButton).toHaveClass(/bg-blue-600/);

      if (await catSelect.isVisible()) {
        await expect(catSelect).toHaveValue('');
      }

      const allFoodButton = page.locator('[data-testid="food-type-filter"] button[data-food-type="ALL"]');
      if (await allFoodButton.isVisible()) {
        await expect(allFoodButton).toHaveClass(/bg-blue-600/);
      }
    }
  });

  test('chart animation and transitions', async ({ page }) => {
    const canvas = page.locator('canvas');

    // Switch chart types and verify smooth transitions
    const lineButton = page.locator('[data-testid="chart-type-toggle"] button[data-chart-type="line"]');
    const barButton = page.locator('[data-testid="chart-type-toggle"] button[data-chart-type="bar"]');

    // Initial state - line chart
    await expect(lineButton).toHaveClass(/bg-blue-600/);

    // Switch to bar chart
    await barButton.click();

    // Canvas should remain visible during transition
    await expect(canvas).toBeVisible();

    // Wait for animation to complete
    await page.waitForTimeout(1000);

    // Switch back to line chart
    await lineButton.click();
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(1000);

    // Rapid switching should not break the chart
    for (let i = 0; i < 3; i++) {
      await barButton.click();
      await page.waitForTimeout(100);
      await lineButton.click();
      await page.waitForTimeout(100);
    }

    // Chart should still be functional
    await expect(canvas).toBeVisible();
    await expect(lineButton).toHaveClass(/bg-blue-600/);
  });

  test('keyboard accessibility for chart controls', async ({ page }) => {
    // Test keyboard navigation through chart type buttons
    const lineButton = page.locator('[data-testid="chart-type-toggle"] button[data-chart-type="line"]');
    const barButton = page.locator('[data-testid="chart-type-toggle"] button[data-chart-type="bar"]');

    // Focus on line button
    await lineButton.focus();
    await expect(lineButton).toBeFocused();

    // Navigate to bar button with Tab
    await page.keyboard.press('Tab');
    await expect(barButton).toBeFocused();

    // Activate with Enter
    await page.keyboard.press('Enter');
    await expect(barButton).toHaveClass(/bg-blue-600/);

    // Navigate to bar button with Shift+Tab
    await page.keyboard.press('Shift+Tab');
    await expect(lineButton).toBeFocused();

    // Activate with Space
    await page.keyboard.press('Space');
    await expect(lineButton).toHaveClass(/bg-blue-600/);

    // Test keyboard navigation in date inputs
    const startDateInput = page.locator('[data-testid="date-range-picker"] input[type="date"]').first();
    await startDateInput.focus();
    await expect(startDateInput).toBeFocused();

    // Use keyboard to change date
    await page.keyboard.press('Tab');
    const endDateInput = page.locator('[data-testid="date-range-picker"] input[type="date"]').last();
    await expect(endDateInput).toBeFocused();
  });

  test('chart data update animations', async ({ page }) => {
    const canvas = page.locator('canvas');

    // Initial chart load
    await expect(canvas).toBeVisible();

    // Change filters to trigger data update
    const dryFoodButton = page.locator('[data-testid="food-type-filter"] button[data-food-type="DRY"]');
    if (await dryFoodButton.isVisible()) {
      await dryFoodButton.click();

      // Chart should remain visible during data update
      await expect(canvas).toBeVisible();

      // Wait for update animation
      await page.waitForTimeout(500);

      // Summary should update
      const summaryCards = page.locator('.summary-card');
      await expect(summaryCards.first()).toBeVisible();
    }

    // Change date range
    const startDateInput = page.locator('[data-testid="date-range-picker"] input[type="date"]').first();
    await startDateInput.fill('2024-01-02');

    // Wait for API response and chart update
    await page.waitForResponse(response =>
      response.url().includes('/api/analytics/meals'),
    );

    await page.waitForTimeout(500);
    await expect(canvas).toBeVisible();
  });
});
