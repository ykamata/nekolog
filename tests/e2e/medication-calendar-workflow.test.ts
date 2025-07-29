import { test, expect } from '@playwright/test';

test.describe('Medication Calendar Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to medication calendar page
    await page.goto('/medication-calendar');
    await page.waitForSelector('.calendar-container');
  });

  test('should display calendar with medication records', async ({ page }) => {
    // Check calendar structure
    await expect(page.locator('.calendar-header')).toBeVisible();
    await expect(page.locator('.calendar-title')).toContainText(/\d{4}年\d{1,2}月/);
    await expect(page.locator('.calendar-nav-button')).toHaveCount(2);

    // Check calendar grid
    await expect(page.locator('.calendar-grid')).toBeVisible();
    await expect(page.locator('.calendar-day')).toHaveCount.greaterThan(28);

    // Check day labels
    const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];
    for (const label of dayLabels) {
      await expect(page.locator('.day-label')).toContainText(label);
    }
  });

  test('should navigate between months', async ({ page }) => {
    // Get current month
    const currentMonth = await page.locator('.calendar-title').textContent();

    // Navigate to next month
    await page.locator('.calendar-nav-button').last().click();
    await page.waitForTimeout(500); // Wait for animation

    const nextMonth = await page.locator('.calendar-title').textContent();
    expect(nextMonth).not.toBe(currentMonth);

    // Navigate to previous month
    await page.locator('.calendar-nav-button').first().click();
    await page.waitForTimeout(500);

    const backToMonth = await page.locator('.calendar-title').textContent();
    expect(backToMonth).toBe(currentMonth);
  });

  test('should create medication record from calendar', async ({ page }) => {
    // Click on a calendar day
    const today = new Date();
    const dayNumber = today.getDate();
    const calendarDay = page.locator('.calendar-day.current-month').filter({ hasText: dayNumber.toString() }).first();

    await calendarDay.click();

    // Should show day details panel
    await expect(page.locator('.day-details')).toBeVisible();
    await expect(page.locator('.selected-date')).toContainText(dayNumber.toString());

    // Click add record button
    await page.locator('.add-record-button').click();

    // Should open record form modal
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.locator('.modal-title')).toContainText('投与記録を追加');

    // Date should be pre-filled
    const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    await expect(page.locator('input[name="administeredAt"]')).toHaveValue(new RegExp(expectedDate));

    // Fill form
    await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
    await page.locator('select[name="catId"]').selectOption({ index: 1 });
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('textarea[name="notes"]').fill('カレンダーから作成されたテスト記録');

    // Submit form
    await page.locator('.submit-button').click();

    // Modal should close
    await expect(page.locator('.modal-overlay')).not.toBeVisible();

    // Day should now show record indicator
    await expect(calendarDay).toHaveClass(/has-records/);

    // Day details should show the new record
    await expect(page.locator('.day-records .record-item')).toContainText('カレンダーから作成されたテスト記録');
  });

  test('should display multiple daily administrations', async ({ page }) => {
    // First, create multiple records for the same day
    const testDate = '2024-01-15';

    // Navigate to January 2024
    while (!(await page.locator('.calendar-title').textContent())?.includes('2024年1月')) {
      await page.locator('.calendar-nav-button').first().click();
      await page.waitForTimeout(300);
    }

    // Click on day 15
    const day15 = page.locator('.calendar-day.current-month').filter({ hasText: '15' }).first();
    await day15.click();

    // Create morning record
    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
    await page.locator('select[name="catId"]').selectOption({ index: 1 });
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('input[name="administeredAt"]').fill(`${testDate}T08:00`);
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('textarea[name="notes"]').fill('朝の投与');
    await page.locator('.submit-button').click();

    await expect(page.locator('.modal-overlay')).not.toBeVisible();

    // Create evening record
    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
    await page.locator('select[name="catId"]').selectOption({ index: 1 });
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('input[name="administeredAt"]').fill(`${testDate}T20:00`);
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('textarea[name="notes"]').fill('夜の投与');
    await page.locator('.submit-button').click();

    await expect(page.locator('.modal-overlay')).not.toBeVisible();

    // Verify both records are shown
    await expect(page.locator('.day-records .record-item')).toHaveCount(2);
    await expect(page.locator('.day-records')).toContainText('朝の投与');
    await expect(page.locator('.day-records')).toContainText('夜の投与');

    // Verify time grouping
    await expect(page.locator('.time-group.morning')).toBeVisible();
    await expect(page.locator('.time-group.evening')).toBeVisible();

    await expect(page.locator('.time-group.morning .record-item')).toContainText('朝の投与');
    await expect(page.locator('.time-group.evening .record-item')).toContainText('夜の投与');
  });

  test('should filter calendar by cat', async ({ page }) => {
    // Create records for different cats
    const testDate = '2024-01-16';

    // Navigate to January 2024
    while (!(await page.locator('.calendar-title').textContent())?.includes('2024年1月')) {
      await page.locator('.calendar-nav-button').first().click();
      await page.waitForTimeout(300);
    }

    const day16 = page.locator('.calendar-day.current-month').filter({ hasText: '16' }).first();
    await day16.click();

    // Record for first cat
    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
    await page.locator('select[name="catId"]').selectOption({ index: 1 });
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('input[name="administeredAt"]').fill(`${testDate}T08:00`);
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('textarea[name="notes"]').fill('猫1の記録');
    await page.locator('.submit-button').click();

    // Record for second cat
    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
    await page.locator('select[name="catId"]').selectOption({ index: 2 });
    await page.locator('input[name="quantity"]').fill('2');
    await page.locator('input[name="administeredAt"]').fill(`${testDate}T08:00`);
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('textarea[name="notes"]').fill('猫2の記録');
    await page.locator('.submit-button').click();

    // Both records should be visible initially
    await expect(page.locator('.day-records .record-item')).toHaveCount(2);

    // Filter by first cat
    await page.locator('.cat-filter').selectOption({ index: 1 });
    await page.waitForTimeout(500);

    await expect(page.locator('.day-records .record-item')).toHaveCount(1);
    await expect(page.locator('.day-records')).toContainText('猫1の記録');
    await expect(page.locator('.day-records')).not.toContainText('猫2の記録');

    // Filter by second cat
    await page.locator('.cat-filter').selectOption({ index: 2 });
    await page.waitForTimeout(500);

    await expect(page.locator('.day-records .record-item')).toHaveCount(1);
    await expect(page.locator('.day-records')).toContainText('猫2の記録');
    await expect(page.locator('.day-records')).not.toContainText('猫1の記録');

    // Show all cats
    await page.locator('.cat-filter').selectOption({ value: 'all' });
    await page.waitForTimeout(500);

    await expect(page.locator('.day-records .record-item')).toHaveCount(2);
  });

  test('should edit medication record from calendar', async ({ page }) => {
    // Create a record first
    const testDate = '2024-01-17';

    while (!(await page.locator('.calendar-title').textContent())?.includes('2024年1月')) {
      await page.locator('.calendar-nav-button').first().click();
      await page.waitForTimeout(300);
    }

    const day17 = page.locator('.calendar-day.current-month').filter({ hasText: '17' }).first();
    await day17.click();

    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
    await page.locator('select[name="catId"]').selectOption({ index: 1 });
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('input[name="administeredAt"]').fill(`${testDate}T08:00`);
    await page.locator('select[name="status"]').selectOption('PENDING');
    await page.locator('textarea[name="notes"]').fill('編集前の記録');
    await page.locator('.submit-button').click();

    // Edit the record
    const recordItem = page.locator('.day-records .record-item').first();
    await recordItem.locator('.edit-button').click();

    // Should open edit modal
    await expect(page.locator('.modal-title')).toContainText('投与記録を編集');

    // Update record
    await page.locator('input[name="quantity"]').fill('2');
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('textarea[name="notes"]').fill('編集後の記録');
    await page.locator('.submit-button').click();

    // Verify changes
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
    await expect(page.locator('.day-records')).toContainText('編集後の記録');
    await expect(page.locator('.day-records')).toContainText('2個');
    await expect(page.locator('.status-badge')).toContainText('投与済み');
  });

  test('should delete medication record from calendar', async ({ page }) => {
    // Create a record first
    const testDate = '2024-01-18';

    while (!(await page.locator('.calendar-title').textContent())?.includes('2024年1月')) {
      await page.locator('.calendar-nav-button').first().click();
      await page.waitForTimeout(300);
    }

    const day18 = page.locator('.calendar-day.current-month').filter({ hasText: '18' }).first();
    await day18.click();

    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
    await page.locator('select[name="catId"]').selectOption({ index: 1 });
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('input[name="administeredAt"]').fill(`${testDate}T08:00`);
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('textarea[name="notes"]').fill('削除予定の記録');
    await page.locator('.submit-button').click();

    // Delete the record
    const recordItem = page.locator('.day-records .record-item').first();
    await recordItem.locator('.delete-button').click();

    // Should show confirmation dialog
    await expect(page.locator('.confirm-dialog')).toBeVisible();
    await expect(page.locator('.confirm-message')).toContainText('この投与記録を削除しますか？');

    // Confirm deletion
    await page.locator('.confirm-button').click();

    // Record should be removed
    await expect(page.locator('.confirm-dialog')).not.toBeVisible();
    await expect(page.locator('.day-records .record-item')).toHaveCount(0);
    await expect(page.locator('.no-records-message')).toContainText('この日の投与記録はありません');

    // Day should no longer have record indicator
    await expect(day18).not.toHaveClass(/has-records/);
  });

  test('should show medication status indicators on calendar', async ({ page }) => {
    // Create records with different statuses
    const testDate = '2024-01-19';

    while (!(await page.locator('.calendar-title').textContent())?.includes('2024年1月')) {
      await page.locator('.calendar-nav-button').first().click();
      await page.waitForTimeout(300);
    }

    const day19 = page.locator('.calendar-day.current-month').filter({ hasText: '19' }).first();
    await day19.click();

    // Administered record
    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
    await page.locator('select[name="catId"]').selectOption({ index: 1 });
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('input[name="administeredAt"]').fill(`${testDate}T08:00`);
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('.submit-button').click();

    // Pending record
    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
    await page.locator('select[name="catId"]').selectOption({ index: 1 });
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('input[name="administeredAt"]').fill(`${testDate}T20:00`);
    await page.locator('select[name="status"]').selectOption('PENDING');
    await page.locator('.submit-button').click();

    // Day should show mixed status indicators
    await expect(day19).toHaveClass(/has-administered/);
    await expect(day19).toHaveClass(/has-pending/);

    // Status indicators should be visible
    await expect(day19.locator('.status-indicator.administered')).toBeVisible();
    await expect(day19.locator('.status-indicator.pending')).toBeVisible();

    // Create skipped record for another day
    const day20 = page.locator('.calendar-day.current-month').filter({ hasText: '20' }).first();
    await day20.click();

    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
    await page.locator('select[name="catId"]').selectOption({ index: 1 });
    await page.locator('input[name="quantity"]').fill('0');
    await page.locator('input[name="administeredAt"]').fill('2024-01-20T08:00');
    await page.locator('select[name="status"]').selectOption('SKIPPED');
    await page.locator('.submit-button').click();

    // Day 20 should show skipped indicator
    await expect(day20).toHaveClass(/has-skipped/);
    await expect(day20.locator('.status-indicator.skipped')).toBeVisible();
  });

  test('should handle calendar keyboard navigation', async ({ page }) => {
    // Focus on calendar
    await page.locator('.calendar-grid').focus();

    // Use arrow keys to navigate
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');

    // Should highlight the focused day
    await expect(page.locator('.calendar-day.focused')).toBeVisible();

    // Press Enter to select day
    await page.keyboard.press('Enter');

    // Should show day details
    await expect(page.locator('.day-details')).toBeVisible();

    // Use keyboard shortcuts
    await page.keyboard.press('n'); // Should open new record modal
    await expect(page.locator('.modal-overlay')).toBeVisible();

    await page.keyboard.press('Escape'); // Should close modal
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Calendar should adapt to mobile layout
    await expect(page.locator('.calendar-container')).toHaveClass(/mobile-layout/);

    // Mobile calendar should show fewer days or different layout
    await expect(page.locator('.calendar-grid')).toHaveClass(/mobile-grid/);

    // Navigation should be touch-friendly
    await expect(page.locator('.calendar-nav-button')).toHaveClass(/mobile-nav/);

    // Day details should be in mobile format
    const today = new Date();
    const dayNumber = today.getDate();
    const calendarDay = page.locator('.calendar-day.current-month').filter({ hasText: dayNumber.toString() }).first();

    await calendarDay.tap(); // Use tap instead of click for mobile

    await expect(page.locator('.day-details')).toHaveClass(/mobile-details/);

    // Mobile modal should be full-screen
    await page.locator('.add-record-button').tap();
    await expect(page.locator('.modal')).toHaveClass(/mobile-modal/);
    await expect(page.locator('.modal')).toHaveClass(/fullscreen/);
  });

  test('should handle offline functionality', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true);

    // Should show offline indicator
    await expect(page.locator('.offline-indicator')).toBeVisible();
    await expect(page.locator('.offline-message')).toContainText('オフライン');

    // Try to create a record offline
    const today = new Date();
    const dayNumber = today.getDate();
    const calendarDay = page.locator('.calendar-day.current-month').filter({ hasText: dayNumber.toString() }).first();

    await calendarDay.click();
    await page.locator('.add-record-button').click();

    // Fill form
    await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
    await page.locator('select[name="catId"]').selectOption({ index: 1 });
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('textarea[name="notes"]').fill('オフライン記録');
    await page.locator('.submit-button').click();

    // Should show offline save message
    await expect(page.locator('.offline-save-message')).toContainText('オフラインで保存されました');

    // Record should appear with offline indicator
    await expect(page.locator('.day-records .record-item')).toContainText('オフライン記録');
    await expect(page.locator('.offline-badge')).toBeVisible();

    // Go back online
    await page.context().setOffline(false);

    // Should show sync indicator
    await expect(page.locator('.sync-indicator')).toBeVisible();
    await expect(page.locator('.sync-message')).toContainText('同期中');

    // Wait for sync to complete
    await page.waitForSelector('.sync-complete', { timeout: 10000 });
    await expect(page.locator('.sync-message')).toContainText('同期完了');

    // Offline badge should be removed
    await expect(page.locator('.offline-badge')).not.toBeVisible();
  });
});
