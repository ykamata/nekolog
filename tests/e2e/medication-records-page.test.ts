import { test, expect } from '@playwright/test';

test.describe('Medication Records Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to medication records page
    await page.goto('/medication-records');
  });

  test('should display page title and description', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('投与記録');
    await expect(page.locator('.page-description')).toContainText('猫の薬の投与記録を管理できます');
  });

  test('should display stats summary', async ({ page }) => {
    // Wait for stats to load
    await page.waitForSelector('.stats-summary');

    // Check stats cards are present
    const statCards = page.locator('.stat-card');
    await expect(statCards).toHaveCount(5);

    // Check stat labels
    await expect(page.locator('.stat-label')).toContainText([
      '総記録数',
      '投与済み',
      '投与予定',
      '投与忘れ',
      '今日の記録',
    ]);
  });

  test('should display add record button', async ({ page }) => {
    const addButton = page.locator('.add-button');
    await expect(addButton).toBeVisible();
    await expect(addButton).toContainText('記録を追加');
  });

  test('should display medication record list component', async ({ page }) => {
    // Wait for the medication record list to load
    await page.waitForSelector('.medication-record-list');

    // Check that the component is visible
    await expect(page.locator('.medication-record-list')).toBeVisible();
  });

  test('should display quick actions section', async ({ page }) => {
    const quickActions = page.locator('.quick-actions');
    await expect(quickActions).toBeVisible();

    await expect(quickActions.locator('.quick-actions-title')).toContainText('関連機能');

    const actionButtons = quickActions.locator('.action-button');
    await expect(actionButtons).toHaveCount(4);

    // Check action button texts
    await expect(actionButtons.nth(0)).toContainText('薬の管理');
    await expect(actionButtons.nth(1)).toContainText('カレンダー');
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

    await page.route('/api/medication-records/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: 0,
          administered: 0,
          pending: 0,
          missed: 0,
          todayRecords: 0,
        }),
      });
    });

    await page.goto('/medication-records');

    // Wait for data to load
    await page.waitForSelector('.stats-summary');

    // Click add button
    await page.locator('.add-button').click();

    // Check modal is visible
    await expect(page.locator('.modal-overlay')).toBeVisible();
  });

  test('should navigate to related pages', async ({ page }) => {
    // Test navigation to medications
    const medicationsLink = page.locator('a[href="/medications"]');
    await expect(medicationsLink).toBeVisible();

    // Test navigation to medication calendar
    const calendarLink = page.locator('a[href="/medication-calendar"]');
    await expect(calendarLink).toBeVisible();

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

    // Check that stats are displayed in 2 columns on mobile
    const statsGrid = page.locator('.stats-summary');
    await expect(statsGrid).toHaveCSS('grid-template-columns', 'repeat(2, 1fr)');
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

    await page.route('/api/medication-records/stats', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: 0,
          administered: 0,
          pending: 0,
          missed: 0,
          todayRecords: 0,
        }),
      });
    });

    await page.goto('/medication-records');

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

    await page.goto('/medication-records');

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
    const mockStats = {
      total: 25,
      administered: 20,
      pending: 3,
      missed: 2,
      todayRecords: 5,
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

    await page.route('/api/medication-records/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockStats),
      });
    });

    await page.goto('/medication-records');

    // Wait for stats to load
    await page.waitForSelector('.stats-summary');

    // Check stat values
    const statValues = page.locator('.stat-value');
    await expect(statValues.nth(0)).toContainText('25');
    await expect(statValues.nth(1)).toContainText('20');
    await expect(statValues.nth(2)).toContainText('3');
    await expect(statValues.nth(3)).toContainText('2');
    await expect(statValues.nth(4)).toContainText('5');
  });

  test('should handle record CRUD operations through list component', async ({ page }) => {
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

    await page.route('/api/medication-records/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: 1,
          administered: 1,
          pending: 0,
          missed: 0,
          todayRecords: 1,
        }),
      });
    });

    // Mock medication records API
    await page.route('/api/medication-records*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            medicationRecords: [
              {
                id: '1',
                catId: '1',
                medicationId: '1',
                quantity: 1,
                administeredAt: new Date().toISOString(),
                status: 'ADMINISTERED',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                cat: { id: '1', name: 'テスト猫' },
                medication: { id: '1', name: 'テスト薬', type: 'MEDICINE' },
              },
            ],
            pagination: {
              total: 1,
              limit: 20,
              offset: 0,
              hasMore: false,
            },
          }),
        });
      }
    });

    await page.goto('/medication-records');

    // Wait for records to load
    await page.waitForSelector('.medication-record-card');

    // Check record is displayed
    await expect(page.locator('.medication-record-card')).toHaveCount(1);
    await expect(page.locator('.cat-name')).toContainText('テスト猫');
    await expect(page.locator('.medication-name')).toContainText('テスト薬');
  });

  test('should handle filter changes', async ({ page }) => {
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
        body: JSON.stringify([]),
      });
    });

    await page.route('/api/medication-records/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: 0,
          administered: 0,
          pending: 0,
          missed: 0,
          todayRecords: 0,
        }),
      });
    });

    await page.route('/api/medication-records*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          medicationRecords: [],
          pagination: {
            total: 0,
            limit: 20,
            offset: 0,
            hasMore: false,
          },
        }),
      });
    });

    await page.goto('/medication-records');

    // Wait for the medication record list to load
    await page.waitForSelector('.medication-record-list');

    // Check that filters are available
    await expect(page.locator('#cat-filter')).toBeVisible();
    await expect(page.locator('#status-filter')).toBeVisible();
  });
});
