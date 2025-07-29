import { test, expect } from '@playwright/test';

test.describe('Medication Calendar Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to medication calendar page
    await page.goto('/medication-calendar');
  });

  test('should display page title and description', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('薬カレンダー');
    await expect(page.locator('.page-description')).toContainText('カレンダー形式で猫の薬の投与記録を管理できます');
  });

  test('should display calendar stats sections', async ({ page }) => {
    // Wait for stats to load
    await page.waitForSelector('.calendar-stats');

    // Check stats sections are present
    const statsSections = page.locator('.stats-section');
    await expect(statsSections).toHaveCount(2);

    // Check section titles
    await expect(page.locator('.stats-title').first()).toContainText('今月の統計');
    await expect(page.locator('.stats-title').last()).toContainText('今日の統計');

    // Check each section has 3 stat cards
    const statsGrids = page.locator('.stats-grid');
    await expect(statsGrids.first().locator('.stat-card')).toHaveCount(3);
    await expect(statsGrids.last().locator('.stat-card')).toHaveCount(3);
  });

  test('should display add record button', async ({ page }) => {
    const addButton = page.locator('.add-button');
    await expect(addButton).toBeVisible();
    await expect(addButton).toContainText('今日の記録を追加');
  });

  test('should display medication calendar component', async ({ page }) => {
    // Wait for the medication calendar to load
    await page.waitForSelector('.medication-calendar');

    // Check that the component is visible
    await expect(page.locator('.medication-calendar')).toBeVisible();
  });

  test('should display calendar legend', async ({ page }) => {
    const legend = page.locator('.calendar-legend');
    await expect(legend).toBeVisible();

    await expect(legend.locator('.legend-title')).toContainText('カレンダーの見方');

    const legendItems = legend.locator('.legend-item');
    await expect(legendItems).toHaveCount(4);

    // Check legend item texts
    await expect(legendItems.nth(0)).toContainText('投与済みの記録がある日');
    await expect(legendItems.nth(1)).toContainText('投与予定がある日');
    await expect(legendItems.nth(2)).toContainText('投与忘れがある日');
    await expect(legendItems.nth(3)).toContainText('今日');
  });

  test('should display quick actions section', async ({ page }) => {
    const quickActions = page.locator('.quick-actions');
    await expect(quickActions).toBeVisible();

    await expect(quickActions.locator('.quick-actions-title')).toContainText('関連機能');

    const actionButtons = quickActions.locator('.action-button');
    await expect(actionButtons).toHaveCount(4);

    // Check action button texts
    await expect(actionButtons.nth(0)).toContainText('薬の管理');
    await expect(actionButtons.nth(1)).toContainText('投与記録');
    await expect(actionButtons.nth(2)).toContainText('猫の管理');
    await expect(actionButtons.nth(3)).toContainText('データ分析');
  });

  test('should open add record modal when add button is clicked', async ({ page }) => {
    // Mock required data
    await page.route('/api/cats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: '1', name: 'テスト猫', createdAt: new Date().toISOString() },
        ]),
      });
    });

    await page.route('/api/medications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            name: 'テスト薬',
            type: 'MEDICINE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.route('/api/medication-records/stats*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          administered: 0,
          pending: 0,
          missed: 0,
        }),
      });
    });

    await page.goto('/medication-calendar');

    // Wait for data to load
    await page.waitForSelector('.calendar-stats');

    // Click add button
    await page.locator('.add-button').click();

    // Check modal is visible
    await expect(page.locator('.modal-overlay')).toBeVisible();
  });

  test('should navigate to related pages', async ({ page }) => {
    // Test navigation to medications
    const medicationsLink = page.locator('a[href="/medications"]');
    await expect(medicationsLink).toBeVisible();

    // Test navigation to medication records
    const recordsLink = page.locator('a[href="/medication-records"]');
    await expect(recordsLink).toBeVisible();

    // Test navigation to cats
    const catsLink = page.locator('a[href="/cats"]');
    await expect(catsLink).toBeVisible();

    // Test navigation to analytics
    const analyticsLink = page.locator('a[href="/analytics"]');
    await expect(analyticsLink).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that add button text is hidden on mobile
    await expect(page.locator('.add-text')).toBeHidden();

    // Check that calendar stats are displayed in single column on mobile
    const calendarStats = page.locator('.calendar-stats');
    await expect(calendarStats).toHaveCSS('grid-template-columns', '1fr');
  });

  test('should handle loading state', async ({ page }) => {
    // Mock slow API responses
    await page.route('/api/cats', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('/api/medications', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('/api/medication-records/stats*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          administered: 0,
          pending: 0,
          missed: 0,
        }),
      });
    });

    await page.goto('/medication-calendar');

    // Check loading state
    await expect(page.locator('.loading-container')).toBeVisible();
    await expect(page.locator('.loading-text')).toContainText('データを読み込み中...');

    // Wait for loading to complete
    await expect(page.locator('.loading-container')).toBeHidden();
  });

  test('should handle error state', async ({ page }) => {
    // Mock API error
    await page.route('/api/cats', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/medication-calendar');

    // Check error state
    await expect(page.locator('.error-container')).toBeVisible();
    await expect(page.locator('.error-title')).toContainText('エラーが発生しました');
    await expect(page.locator('.error-message')).toContainText('データの取得に失敗しました');

    // Check retry button
    const retryButton = page.locator('.retry-button');
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toContainText('再試行');
  });

  test('should display stats with correct values', async ({ page }) => {
    // Mock stats data
    const mockMonthlyStats = {
      administered: 15,
      pending: 3,
      missed: 2,
    };

    const mockDailyStats = {
      administered: 2,
      pending: 1,
      missed: 0,
    };

    await page.route('/api/cats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('/api/medications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Mock monthly stats
    await page.route('/api/medication-records/stats*', async (route) => {
      const url = new URL(route.request().url());
      const startDate = url.searchParams.get('startDate');

      if (startDate) {
        const date = new Date(startDate);
        const isMonthlyQuery = date.getDate() === 1 && date.getHours() === 0;

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(isMonthlyQuery ? mockMonthlyStats : mockDailyStats),
        });
      }
      else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockMonthlyStats),
        });
      }
    });

    await page.goto('/medication-calendar');

    // Wait for stats to load
    await page.waitForSelector('.calendar-stats');

    // Check monthly stats values
    const monthlyStatsGrid = page.locator('.stats-section').first().locator('.stats-grid');
    const monthlyStatValues = monthlyStatsGrid.locator('.stat-value');
    await expect(monthlyStatValues.nth(0)).toContainText('15');
    await expect(monthlyStatValues.nth(1)).toContainText('3');
    await expect(monthlyStatValues.nth(2)).toContainText('2');

    // Check daily stats values
    const dailyStatsGrid = page.locator('.stats-section').last().locator('.stats-grid');
    const dailyStatValues = dailyStatsGrid.locator('.stat-value');
    await expect(dailyStatValues.nth(0)).toContainText('2');
    await expect(dailyStatValues.nth(1)).toContainText('1');
    await expect(dailyStatValues.nth(2)).toContainText('0');
  });

  test('should display legend indicators with correct colors', async ({ page }) => {
    const legend = page.locator('.calendar-legend');
    const indicators = legend.locator('.legend-indicator');

    // Check that all indicators are visible
    await expect(indicators).toHaveCount(4);

    // Check indicator classes
    await expect(indicators.nth(0)).toHaveClass(/administered/);
    await expect(indicators.nth(1)).toHaveClass(/pending/);
    await expect(indicators.nth(2)).toHaveClass(/missed/);
    await expect(indicators.nth(3)).toHaveClass(/today/);
  });

  test('should handle calendar component interactions', async ({ page }) => {
    // Mock initial data
    await page.route('/api/cats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: '1', name: 'テスト猫', createdAt: new Date().toISOString() },
        ]),
      });
    });

    await page.route('/api/medications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            name: 'テスト薬',
            type: 'MEDICINE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.route('/api/medication-records/stats*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          administered: 0,
          pending: 0,
          missed: 0,
        }),
      });
    });

    // Mock medication records and reminders for calendar
    await page.route('/api/medication-records*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          medicationRecords: [],
          pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
        }),
      });
    });

    await page.route('/api/medication-reminders*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          medicationReminders: [],
          pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
        }),
      });
    });

    await page.goto('/medication-calendar');

    // Wait for calendar to load
    await page.waitForSelector('.medication-calendar');

    // Check that calendar navigation is present
    await expect(page.locator('.calendar-navigation')).toBeVisible();
    await expect(page.locator('.calendar-title')).toBeVisible();
  });
});
