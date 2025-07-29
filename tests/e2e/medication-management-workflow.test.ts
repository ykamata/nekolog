import { test, expect } from '@playwright/test';

test.describe('Medication Management Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to medications page
    await page.goto('/medications');

    // Wait for page to load
    await page.waitForSelector('.medications-container');
  });

  test('should complete medication creation and management workflow', async ({ page }) => {
    // Step 1: Create a new medication
    await page.locator('.add-button').click();

    // Wait for modal to appear
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.locator('.modal-title')).toContainText('新しい薬を追加');

    // Fill out medication form
    await page.locator('input[name="name"]').fill('テストE2E薬');
    await page.locator('select[name="type"]').selectOption('MEDICINE');
    await page.locator('textarea[name="description"]').fill('E2Eテスト用の薬です');
    await page.locator('input[name="dosage"]').fill('1日2回');

    // Submit form
    await page.locator('.submit-button').click();

    // Wait for modal to close and medication to appear in list
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
    await expect(page.locator('.medication-item')).toContainText('テストE2E薬');

    // Step 2: Edit the medication
    const medicationItem = page.locator('.medication-item').filter({ hasText: 'テストE2E薬' });
    await medicationItem.locator('.edit-button').click();

    // Wait for edit modal
    await expect(page.locator('.modal-title')).toContainText('薬を編集');

    // Update medication
    await page.locator('input[name="name"]').fill('更新されたテストE2E薬');
    await page.locator('input[name="dosage"]').fill('1日3回');
    await page.locator('.submit-button').click();

    // Verify update
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
    await expect(page.locator('.medication-item')).toContainText('更新されたテストE2E薬');

    // Step 3: Create medication record
    await page.goto('/medication-records');
    await page.waitForSelector('.records-container');

    await page.locator('.add-record-button').click();
    await expect(page.locator('.modal-title')).toContainText('投与記録を追加');

    // Fill record form
    await page.locator('select[name="medicationId"]').selectOption({ label: '更新されたテストE2E薬' });
    await page.locator('select[name="catId"]').selectOption({ index: 1 }); // Select first cat
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('input[name="administeredAt"]').fill('2024-01-15T08:00');
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('textarea[name="notes"]').fill('E2Eテスト投与記録');

    await page.locator('.submit-button').click();

    // Verify record creation
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
    await expect(page.locator('.record-item')).toContainText('更新されたテストE2E薬');
    await expect(page.locator('.record-item')).toContainText('E2Eテスト投与記録');

    // Step 4: View in calendar
    await page.goto('/medication-calendar');
    await page.waitForSelector('.calendar-container');

    // Navigate to January 2024
    await page.locator('.calendar-nav-button').first().click(); // Previous month if needed
    await expect(page.locator('.calendar-title')).toContainText('2024年1月');

    // Click on January 15th
    const day15 = page.locator('.calendar-day').filter({ hasText: '15' }).first();
    await day15.click();

    // Verify record appears in calendar
    await expect(page.locator('.day-records')).toContainText('更新されたテストE2E薬');
    await expect(page.locator('.record-status')).toContainText('投与済み');

    // Step 5: Clean up - delete the medication
    await page.goto('/medications');
    await page.waitForSelector('.medications-container');

    const testMedication = page.locator('.medication-item').filter({ hasText: '更新されたテストE2E薬' });
    await testMedication.locator('.delete-button').click();

    // Confirm deletion
    await expect(page.locator('.confirm-dialog')).toBeVisible();
    await page.locator('.confirm-button').click();

    // Verify deletion
    await expect(page.locator('.medication-item').filter({ hasText: '更新されたテストE2E薬' })).not.toBeVisible();
  });

  test('should handle medication administration workflow with reminders', async ({ page }) => {
    // Step 1: Create medication with schedule
    await page.locator('.add-button').click();
    await expect(page.locator('.modal-overlay')).toBeVisible();

    await page.locator('input[name="name"]').fill('リマインダーテスト薬');
    await page.locator('select[name="type"]').selectOption('MEDICINE');
    await page.locator('textarea[name="description"]').fill('リマインダー機能のテスト用');
    await page.locator('input[name="dosage"]').fill('1日2回');
    await page.locator('.submit-button').click();

    await expect(page.locator('.modal-overlay')).not.toBeVisible();

    // Step 2: Set up medication schedule
    const medicationItem = page.locator('.medication-item').filter({ hasText: 'リマインダーテスト薬' });
    await medicationItem.locator('.schedule-button').click();

    await expect(page.locator('.modal-title')).toContainText('投与スケジュール設定');

    // Configure schedule
    await page.locator('select[name="catId"]').selectOption({ index: 1 });
    await page.locator('select[name="frequency"]').selectOption('twice_daily');
    await page.locator('input[name="time1"]').fill('08:00');
    await page.locator('input[name="time2"]').fill('20:00');
    await page.locator('input[name="startDate"]').fill('2024-01-15');
    await page.locator('.submit-button').click();

    await expect(page.locator('.modal-overlay')).not.toBeVisible();

    // Step 3: Check reminders page
    await page.goto('/medication-reminders');
    await page.waitForSelector('.reminders-container');

    // Should see pending reminders
    await expect(page.locator('.reminder-item')).toContainText('リマインダーテスト薬');
    await expect(page.locator('.reminder-status')).toContainText('予定');

    // Step 4: Acknowledge reminder and record administration
    const reminderItem = page.locator('.reminder-item').filter({ hasText: 'リマインダーテスト薬' }).first();
    await reminderItem.locator('.acknowledge-button').click();

    // Should open record form with pre-filled data
    await expect(page.locator('.modal-title')).toContainText('投与記録');
    await expect(page.locator('select[name="medicationId"]')).toHaveValue(/リマインダーテスト薬/);

    // Complete the record
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('.submit-button').click();

    // Verify reminder status updated
    await expect(page.locator('.reminder-status')).toContainText('完了');

    // Clean up
    await page.goto('/medications');
    await page.waitForSelector('.medications-container');
    const testMedication = page.locator('.medication-item').filter({ hasText: 'リマインダーテスト薬' });
    await testMedication.locator('.delete-button').click();
    await page.locator('.confirm-button').click();
  });

  test('should handle multi-cat medication management', async ({ page }) => {
    // Step 1: Create medication for multiple cats
    await page.locator('.add-button').click();
    await page.locator('input[name="name"]').fill('マルチ猫テスト薬');
    await page.locator('select[name="type"]').selectOption('SUPPLEMENT');
    await page.locator('textarea[name="description"]').fill('複数の猫用のサプリメント');
    await page.locator('.submit-button').click();

    await expect(page.locator('.modal-overlay')).not.toBeVisible();

    // Step 2: Create records for different cats
    await page.goto('/medication-records');
    await page.waitForSelector('.records-container');

    // Record for first cat
    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ label: 'マルチ猫テスト薬' });
    await page.locator('select[name="catId"]').selectOption({ index: 1 });
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('input[name="administeredAt"]').fill('2024-01-15T08:00');
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('textarea[name="notes"]').fill('猫1への投与');
    await page.locator('.submit-button').click();

    await expect(page.locator('.modal-overlay')).not.toBeVisible();

    // Record for second cat
    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ label: 'マルチ猫テスト薬' });
    await page.locator('select[name="catId"]').selectOption({ index: 2 });
    await page.locator('input[name="quantity"]').fill('2');
    await page.locator('input[name="administeredAt"]').fill('2024-01-15T08:00');
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('textarea[name="notes"]').fill('猫2への投与');
    await page.locator('.submit-button').click();

    await expect(page.locator('.modal-overlay')).not.toBeVisible();

    // Step 3: Filter records by cat
    await page.locator('.cat-filter').selectOption({ index: 1 });
    await expect(page.locator('.record-item')).toHaveCount(1);
    await expect(page.locator('.record-item')).toContainText('猫1への投与');

    await page.locator('.cat-filter').selectOption({ index: 2 });
    await expect(page.locator('.record-item')).toHaveCount(1);
    await expect(page.locator('.record-item')).toContainText('猫2への投与');

    // Step 4: View combined data in calendar
    await page.goto('/medication-calendar');
    await page.waitForSelector('.calendar-container');

    // Navigate to January 2024
    await page.locator('.calendar-nav-button').first().click();
    const day15 = page.locator('.calendar-day').filter({ hasText: '15' }).first();
    await day15.click();

    // Should see both records
    await expect(page.locator('.day-records .record-item')).toHaveCount(2);
    await expect(page.locator('.day-records')).toContainText('猫1への投与');
    await expect(page.locator('.day-records')).toContainText('猫2への投与');

    // Step 5: Test cat-specific view
    await page.locator('.cat-selector').selectOption({ index: 1 });
    await expect(page.locator('.day-records .record-item')).toHaveCount(1);
    await expect(page.locator('.day-records')).toContainText('猫1への投与');

    // Clean up
    await page.goto('/medications');
    await page.waitForSelector('.medications-container');
    const testMedication = page.locator('.medication-item').filter({ hasText: 'マルチ猫テスト薬' });
    await testMedication.locator('.delete-button').click();
    await page.locator('.confirm-button').click();
  });

  test('should handle medication status management workflow', async ({ page }) => {
    // Step 1: Create medication
    await page.locator('.add-button').click();
    await page.locator('input[name="name"]').fill('ステータステスト薬');
    await page.locator('select[name="type"]').selectOption('MEDICINE');
    await page.locator('.submit-button').click();

    // Step 2: Create records with different statuses
    await page.goto('/medication-records');
    await page.waitForSelector('.records-container');

    // Administered record
    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ label: 'ステータステスト薬' });
    await page.locator('select[name="catId"]').selectOption({ index: 1 });
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('input[name="administeredAt"]').fill('2024-01-15T08:00');
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('.submit-button').click();

    // Pending record
    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ label: 'ステータステスト薬' });
    await page.locator('select[name="catId"]').selectOption({ index: 1 });
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('input[name="administeredAt"]').fill('2024-01-15T20:00');
    await page.locator('select[name="status"]').selectOption('PENDING');
    await page.locator('.submit-button').click();

    // Skipped record
    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ label: 'ステータステスト薬' });
    await page.locator('select[name="catId"]').selectOption({ index: 1 });
    await page.locator('input[name="quantity"]').fill('0');
    await page.locator('input[name="administeredAt"]').fill('2024-01-16T08:00');
    await page.locator('select[name="status"]').selectOption('SKIPPED');
    await page.locator('.submit-button').click();

    // Step 3: Filter by status
    await page.locator('.status-filter').selectOption('ADMINISTERED');
    await expect(page.locator('.record-item')).toHaveCount(1);
    await expect(page.locator('.status-badge')).toContainText('投与済み');

    await page.locator('.status-filter').selectOption('PENDING');
    await expect(page.locator('.record-item')).toHaveCount(1);
    await expect(page.locator('.status-badge')).toContainText('予定');

    await page.locator('.status-filter').selectOption('SKIPPED');
    await expect(page.locator('.record-item')).toHaveCount(1);
    await expect(page.locator('.status-badge')).toContainText('スキップ');

    // Step 4: Update status
    await page.locator('.status-filter').selectOption('PENDING');
    const pendingRecord = page.locator('.record-item').first();
    await pendingRecord.locator('.edit-button').click();

    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('.submit-button').click();

    // Verify status update
    await expect(page.locator('.status-badge')).toContainText('投与済み');

    // Step 5: View status summary in calendar
    await page.goto('/medication-calendar');
    await page.waitForSelector('.calendar-container');

    const day15 = page.locator('.calendar-day').filter({ hasText: '15' }).first();
    await expect(day15).toHaveClass(/has-administered/);

    const day16 = page.locator('.calendar-day').filter({ hasText: '16' }).first();
    await expect(day16).toHaveClass(/has-skipped/);

    // Clean up
    await page.goto('/medications');
    await page.waitForSelector('.medications-container');
    const testMedication = page.locator('.medication-item').filter({ hasText: 'ステータステスト薬' });
    await testMedication.locator('.delete-button').click();
    await page.locator('.confirm-button').click();
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    // Test 1: Invalid form submission
    await page.locator('.add-button').click();
    await page.locator('.submit-button').click(); // Submit without filling required fields

    // Should show validation errors
    await expect(page.locator('.error-message')).toContainText('薬名は必須です');
    await expect(page.locator('.modal-overlay')).toBeVisible(); // Modal should stay open

    // Fill valid data and submit
    await page.locator('input[name="name"]').fill('エラーテスト薬');
    await page.locator('select[name="type"]').selectOption('MEDICINE');
    await page.locator('.submit-button').click();

    await expect(page.locator('.modal-overlay')).not.toBeVisible();

    // Test 2: Network error handling
    // Simulate network failure
    await page.route('**/api/medications', route => route.abort());

    await page.locator('.add-button').click();
    await page.locator('input[name="name"]').fill('ネットワークエラーテスト');
    await page.locator('select[name="type"]').selectOption('MEDICINE');
    await page.locator('.submit-button').click();

    // Should show error message
    await expect(page.locator('.error-toast')).toContainText('ネットワークエラーが発生しました');

    // Restore network
    await page.unroute('**/api/medications');

    // Test 3: Deletion confirmation
    const testMedication = page.locator('.medication-item').filter({ hasText: 'エラーテスト薬' });
    await testMedication.locator('.delete-button').click();

    // Should show confirmation dialog
    await expect(page.locator('.confirm-dialog')).toBeVisible();
    await expect(page.locator('.confirm-message')).toContainText('本当に削除しますか？');

    // Cancel deletion
    await page.locator('.cancel-button').click();
    await expect(page.locator('.confirm-dialog')).not.toBeVisible();
    await expect(testMedication).toBeVisible(); // Should still exist

    // Confirm deletion
    await testMedication.locator('.delete-button').click();
    await page.locator('.confirm-button').click();
    await expect(testMedication).not.toBeVisible();
  });

  test('should work correctly on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Test mobile navigation
    await expect(page.locator('.mobile-nav')).toBeVisible();
    await expect(page.locator('.desktop-nav')).not.toBeVisible();

    // Test mobile medication list
    await expect(page.locator('.medications-grid')).toHaveClass(/mobile-layout/);

    // Test mobile modal
    await page.locator('.add-button').click();
    await expect(page.locator('.modal')).toHaveClass(/mobile-modal/);

    // Test mobile form
    await page.locator('input[name="name"]').fill('モバイルテスト薬');
    await page.locator('select[name="type"]').selectOption('MEDICINE');
    await page.locator('.submit-button').click();

    await expect(page.locator('.modal-overlay')).not.toBeVisible();
    await expect(page.locator('.medication-item')).toContainText('モバイルテスト薬');

    // Test mobile calendar
    await page.goto('/medication-calendar');
    await page.waitForSelector('.calendar-container');

    await expect(page.locator('.calendar')).toHaveClass(/mobile-calendar/);
    await expect(page.locator('.calendar-day')).toHaveCount(35); // Should show mobile-optimized calendar

    // Clean up
    await page.goto('/medications');
    await page.waitForSelector('.medications-container');
    const testMedication = page.locator('.medication-item').filter({ hasText: 'モバイルテスト薬' });
    await testMedication.locator('.delete-button').click();
    await page.locator('.confirm-button').click();
  });
});
