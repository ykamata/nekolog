import { test, expect } from '@playwright/test';

test.describe('Medications Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to medications page
    await page.goto('/medications');
  });

  test('should display page title and description', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('薬管理');
    await expect(page.locator('.page-description')).toContainText('猫の薬情報を管理できます');
  });

  test('should display stats summary', async ({ page }) => {
    // Wait for stats to load
    await page.waitForSelector('.stats-summary');

    // Check stats cards are present
    const statCards = page.locator('.stat-card');
    await expect(statCards).toHaveCount(4);

    // Check stat labels
    await expect(page.locator('.stat-label')).toContainText(['総薬数', '薬', 'サプリメント', 'ビタミン']);
  });

  test('should display add medication button', async ({ page }) => {
    const addButton = page.locator('.add-button');
    await expect(addButton).toBeVisible();
    await expect(addButton).toContainText('薬を追加');
  });

  test('should display view mode toggle buttons', async ({ page }) => {
    const viewToggle = page.locator('.view-toggle');
    await expect(viewToggle).toBeVisible();

    const gridButton = viewToggle.locator('button').first();
    const listButton = viewToggle.locator('button').last();

    await expect(gridButton).toBeVisible();
    await expect(listButton).toBeVisible();
  });

  test('should display search input', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', '薬名や説明で検索...');
  });

  test('should display type filter buttons', async ({ page }) => {
    const typeFilter = page.locator('.type-filter');
    await expect(typeFilter).toBeVisible();

    const filterButtons = typeFilter.locator('.filter-button');
    await expect(filterButtons).toHaveCount(4);

    // Check filter button texts
    await expect(filterButtons.nth(0)).toContainText('すべて');
    await expect(filterButtons.nth(1)).toContainText('薬');
    await expect(filterButtons.nth(2)).toContainText('サプリメント');
    await expect(filterButtons.nth(3)).toContainText('ビタミン');
  });

  test('should display quick actions section', async ({ page }) => {
    const quickActions = page.locator('.quick-actions');
    await expect(quickActions).toBeVisible();

    await expect(quickActions.locator('.quick-actions-title')).toContainText('関連機能');

    const actionButtons = quickActions.locator('.action-button');
    await expect(actionButtons).toHaveCount(4);

    // Check action button texts
    await expect(actionButtons.nth(0)).toContainText('投与記録');
    await expect(actionButtons.nth(1)).toContainText('カレンダー');
    await expect(actionButtons.nth(2)).toContainText('猫の管理');
    await expect(actionButtons.nth(3)).toContainText('データ分析');
  });

  test('should open add medication modal when add button is clicked', async ({ page }) => {
    // Click add button
    await page.locator('.add-button').click();

    // Check modal is visible
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.locator('.modal-title')).toContainText('新しい薬を追加');
  });

  test('should filter medications by type', async ({ page }) => {
    // Wait for medications to load
    await page.waitForSelector('.medications-container');

    // Click on medicine filter
    await page.locator('.filter-button').nth(1).click();

    // Check that medicine filter is active
    await expect(page.locator('.filter-button').nth(1)).toHaveClass(/filter-button--active/);
  });

  test('should search medications', async ({ page }) => {
    // Type in search input
    await page.locator('.search-input').fill('テスト薬');

    // Check that search clear button appears
    await expect(page.locator('.search-clear')).toBeVisible();

    // Clear search
    await page.locator('.search-clear').click();

    // Check that search input is cleared
    await expect(page.locator('.search-input')).toHaveValue('');
  });

  test('should toggle view mode', async ({ page }) => {
    const gridButton = page.locator('.view-button').first();
    const listButton = page.locator('.view-button').last();

    // Grid should be active by default
    await expect(gridButton).toHaveClass(/view-button--active/);

    // Click list button
    await listButton.click();

    // List should be active now
    await expect(listButton).toHaveClass(/view-button--active/);
    await expect(gridButton).not.toHaveClass(/view-button--active/);
  });

  test('should navigate to related pages', async ({ page }) => {
    // Test navigation to medication records
    const recordsLink = page.locator('a[href="/medication-records"]');
    await expect(recordsLink).toBeVisible();

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
    // Mock slow API response
    await page.route('/api/medications', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/medications');

    // Check loading state
    await expect(page.locator('.loading-container')).toBeVisible();
    await expect(page.locator('.loading-text')).toContainText('データを読み込み中...');

    // Wait for loading to complete
    await expect(page.locator('.loading-container')).toBeHidden();
  });

  test('should handle error state', async ({ page }) => {
    // Mock API error
    await page.route('/api/medications', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/medications');

    // Check error state
    await expect(page.locator('.error-container')).toBeVisible();
    await expect(page.locator('.error-title')).toContainText('エラーが発生しました');
    await expect(page.locator('.error-message')).toContainText('データの取得に失敗しました');

    // Check retry button
    const retryButton = page.locator('.retry-button');
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toContainText('再試行');
  });

  test('should display empty state when no medications', async ({ page }) => {
    // Mock empty response
    await page.route('/api/medications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/medications');

    // Wait for the medication list component to load
    await page.waitForSelector('.medication-list');

    // Check empty state in medication list component
    await expect(page.locator('.empty-state')).toBeVisible();
  });

  test('should handle medication CRUD operations', async ({ page }) => {
    // Mock medications data
    const mockMedications = [
      {
        id: '1',
        name: 'テスト薬',
        type: 'MEDICINE',
        description: 'テスト用の薬です',
        dosage: '1日1回',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    await page.route('/api/medications', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockMedications),
        });
      }
    });

    await page.goto('/medications');

    // Wait for medications to load
    await page.waitForSelector('.medication-card');

    // Check medication card is displayed
    await expect(page.locator('.medication-card')).toHaveCount(1);
    await expect(page.locator('.medication-card__name')).toContainText('テスト薬');
  });
});
