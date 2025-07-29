import { test, expect } from '@playwright/test';

test.describe('Multi-Cat Medication Management', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we have multiple cats for testing
    await page.goto('/cats');
    await page.waitForSelector('.cats-container');

    // Check if we have at least 2 cats, if not create them
    const catCount = await page.locator('.cat-item').count();

    if (catCount < 2) {
      // Create first cat
      await page.locator('.add-cat-button').click();
      await page.locator('input[name="name"]').fill('テスト猫1');
      await page.locator('input[name="birthdate"]').fill('2020-01-01');
      await page.locator('input[name="weight"]').fill('4.5');
      await page.locator('.submit-button').click();

      // Create second cat
      await page.locator('.add-cat-button').click();
      await page.locator('input[name="name"]').fill('テスト猫2');
      await page.locator('input[name="birthdate"]').fill('2019-06-15');
      await page.locator('input[name="weight"]').fill('3.8');
      await page.locator('.submit-button').click();
    }

    // Navigate to medications page
    await page.goto('/medications');
    await page.waitForSelector('.medications-container');
  });

  test('should manage medications for multiple cats independently', async ({ page }) => {
    // Step 1: Create a medication that will be used by both cats
    await page.locator('.add-button').click();
    await page.locator('input[name="name"]').fill('共通薬');
    await page.locator('select[name="type"]').selectOption('MEDICINE');
    await page.locator('textarea[name="description"]').fill('両方の猫が使用する薬');
    await page.locator('input[name="dosage"]').fill('体重に応じて調整');
    await page.locator('.submit-button').click();

    // Step 2: Create medication records for each cat
    await page.goto('/medication-records');
    await page.waitForSelector('.records-container');

    // Record for first cat
    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ label: '共通薬' });
    await page.locator('select[name="catId"]').selectOption({ label: 'テスト猫1' });
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('input[name="administeredAt"]').fill('2024-01-15T08:00');
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('textarea[name="notes"]').fill('テスト猫1への投与 - 体重4.5kg');
    await page.locator('.submit-button').click();

    // Record for second cat (different dosage)
    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ label: '共通薬' });
    await page.locator('select[name="catId"]').selectOption({ label: 'テスト猫2' });
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('input[name="administeredAt"]').fill('2024-01-15T08:00');
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('textarea[name="notes"]').fill('テスト猫2への投与 - 体重3.8kg');
    await page.locator('.submit-button').click();

    // Step 3: Verify cat-specific filtering
    await page.locator('.cat-filter').selectOption({ label: 'テスト猫1' });
    await expect(page.locator('.record-item')).toHaveCount(1);
    await expect(page.locator('.record-item')).toContainText('テスト猫1への投与');
    await expect(page.locator('.record-item')).not.toContainText('テスト猫2への投与');

    await page.locator('.cat-filter').selectOption({ label: 'テスト猫2' });
    await expect(page.locator('.record-item')).toHaveCount(1);
    await expect(page.locator('.record-item')).toContainText('テスト猫2への投与');
    await expect(page.locator('.record-item')).not.toContainText('テスト猫1への投与');

    // Step 4: View combined records
    await page.locator('.cat-filter').selectOption({ value: 'all' });
    await expect(page.locator('.record-item')).toHaveCount(2);
    await expect(page.locator('.record-item')).toContainText('テスト猫1への投与');
    await expect(page.locator('.record-item')).toContainText('テスト猫2への投与');
  });

  test('should handle different medication schedules per cat', async ({ page }) => {
    // Create medications with different schedules
    await page.locator('.add-button').click();
    await page.locator('input[name="name"]').fill('猫1専用薬');
    await page.locator('select[name="type"]').selectOption('MEDICINE');
    await page.locator('textarea[name="description"]').fill('テスト猫1専用の薬');
    await page.locator('.submit-button').click();

    await page.locator('.add-button').click();
    await page.locator('input[name="name"]').fill('猫2専用薬');
    await page.locator('select[name="type"]').selectOption('SUPPLEMENT');
    await page.locator('textarea[name="description"]').fill('テスト猫2専用のサプリメント');
    await page.locator('.submit-button').click();

    // Set up different schedules
    const cat1Medication = page.locator('.medication-item').filter({ hasText: '猫1専用薬' });
    await cat1Medication.locator('.schedule-button').click();

    await page.locator('select[name="catId"]').selectOption({ label: 'テスト猫1' });
    await page.locator('select[name="frequency"]').selectOption('twice_daily');
    await page.locator('input[name="time1"]').fill('08:00');
    await page.locator('input[name="time2"]').fill('20:00');
    await page.locator('input[name="startDate"]').fill('2024-01-15');
    await page.locator('.submit-button').click();

    const cat2Medication = page.locator('.medication-item').filter({ hasText: '猫2専用薬' });
    await cat2Medication.locator('.schedule-button').click();

    await page.locator('select[name="catId"]').selectOption({ label: 'テスト猫2' });
    await page.locator('select[name="frequency"]').selectOption('daily');
    await page.locator('input[name="time1"]').fill('12:00');
    await page.locator('input[name="startDate"]').fill('2024-01-15');
    await page.locator('.submit-button').click();

    // Check reminders page
    await page.goto('/medication-reminders');
    await page.waitForSelector('.reminders-container');

    // Should see different reminders for each cat
    await expect(page.locator('.reminder-item').filter({ hasText: '猫1専用薬' })).toHaveCount(2); // Twice daily
    await expect(page.locator('.reminder-item').filter({ hasText: '猫2専用薬' })).toHaveCount(1); // Daily

    // Filter by cat
    await page.locator('.cat-filter').selectOption({ label: 'テスト猫1' });
    await expect(page.locator('.reminder-item')).toHaveCount(2);
    await expect(page.locator('.reminder-item')).toContainText('猫1専用薬');

    await page.locator('.cat-filter').selectOption({ label: 'テスト猫2' });
    await expect(page.locator('.reminder-item')).toHaveCount(1);
    await expect(page.locator('.reminder-item')).toContainText('猫2専用薬');
  });

  test('should display multi-cat dashboard with individual status', async ({ page }) => {
    // Create medication records for both cats with different statuses
    await page.goto('/medication-records');
    await page.waitForSelector('.records-container');

    // Create administered record for cat 1
    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
    await page.locator('select[name="catId"]').selectOption({ label: 'テスト猫1' });
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('input[name="administeredAt"]').fill('2024-01-15T08:00');
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('.submit-button').click();

    // Create pending record for cat 2
    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
    await page.locator('select[name="catId"]').selectOption({ label: 'テスト猫2' });
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('input[name="administeredAt"]').fill('2024-01-15T08:00');
    await page.locator('select[name="status"]').selectOption('PENDING');
    await page.locator('.submit-button').click();

    // Go to multi-cat dashboard
    await page.goto('/medication-dashboard');
    await page.waitForSelector('.dashboard-container');

    // Should show status for each cat
    const cat1Dashboard = page.locator('.cat-dashboard').filter({ hasText: 'テスト猫1' });
    const cat2Dashboard = page.locator('.cat-dashboard').filter({ hasText: 'テスト猫2' });

    await expect(cat1Dashboard.locator('.status-summary')).toContainText('投与済み: 1');
    await expect(cat2Dashboard.locator('.status-summary')).toContainText('予定: 1');

    // Should show different status indicators
    await expect(cat1Dashboard.locator('.status-indicator.administered')).toBeVisible();
    await expect(cat2Dashboard.locator('.status-indicator.pending')).toBeVisible();

    // Click on cat dashboard to see details
    await cat1Dashboard.click();
    await expect(page.locator('.cat-details')).toContainText('テスト猫1');
    await expect(page.locator('.recent-records')).toContainText('投与済み');

    // Switch to cat 2
    await cat2Dashboard.click();
    await expect(page.locator('.cat-details')).toContainText('テスト猫2');
    await expect(page.locator('.recent-records')).toContainText('予定');
  });

  test('should handle medication calendar with multiple cats', async ({ page }) => {
    // Create records for both cats on the same day
    await page.goto('/medication-records');
    await page.waitForSelector('.records-container');

    const testDate = '2024-01-16';

    // Record for cat 1 - morning
    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
    await page.locator('select[name="catId"]').selectOption({ label: 'テスト猫1' });
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('input[name="administeredAt"]').fill(`${testDate}T08:00`);
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('textarea[name="notes"]').fill('猫1朝の薬');
    await page.locator('.submit-button').click();

    // Record for cat 2 - morning
    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
    await page.locator('select[name="catId"]').selectOption({ label: 'テスト猫2' });
    await page.locator('input[name="quantity"]').fill('2');
    await page.locator('input[name="administeredAt"]').fill(`${testDate}T08:30`);
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('textarea[name="notes"]').fill('猫2朝の薬');
    await page.locator('.submit-button').click();

    // Record for cat 1 - evening
    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
    await page.locator('select[name="catId"]').selectOption({ label: 'テスト猫1' });
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('input[name="administeredAt"]').fill(`${testDate}T20:00`);
    await page.locator('select[name="status"]').selectOption('PENDING');
    await page.locator('textarea[name="notes"]').fill('猫1夜の薬');
    await page.locator('.submit-button').click();

    // Go to calendar
    await page.goto('/medication-calendar');
    await page.waitForSelector('.calendar-container');

    // Navigate to January 2024
    while (!(await page.locator('.calendar-title').textContent())?.includes('2024年1月')) {
      await page.locator('.calendar-nav-button').first().click();
      await page.waitForTimeout(300);
    }

    // Click on day 16
    const day16 = page.locator('.calendar-day.current-month').filter({ hasText: '16' }).first();
    await day16.click();

    // Should show all records
    await expect(page.locator('.day-records .record-item')).toHaveCount(3);
    await expect(page.locator('.day-records')).toContainText('猫1朝の薬');
    await expect(page.locator('.day-records')).toContainText('猫2朝の薬');
    await expect(page.locator('.day-records')).toContainText('猫1夜の薬');

    // Filter by cat 1
    await page.locator('.cat-filter').selectOption({ label: 'テスト猫1' });
    await expect(page.locator('.day-records .record-item')).toHaveCount(2);
    await expect(page.locator('.day-records')).toContainText('猫1朝の薬');
    await expect(page.locator('.day-records')).toContainText('猫1夜の薬');
    await expect(page.locator('.day-records')).not.toContainText('猫2朝の薬');

    // Filter by cat 2
    await page.locator('.cat-filter').selectOption({ label: 'テスト猫2' });
    await expect(page.locator('.day-records .record-item')).toHaveCount(1);
    await expect(page.locator('.day-records')).toContainText('猫2朝の薬');
    await expect(page.locator('.day-records')).not.toContainText('猫1朝の薬');
    await expect(page.locator('.day-records')).not.toContainText('猫1夜の薬');

    // Check calendar day indicators
    await page.locator('.cat-filter').selectOption({ value: 'all' });
    await expect(day16).toHaveClass(/has-administered/);
    await expect(day16).toHaveClass(/has-pending/);
    await expect(day16).toHaveClass(/multi-cat/);
  });

  test('should handle medication statistics across multiple cats', async ({ page }) => {
    // Create various records for statistical analysis
    await page.goto('/medication-records');
    await page.waitForSelector('.records-container');

    const records = [
      { cat: 'テスト猫1', date: '2024-01-15T08:00', status: 'ADMINISTERED', quantity: 1 },
      { cat: 'テスト猫1', date: '2024-01-15T20:00', status: 'ADMINISTERED', quantity: 1 },
      { cat: 'テスト猫1', date: '2024-01-16T08:00', status: 'SKIPPED', quantity: 0 },
      { cat: 'テスト猫2', date: '2024-01-15T08:00', status: 'ADMINISTERED', quantity: 2 },
      { cat: 'テスト猫2', date: '2024-01-16T08:00', status: 'ADMINISTERED', quantity: 2 },
      { cat: 'テスト猫2', date: '2024-01-17T08:00', status: 'PENDING', quantity: 2 },
    ];

    for (const record of records) {
      await page.locator('.add-record-button').click();
      await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
      await page.locator('select[name="catId"]').selectOption({ label: record.cat });
      await page.locator('input[name="quantity"]').fill(record.quantity.toString());
      await page.locator('input[name="administeredAt"]').fill(record.date);
      await page.locator('select[name="status"]').selectOption(record.status);
      await page.locator('.submit-button').click();
      await page.waitForTimeout(500);
    }

    // Go to analytics page
    await page.goto('/analytics');
    await page.waitForSelector('.analytics-container');

    // Check overall statistics
    await expect(page.locator('.total-records')).toContainText('6');
    await expect(page.locator('.administered-count')).toContainText('4');
    await expect(page.locator('.pending-count')).toContainText('1');
    await expect(page.locator('.skipped-count')).toContainText('1');

    // Check cat-specific statistics
    const cat1Stats = page.locator('.cat-stats').filter({ hasText: 'テスト猫1' });
    const cat2Stats = page.locator('.cat-stats').filter({ hasText: 'テスト猫2' });

    await expect(cat1Stats.locator('.administered-count')).toContainText('2');
    await expect(cat1Stats.locator('.skipped-count')).toContainText('1');
    await expect(cat1Stats.locator('.total-quantity')).toContainText('2');

    await expect(cat2Stats.locator('.administered-count')).toContainText('2');
    await expect(cat2Stats.locator('.pending-count')).toContainText('1');
    await expect(cat2Stats.locator('.total-quantity')).toContainText('6');

    // Check compliance rates
    await expect(cat1Stats.locator('.compliance-rate')).toContainText('67%'); // 2/3 administered
    await expect(cat2Stats.locator('.compliance-rate')).toContainText('67%'); // 2/3 administered

    // Check medication usage chart
    await expect(page.locator('.usage-chart')).toBeVisible();
    await expect(page.locator('.chart-legend')).toContainText('テスト猫1');
    await expect(page.locator('.chart-legend')).toContainText('テスト猫2');
  });

  test('should handle bulk operations for multiple cats', async ({ page }) => {
    // Go to medication records
    await page.goto('/medication-records');
    await page.waitForSelector('.records-container');

    // Create multiple records
    const testDate = '2024-01-18';

    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
    await page.locator('select[name="catId"]').selectOption({ label: 'テスト猫1' });
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('input[name="administeredAt"]').fill(`${testDate}T08:00`);
    await page.locator('select[name="status"]').selectOption('PENDING');
    await page.locator('.submit-button').click();

    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
    await page.locator('select[name="catId"]').selectOption({ label: 'テスト猫2' });
    await page.locator('input[name="quantity"]').fill('2');
    await page.locator('input[name="administeredAt"]').fill(`${testDate}T08:00`);
    await page.locator('select[name="status"]').selectOption('PENDING');
    await page.locator('.submit-button').click();

    // Enable bulk selection mode
    await page.locator('.bulk-actions-toggle').click();
    await expect(page.locator('.bulk-actions-bar')).toBeVisible();

    // Select both records
    await page.locator('.record-item').first().locator('.bulk-checkbox').check();
    await page.locator('.record-item').last().locator('.bulk-checkbox').check();

    // Bulk update status to administered
    await page.locator('.bulk-update-status').click();
    await page.locator('.bulk-status-select').selectOption('ADMINISTERED');
    await page.locator('.apply-bulk-update').click();

    // Confirm bulk update
    await expect(page.locator('.confirm-dialog')).toBeVisible();
    await expect(page.locator('.confirm-message')).toContainText('2件の記録を更新しますか？');
    await page.locator('.confirm-button').click();

    // Verify both records are updated
    await expect(page.locator('.status-badge')).toHaveCount(2);
    await expect(page.locator('.status-badge')).toContainText('投与済み');

    // Test bulk delete
    await page.locator('.record-item').first().locator('.bulk-checkbox').check();
    await page.locator('.bulk-delete').click();

    await expect(page.locator('.confirm-dialog')).toBeVisible();
    await expect(page.locator('.confirm-message')).toContainText('1件の記録を削除しますか？');
    await page.locator('.confirm-button').click();

    // Verify record is deleted
    await expect(page.locator('.record-item')).toHaveCount(1);
  });

  test('should export multi-cat medication data', async ({ page }) => {
    // Create some test data
    await page.goto('/medication-records');
    await page.waitForSelector('.records-container');

    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
    await page.locator('select[name="catId"]').selectOption({ label: 'テスト猫1' });
    await page.locator('input[name="quantity"]').fill('1');
    await page.locator('input[name="administeredAt"]').fill('2024-01-19T08:00');
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('.submit-button').click();

    await page.locator('.add-record-button').click();
    await page.locator('select[name="medicationId"]').selectOption({ index: 1 });
    await page.locator('select[name="catId"]').selectOption({ label: 'テスト猫2' });
    await page.locator('input[name="quantity"]').fill('2');
    await page.locator('input[name="administeredAt"]').fill('2024-01-19T08:00');
    await page.locator('select[name="status"]').selectOption('ADMINISTERED');
    await page.locator('.submit-button').click();

    // Go to export page
    await page.goto('/export');
    await page.waitForSelector('.export-container');

    // Configure export options
    await page.locator('.export-type').selectOption('medication-records');
    await page.locator('.date-range-start').fill('2024-01-01');
    await page.locator('.date-range-end').fill('2024-01-31');
    await page.locator('.include-all-cats').check();

    // Start export
    const downloadPromise = page.waitForEvent('download');
    await page.locator('.export-button').click();
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toContain('medication-records');
    expect(download.suggestedFilename()).toContain('2024-01');

    // Test cat-specific export
    await page.locator('.include-all-cats').uncheck();
    await page.locator('.cat-selector').selectOption({ label: 'テスト猫1' });

    const catSpecificDownloadPromise = page.waitForEvent('download');
    await page.locator('.export-button').click();
    const catSpecificDownload = await catSpecificDownloadPromise;

    expect(catSpecificDownload.suggestedFilename()).toContain('テスト猫1');
  });
});
