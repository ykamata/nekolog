import { test, expect } from '@playwright/test';

test.describe('Error Scenarios and Recovery', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console error tracking
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Store console errors for later verification
    (page as any).consoleErrors = consoleErrors;
  });

  test('handles API network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('/api/analytics/meals*', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/analytics');

    // Should show error state
    const errorContainer = page.locator('.error-container');
    await expect(errorContainer).toBeVisible({ timeout: 10000 });

    // Should show Japanese error message
    await expect(errorContainer).toContainText('データの読み込みに失敗しました');

    // Should have retry button
    const retryButton = page.locator('.retry-button');
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toBeEnabled();

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

    // Should recover and show chart
    await expect(errorContainer).not.toBeVisible({ timeout: 5000 });
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });
  });

  test('handles API server errors (500)', async ({ page }) => {
    // Mock server error
    await page.route('/api/analytics/meals*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'データベース接続エラー',
        }),
      });
    });

    await page.goto('/analytics');

    // Should show server error message
    const errorContainer = page.locator('.error-container');
    await expect(errorContainer).toBeVisible();
    await expect(errorContainer).toContainText('サーバーエラーが発生しました');

    // Should show retry option
    const retryButton = page.locator('.retry-button');
    await expect(retryButton).toBeVisible();
  });

  test('handles API timeout errors', async ({ page }) => {
    // Mock slow API response (timeout)
    await page.route('/api/analytics/meals*', async (route) => {
      // Simulate timeout by delaying response beyond reasonable time
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
      await route.continue();
    });

    await page.goto('/analytics');

    // Should show loading state initially
    const loadingSpinner = page.locator('.animate-spin');
    await expect(loadingSpinner).toBeVisible();

    // After timeout, should show error
    const errorContainer = page.locator('.error-container');
    await expect(errorContainer).toBeVisible({ timeout: 35000 });
    await expect(errorContainer).toContainText('リクエストがタイムアウトしました');
  });

  test('handles malformed API responses', async ({ page }) => {
    // Mock malformed JSON response
    await page.route('/api/analytics/meals*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json response',
      });
    });

    await page.goto('/analytics');

    // Should handle JSON parse error
    const errorContainer = page.locator('.error-container');
    await expect(errorContainer).toBeVisible();
    await expect(errorContainer).toContainText('データ形式が無効です');
  });

  test('handles missing required data fields', async ({ page }) => {
    // Mock response with missing required fields
    await page.route('/api/analytics/meals*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            // Missing dailyCalories field
            summary: {
              totalMeals: 0,
              totalCalories: 0,
            },
          },
        }),
      });
    });

    await page.goto('/analytics');

    // Should handle missing data gracefully
    const errorContainer = page.locator('.error-container');
    await expect(errorContainer).toBeVisible();
    await expect(errorContainer).toContainText('必要なデータが不足しています');
  });

  test('handles invalid date formats in API response', async ({ page }) => {
    // Mock response with invalid date formats
    await page.route('/api/analytics/meals*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            dailyCalories: [
              { date: 'invalid-date', calories: 250.5, type: 'DRY' },
              { date: '2024-13-45', calories: 280.0, type: 'WET' }, // Invalid date
              { date: null, calories: 265.5, type: 'DRY' }, // Null date
            ],
            summary: {
              totalMeals: 3,
              totalCalories: 796.0,
              averageCaloriesPerMeal: 265.3,
            },
          },
        }),
      });
    });

    await page.goto('/analytics');

    // Should show data validation error
    const errorContainer = page.locator('.error-container');
    await expect(errorContainer).toBeVisible();
    await expect(errorContainer).toContainText('データ検証エラー');
  });

  test('handles browser compatibility issues', async ({ page }) => {
    // Mock canvas context failure (simulate old browser)
    await page.addInitScript(() => {
      // Override canvas getContext to simulate failure
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function () {
        return null; // Simulate canvas not supported
      };
    });

    // Mock successful API response
    await page.route('/api/analytics/meals*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            dailyCalories: [
              { date: '2024-01-01', calories: 250.5, type: 'DRY' },
            ],
            summary: {
              totalMeals: 1,
              totalCalories: 250.5,
              averageCaloriesPerMeal: 250.5,
            },
          },
        }),
      });
    });

    await page.goto('/analytics');

    // Should show browser compatibility error
    const compatibilityError = page.locator('.browser-compatibility-error');
    await expect(compatibilityError).toBeVisible();
    await expect(compatibilityError).toContainText('ブラウザの互換性');
  });

  test('handles memory exhaustion gracefully', async ({ page }) => {
    // Mock very large dataset that could cause memory issues
    const largeDataset = {
      success: true,
      data: {
        dailyCalories: Array.from({ length: 50000 }, (_, i) => ({
          date: new Date(2020, 0, (i % 365) + 1).toISOString().split('T')[0],
          calories: 250 + Math.random() * 100,
          type: i % 2 === 0 ? 'DRY' : 'WET',
        })),
        summary: {
          totalMeals: 150000,
          totalCalories: 15000000,
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

    await page.goto('/analytics');

    // Should either load successfully with optimization or show performance warning
    const canvas = page.locator('canvas');
    const performanceWarning = page.locator('.performance-warning');

    // Either chart loads (with data optimization) or performance warning is shown
    await expect(
      canvas.or(performanceWarning),
    ).toBeVisible({ timeout: 10000 });

    if (await performanceWarning.isVisible()) {
      await expect(performanceWarning).toContainText('データポイント数が多すぎます');
    }
  });

  test('handles concurrent API calls and race conditions', async ({ page }) => {
    let callCount = 0;

    // Mock API with delayed responses to simulate race conditions
    await page.route('/api/analytics/meals*', async (route) => {
      callCount++;
      const currentCall = callCount;

      // Simulate different response times
      const delay = currentCall === 1 ? 2000 : 500;
      await new Promise(resolve => setTimeout(resolve, delay));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            dailyCalories: [
              { date: '2024-01-01', calories: 250.5 + currentCall, type: 'DRY' },
            ],
            summary: {
              totalMeals: currentCall,
              totalCalories: 250.5 + currentCall,
              averageCaloriesPerMeal: 250.5 + currentCall,
            },
          },
        }),
      });
    });

    await page.goto('/analytics');

    // Quickly change filters to trigger multiple API calls
    const catSelect = page.locator('[data-testid="cat-selection-filter"] select');
    if (await catSelect.isVisible()) {
      await catSelect.selectOption({ index: 1 });
      await catSelect.selectOption({ index: 2 });
      await catSelect.selectOption({ index: 0 });
    }

    // Should handle race conditions gracefully and show final result
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });

    // Should not show multiple error states
    const errorContainers = page.locator('.error-container');
    expect(await errorContainers.count()).toBeLessThanOrEqual(1);
  });

  test('handles authentication errors', async ({ page }) => {
    // Mock authentication error
    await page.route('/api/analytics/meals*', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Unauthorized',
          message: '認証が必要です',
        }),
      });
    });

    await page.goto('/analytics');

    // Should show authentication error
    const errorContainer = page.locator('.error-container');
    await expect(errorContainer).toBeVisible();
    await expect(errorContainer).toContainText('認証エラー');

    // Should provide login link or redirect
    const loginLink = page.locator('a[href*="login"]');
    if (await loginLink.isVisible()) {
      await expect(loginLink).toBeVisible();
    }
  });

  test('handles permission errors', async ({ page }) => {
    // Mock permission error
    await page.route('/api/analytics/meals*', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'アクセス権限がありません',
        }),
      });
    });

    await page.goto('/analytics');

    // Should show permission error
    const errorContainer = page.locator('.error-container');
    await expect(errorContainer).toBeVisible();
    await expect(errorContainer).toContainText('アクセス権限がありません');
  });

  test('handles multiple consecutive errors', async ({ page }) => {
    let errorCount = 0;

    await page.route('/api/analytics/meals*', async (route) => {
      errorCount++;

      if (errorCount <= 3) {
        // First 3 attempts fail
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: `Server Error ${errorCount}`,
          }),
        });
      }
      else {
        // 4th attempt succeeds
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              dailyCalories: [
                { date: '2024-01-01', calories: 250.5, type: 'DRY' },
              ],
              summary: {
                totalMeals: 1,
                totalCalories: 250.5,
                averageCaloriesPerMeal: 250.5,
              },
            },
          }),
        });
      }
    });

    await page.goto('/analytics');

    // Should show error initially
    const errorContainer = page.locator('.error-container');
    await expect(errorContainer).toBeVisible();

    // Retry multiple times
    const retryButton = page.locator('.retry-button');

    for (let i = 0; i < 3; i++) {
      if (await retryButton.isVisible() && await retryButton.isEnabled()) {
        await retryButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // Should eventually succeed
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });
    await expect(errorContainer).not.toBeVisible();
  });

  test('prevents infinite retry loops', async ({ page }) => {
    let retryCount = 0;

    await page.route('/api/analytics/meals*', async (route) => {
      retryCount++;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Persistent Server Error',
        }),
      });
    });

    await page.goto('/analytics');

    // Should show error
    const errorContainer = page.locator('.error-container');
    await expect(errorContainer).toBeVisible();

    // Try to retry multiple times
    const retryButton = page.locator('.retry-button');

    for (let i = 0; i < 10; i++) {
      if (await retryButton.isVisible() && await retryButton.isEnabled()) {
        await retryButton.click();
        await page.waitForTimeout(500);
      }
      else {
        break;
      }
    }

    // Should eventually disable retry button or show max retry message
    const maxRetryMessage = page.locator('.max-retry-message');
    const disabledRetryButton = page.locator('.retry-button:disabled');

    await expect(
      maxRetryMessage.or(disabledRetryButton),
    ).toBeVisible();

    if (await maxRetryMessage.isVisible()) {
      await expect(maxRetryMessage).toContainText('最大再試行回数');
    }
  });

  test('maintains user experience during errors', async ({ page }) => {
    // Start with successful data
    await page.route('/api/analytics/meals*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            dailyCalories: [
              { date: '2024-01-01', calories: 250.5, type: 'DRY' },
            ],
            summary: {
              totalMeals: 1,
              totalCalories: 250.5,
              averageCaloriesPerMeal: 250.5,
            },
          },
        }),
      });
    });

    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Verify chart loads successfully
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Now mock error for subsequent requests
    await page.route('/api/analytics/meals*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server Error' }),
      });
    });

    // Try to change filter (which will trigger error)
    const barButton = page.locator('[data-testid="chart-type-toggle"] button[data-chart-type="bar"]');
    await barButton.click();

    // Should show error but keep previous chart visible
    const errorToast = page.locator('.error-toast');
    if (await errorToast.isVisible()) {
      await expect(errorToast).toContainText('更新に失敗しました');
    }

    // Original chart should still be visible
    await expect(canvas).toBeVisible();
  });

  test('provides helpful error messages for different scenarios', async ({ page }) => {
    const errorScenarios = [
      {
        status: 404,
        body: { error: 'Not Found' },
        expectedMessage: 'データが見つかりません',
      },
      {
        status: 429,
        body: { error: 'Too Many Requests' },
        expectedMessage: 'リクエスト制限に達しました',
      },
      {
        status: 503,
        body: { error: 'Service Unavailable' },
        expectedMessage: 'サービスが一時的に利用できません',
      },
    ];

    for (const scenario of errorScenarios) {
      await page.route('/api/analytics/meals*', async (route) => {
        await route.fulfill({
          status: scenario.status,
          contentType: 'application/json',
          body: JSON.stringify(scenario.body),
        });
      });

      await page.goto('/analytics');

      const errorContainer = page.locator('.error-container');
      await expect(errorContainer).toBeVisible();
      await expect(errorContainer).toContainText(scenario.expectedMessage);

      // Clean up route for next iteration
      await page.unroute('/api/analytics/meals*');
    }
  });
});
