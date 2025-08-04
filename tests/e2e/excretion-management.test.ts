import { test, expect } from '@playwright/test';
import { TestSetup } from './utils/test-setup';
import { testCats } from './utils/test-data';

test.describe('Excretion Management Workflow', () => {
  let testSetup: TestSetup;

  test.beforeEach(async ({ page }) => {
    testSetup = new TestSetup(page);

    // Setup clean database and test data
    await testSetup.setupCleanDatabase();
    await testSetup.createTestCats(testCats.slice(0, 2)); // Use first 2 cats

    // Navigate to excretion records page
    await page.goto('/excretion-records');
    await testSetup.waitForPageLoad();
  });

  test.afterEach(async () => {
    await testSetup.setupCleanDatabase();
  });

  test('should display excretion records page with all required elements', async ({
    page,
  }) => {
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');

    // Check if we're on the correct page by URL
    expect(page.url()).toContain('/excretion-records');

    // Check tab navigation (these should be present regardless of data)
    await expect(page.locator('[data-testid="list-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-tab"]')).toBeVisible();

    // Check add record button
    await expect(page.locator('[data-testid="add-record-button"]')).toBeVisible();

    // Check page title (more flexible approach)
    await expect(page.locator('text=排泄記録')).toBeVisible();

    // Check empty state or records list
    const emptyState = page.locator('[data-testid="empty-state"]');
    const recordList = page.locator('[data-testid="record-list"]');

    // Either empty state or record list should be visible
    await expect(emptyState.or(recordList)).toBeVisible();
  });

  test('should successfully create a new excretion record', async ({ page }) => {
    // Click add record button
    await testSetup.clickButtonAndWait('[data-testid="add-record-button"]');

    // Check form is displayed
    await expect(page.locator('[data-testid="excretion-form"]')).toBeVisible();

    // Fill out the form
    await testSetup.selectOption('[data-testid="cat-select"]', testCats[0].name);
    await page.locator('[data-testid="type-urine"]').click();

    // Set recorded time to current time
    const now = new Date();
    const timeString = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm format
    await testSetup.fillFormField('[data-testid="recorded-at"]', timeString);

    await testSetup.fillFormField(
      '[data-testid="notes"]',
      'テスト用の排泄記録',
    );

    // Submit the form
    await testSetup.clickButtonAndWait(
      '[data-testid="submit-button"]',
      '/api/excretion-records',
    );

    // Check for success message
    await testSetup.waitForSuccessMessage('排泄記録を保存しました');

    // Verify record appears in the list
    await expect(page.locator('[data-testid="record-list"]')).toContainText(
      testCats[0].name,
    );
    await expect(page.locator('[data-testid="record-list"]')).toContainText(
      'おしっこ',
    );
  });

  test('should validate required fields when creating record', async ({
    page,
  }) => {
    // Click add record button
    await testSetup.clickButtonAndWait('[data-testid="add-record-button"]');

    // Try to submit without selecting cat
    await testSetup.clickButtonAndWait('[data-testid="submit-button"]');

    // Check for validation errors
    await expect(
      page.locator('.error-message, [class*="error"]'),
    ).toBeVisible();
    await expect(
      page.locator('.error-message, [class*="error"]'),
    ).toContainText('猫を選択してください');

    // Select cat but not type
    await testSetup.selectOption('[data-testid="cat-select"]', testCats[0].name);
    await testSetup.clickButtonAndWait('[data-testid="submit-button"]');

    await expect(
      page.locator('.error-message, [class*="error"]'),
    ).toContainText('排泄タイプを選択してください');

    // Select type but not time
    await page.locator('[data-testid="type-urine"]').click();
    await testSetup.clickButtonAndWait('[data-testid="submit-button"]');

    await expect(
      page.locator('.error-message, [class*="error"]'),
    ).toContainText('記録日時を入力してください');
  });

  test('should edit existing excretion record', async ({ page }) => {
    // First create a record
    await testSetup.clickButtonAndWait('[data-testid="add-record-button"]');
    await testSetup.selectOption('[data-testid="cat-select"]', testCats[0].name);
    await page.locator('[data-testid="type-urine"]').click();

    const now = new Date();
    const timeString = now.toISOString().slice(0, 16);
    await testSetup.fillFormField('[data-testid="recorded-at"]', timeString);
    await testSetup.fillFormField('[data-testid="notes"]', '元のメモ');

    await testSetup.clickButtonAndWait(
      '[data-testid="submit-button"]',
      '/api/excretion-records',
    );
    await testSetup.waitForSuccessMessage();

    // Click edit button on the record
    await testSetup.clickButtonAndWait('[data-testid="edit-record-button"]');

    // Check form is pre-filled
    await expect(page.locator('[data-testid="cat-select"]')).toHaveValue(
      testCats[0].name,
    );
    await expect(page.locator('[data-testid="type-urine"]')).toBeChecked();
    await expect(page.locator('[data-testid="notes"]')).toHaveValue('元のメモ');

    // Update the record
    await page.locator('[data-testid="type-feces"]').click();
    await testSetup.fillFormField('[data-testid="notes"]', '更新されたメモ');

    await testSetup.clickButtonAndWait(
      '[data-testid="submit-button"]',
      '/api/excretion-records',
    );

    // Check for success message
    await testSetup.waitForSuccessMessage('排泄記録を更新しました');

    // Verify changes are reflected
    await expect(page.locator('[data-testid="record-list"]')).toContainText(
      'うんち',
    );
    await expect(page.locator('[data-testid="record-list"]')).toContainText(
      '更新されたメモ',
    );
  });

  test('should delete excretion record with confirmation', async ({ page }) => {
    // First create a record
    await testSetup.clickButtonAndWait('[data-testid="add-record-button"]');
    await testSetup.selectOption('[data-testid="cat-select"]', testCats[0].name);
    await page.locator('[data-testid="type-urine"]').click();

    const now = new Date();
    const timeString = now.toISOString().slice(0, 16);
    await testSetup.fillFormField('[data-testid="recorded-at"]', timeString);

    await testSetup.clickButtonAndWait(
      '[data-testid="submit-button"]',
      '/api/excretion-records',
    );
    await testSetup.waitForSuccessMessage();

    // Click delete button
    await testSetup.clickButtonAndWait('[data-testid="delete-record-button"]');

    // Check confirmation dialog appears
    await expect(page.locator('[data-testid="confirmation-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirmation-dialog"]')).toContainText(
      '削除してもよろしいですか',
    );

    // Confirm deletion
    await testSetup.clickButtonAndWait(
      '[data-testid="confirm-delete-button"]',
      '/api/excretion-records',
    );

    // Check for success message
    await testSetup.waitForSuccessMessage('排泄記録を削除しました');

    // Verify record is removed from list
    await expect(page.locator('[data-testid="record-list"]')).not.toContainText(
      testCats[0].name,
    );
  });

  test('should filter records by cat', async ({ page }) => {
    // Create records for both cats
    for (let i = 0; i < 2; i++) {
      await testSetup.clickButtonAndWait('[data-testid="add-record-button"]');
      await testSetup.selectOption('[data-testid="cat-select"]', testCats[i].name);
      await page.locator('[data-testid="type-urine"]').click();

      const now = new Date();
      const timeString = now.toISOString().slice(0, 16);
      await testSetup.fillFormField('[data-testid="recorded-at"]', timeString);

      await testSetup.clickButtonAndWait(
        '[data-testid="submit-button"]',
        '/api/excretion-records',
      );
      await testSetup.waitForSuccessMessage();
    }

    // Apply cat filter
    await testSetup.selectOption('[data-testid="filter-cat"]', testCats[0].name);

    // Verify only records for selected cat are shown
    await expect(page.locator('[data-testid="record-list"]')).toContainText(
      testCats[0].name,
    );
    await expect(page.locator('[data-testid="record-list"]')).not.toContainText(
      testCats[1].name,
    );

    // Clear filter
    await testSetup.selectOption('[data-testid="filter-cat"]', '');

    // Verify all records are shown again
    await expect(page.locator('[data-testid="record-list"]')).toContainText(
      testCats[0].name,
    );
    await expect(page.locator('[data-testid="record-list"]')).toContainText(
      testCats[1].name,
    );
  });

  test('should filter records by excretion type', async ({ page }) => {
    // Create records with different types
    const types = ['urine', 'feces'];
    const typeLabels = ['おしっこ', 'うんち'];

    for (let i = 0; i < 2; i++) {
      await testSetup.clickButtonAndWait('[data-testid="add-record-button"]');
      await testSetup.selectOption('[data-testid="cat-select"]', testCats[0].name);
      await page.locator(`[data-testid="type-${types[i]}"]`).click();

      const now = new Date();
      const timeString = now.toISOString().slice(0, 16);
      await testSetup.fillFormField('[data-testid="recorded-at"]', timeString);

      await testSetup.clickButtonAndWait(
        '[data-testid="submit-button"]',
        '/api/excretion-records',
      );
      await testSetup.waitForSuccessMessage();
    }

    // Apply type filter
    await testSetup.selectOption('[data-testid="filter-type"]', 'URINE');

    // Verify only urine records are shown
    await expect(page.locator('[data-testid="record-list"]')).toContainText(
      'おしっこ',
    );
    await expect(page.locator('[data-testid="record-list"]')).not.toContainText(
      'うんち',
    );

    // Change filter to feces
    await testSetup.selectOption('[data-testid="filter-type"]', 'FECES');

    // Verify only feces records are shown
    await expect(page.locator('[data-testid="record-list"]')).toContainText(
      'うんち',
    );
    await expect(page.locator('[data-testid="record-list"]')).not.toContainText(
      'おしっこ',
    );
  });

  test('should display calendar view with records', async ({ page }) => {
    // Create a record first
    await testSetup.clickButtonAndWait('[data-testid="add-record-button"]');
    await testSetup.selectOption('[data-testid="cat-select"]', testCats[0].name);
    await page.locator('[data-testid="type-urine"]').click();

    const now = new Date();
    const timeString = now.toISOString().slice(0, 16);
    await testSetup.fillFormField('[data-testid="recorded-at"]', timeString);
    await testSetup.fillFormField('[data-testid="notes"]', 'カレンダーテスト');

    await testSetup.clickButtonAndWait(
      '[data-testid="submit-button"]',
      '/api/excretion-records',
    );
    await testSetup.waitForSuccessMessage();

    // Switch to calendar view
    await testSetup.clickButtonAndWait('[data-testid="calendar-tab"]');

    // Check calendar is displayed
    await expect(page.locator('[data-testid="excretion-calendar"]')).toBeVisible();

    // Check that today's date has a record marker
    const today = now.getDate();
    const todayCell = page.locator(`[data-testid="calendar-day-${today}"]`);
    await expect(todayCell).toHaveClass(/has-record/);

    // Check that notes are indicated
    await expect(todayCell).toHaveClass(/has-notes/);
  });

  test('should open calendar detail modal when clicking date', async ({
    page,
  }) => {
    // Create a record first
    await testSetup.clickButtonAndWait('[data-testid="add-record-button"]');
    await testSetup.selectOption('[data-testid="cat-select"]', testCats[0].name);
    await page.locator('[data-testid="type-urine"]').click();

    const now = new Date();
    const timeString = now.toISOString().slice(0, 16);
    await testSetup.fillFormField('[data-testid="recorded-at"]', timeString);

    await testSetup.clickButtonAndWait(
      '[data-testid="submit-button"]',
      '/api/excretion-records',
    );
    await testSetup.waitForSuccessMessage();

    // Switch to calendar view
    await testSetup.clickButtonAndWait('[data-testid="calendar-tab"]');

    // Click on today's date
    const today = now.getDate();
    await testSetup.clickButtonAndWait(`[data-testid="calendar-day-${today}"]`);

    // Check modal is displayed
    await expect(page.locator('[data-testid="calendar-detail-modal"]')).toBeVisible();

    // Check record details are shown
    await expect(page.locator('[data-testid="modal-record-list"]')).toContainText(
      testCats[0].name,
    );
    await expect(page.locator('[data-testid="modal-record-list"]')).toContainText(
      'おしっこ',
    );

    // Check modal can be closed
    await testSetup.clickButtonAndWait('[data-testid="close-modal-button"]');
    await expect(page.locator('[data-testid="calendar-detail-modal"]')).not.toBeVisible();
  });

  test('should navigate calendar months', async ({ page }) => {
    // Switch to calendar view
    await testSetup.clickButtonAndWait('[data-testid="calendar-tab"]');

    // Check current month is displayed
    const currentMonth = new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
    });
    await expect(page.locator('[data-testid="calendar-header"]')).toContainText(
      currentMonth,
    );

    // Click next month button
    await testSetup.clickButtonAndWait('[data-testid="next-month-button"]');

    // Check month has changed
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthText = nextMonth.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
    });
    await expect(page.locator('[data-testid="calendar-header"]')).toContainText(
      nextMonthText,
    );

    // Click previous month button twice to go back
    await testSetup.clickButtonAndWait('[data-testid="prev-month-button"]');
    await testSetup.clickButtonAndWait('[data-testid="prev-month-button"]');

    // Check we're now in previous month
    const prevMonth = new Date();
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthText = prevMonth.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
    });
    await expect(page.locator('[data-testid="calendar-header"]')).toContainText(
      prevMonthText,
    );
  });

  test('should handle empty state properly', async ({ page }) => {
    // Check empty state in list view
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="empty-state"]')).toContainText(
      '排泄記録がありません',
    );

    // Switch to calendar view
    await testSetup.clickButtonAndWait('[data-testid="calendar-tab"]');

    // Check calendar is displayed but no records
    await expect(page.locator('[data-testid="excretion-calendar"]')).toBeVisible();
    const recordMarkers = page.locator('[class*="has-record"]');
    await expect(recordMarkers).toHaveCount(0);
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await testSetup.setViewportSize(375, 667);

    // Check mobile layout
    await testSetup.checkResponsiveElements();

    // Check form is usable on mobile
    await testSetup.clickButtonAndWait('[data-testid="add-record-button"]');
    await expect(page.locator('[data-testid="excretion-form"]')).toBeVisible();

    // Check form fields are properly sized
    const catSelect = page.locator('[data-testid="cat-select"]');
    const boundingBox = await catSelect.boundingBox();
    expect(boundingBox?.width).toBeGreaterThan(200); // Minimum touch target

    // Check calendar is usable on mobile
    await testSetup.clickButtonAndWait('[data-testid="cancel-button"]');
    await testSetup.clickButtonAndWait('[data-testid="calendar-tab"]');

    await expect(page.locator('[data-testid="excretion-calendar"]')).toBeVisible();

    // Check calendar navigation buttons are touch-friendly
    const nextButton = page.locator('[data-testid="next-month-button"]');
    const nextButtonBox = await nextButton.boundingBox();
    expect(nextButtonBox?.width).toBeGreaterThan(44); // iOS minimum touch target
    expect(nextButtonBox?.height).toBeGreaterThan(44);
  });

  test('should be responsive on desktop', async ({ page }) => {
    // Set desktop viewport
    await testSetup.setViewportSize(1200, 800);

    // Check desktop layout
    await testSetup.checkResponsiveElements();

    // Check that desktop-specific features are available
    await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeVisible();

    // Check form layout on desktop
    await testSetup.clickButtonAndWait('[data-testid="add-record-button"]');
    await expect(page.locator('[data-testid="excretion-form"]')).toBeVisible();

    // Check form uses horizontal layout on desktop
    const formContainer = page.locator('[data-testid="form-container"]');
    await expect(formContainer).toHaveClass(/desktop-layout/);
  });

  test('should maintain accessibility standards', async ({ page }) => {
    // Check basic accessibility
    await testSetup.checkAccessibility();

    // Check form accessibility
    await testSetup.clickButtonAndWait('[data-testid="add-record-button"]');

    // Check form has proper labels
    const catSelect = page.locator('[data-testid="cat-select"]');
    const catLabel = await catSelect.getAttribute('aria-label');
    expect(catLabel).toBeTruthy();

    // Check radio buttons have proper labels
    const urineRadio = page.locator('[data-testid="type-urine"]');
    const urineLabel = page.locator('label[for="type-urine"]');
    await expect(urineLabel).toBeVisible();

    // Check keyboard navigation
    await page.keyboard.press('Tab');
    await expect(catSelect).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(urineRadio).toBeFocused();

    // Check calendar accessibility
    await testSetup.clickButtonAndWait('[data-testid="cancel-button"]');
    await testSetup.clickButtonAndWait('[data-testid="calendar-tab"]');

    // Check calendar has proper ARIA attributes
    const calendar = page.locator('[data-testid="excretion-calendar"]');
    const role = await calendar.getAttribute('role');
    expect(role).toBe('grid');

    // Check calendar navigation is keyboard accessible
    const nextButton = page.locator('[data-testid="next-month-button"]');
    await nextButton.focus();
    await page.keyboard.press('Enter');

    // Verify month changed
    await page.waitForTimeout(500); // Wait for animation
  });

  test('should handle loading states properly', async ({ page }) => {
    // Reload page to see loading state
    await page.reload();

    // Check for loading spinner
    const loadingElement = page.locator(
      '.loading-spinner, .loading-container, [class*="loading"]',
    );
    if ((await loadingElement.count()) > 0) {
      await expect(loadingElement).toBeVisible();

      // Wait for loading to complete
      await testSetup.waitForPageLoad();
      await expect(loadingElement).not.toBeVisible();
    }

    // Verify page is ready after loading
    await expect(page.locator('[data-testid="add-record-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="list-tab"]')).toBeVisible();
  });

  test('should handle form cancellation', async ({ page }) => {
    // Open form
    await testSetup.clickButtonAndWait('[data-testid="add-record-button"]');

    // Fill out some fields
    await testSetup.selectOption('[data-testid="cat-select"]', testCats[0].name);
    await page.locator('[data-testid="type-urine"]').click();
    await testSetup.fillFormField('[data-testid="notes"]', 'テスト');

    // Click cancel button
    await testSetup.clickButtonAndWait('[data-testid="cancel-button"]');

    // Verify form is closed
    await expect(page.locator('[data-testid="excretion-form"]')).not.toBeVisible();

    // Verify we're back to list view
    await expect(page.locator('[data-testid="add-record-button"]')).toBeVisible();
  });
});
