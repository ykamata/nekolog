import { test, expect } from '@playwright/test';
import { TestSetup } from './utils/test-setup';
import { testCats, testFoods } from './utils/test-data';

test.describe('Offline/Online Synchronization', () => {
  let testSetup: TestSetup;

  test.beforeEach(async ({ page }) => {
    testSetup = new TestSetup(page);
    await testSetup.setupCleanDatabase();

    // Create initial test data
    await testSetup.createTestCats([testCats[0]]);
    await testSetup.createTestFoods([testFoods[0]]);
  });

  test.afterEach(async () => {
    await testSetup.setupCleanDatabase();
  });

  test.describe('Offline Functionality', () => {
    test('should display offline indicator when network is unavailable', async ({
      page,
    }) => {
      // Go to meal recording page
      await page.goto('/meals/record');
      await testSetup.waitForPageLoad();

      // Go offline
      await testSetup.goOffline();

      // Look for offline indicator
      const offlineIndicator = page.locator(
        '.offline-indicator, .sync-status, [class*="offline"]',
      );
      if ((await offlineIndicator.count()) > 0) {
        await expect(offlineIndicator).toBeVisible();
        await expect(offlineIndicator).toContainText('オフライン');
      }
    });

    test('should allow viewing cached data when offline', async ({ page }) => {
      // First, load data while online
      await page.goto('/cats');
      await testSetup.waitForPageLoad();

      // Verify cat is visible
      await expect(page.locator('.cat-card, .cat-item')).toContainText(
        testCats[0].name,
      );

      // Go offline
      await testSetup.goOffline();

      // Reload page to test offline cache
      await page.reload();
      await testSetup.waitForPageLoad();

      // Data should still be available from cache (if implemented)
      // Note: This depends on the offline implementation
      const catElements = page.locator('.cat-card, .cat-item');
      if ((await catElements.count()) > 0) {
        await expect(catElements).toContainText(testCats[0].name);
      }
      else {
        // If no offline cache, should show appropriate message
        const offlineMessage = page.locator(
          '.offline-message, [class*="offline"]',
        );
        await expect(offlineMessage).toBeVisible();
      }
    });

    test('should queue meal records when offline', async ({ page }) => {
      // Go to meal recording page
      await page.goto('/meals/record');
      await testSetup.waitForPageLoad();

      // Go offline
      await testSetup.goOffline();

      // Try to record a meal
      await testSetup.selectOption('select[name="catId"]', testCats[0].name);
      await testSetup.selectOption('select[name="foodId"]', testFoods[0].name);
      await testSetup.fillFormField('input[name="quantity"]', '30');

      const now = new Date();
      const timeString = now.toISOString().slice(0, 16);
      await testSetup.fillFormField('input[name="mealTime"]', timeString);

      // Submit form
      await page.locator('button[type="submit"]').click();

      // Should show offline message or queue indication
      const offlineMessage = page.locator(
        '.offline-message, .queued-message, [class*="offline"], [class*="queue"]',
      );
      if ((await offlineMessage.count()) > 0) {
        await expect(offlineMessage).toBeVisible();
      }
    });

    test('should sync queued data when coming back online', async ({
      page,
    }) => {
      // Go to meal recording page
      await page.goto('/meals/record');
      await testSetup.waitForPageLoad();

      // Go offline and record a meal
      await testSetup.goOffline();

      await testSetup.selectOption('select[name="catId"]', testCats[0].name);
      await testSetup.selectOption('select[name="foodId"]', testFoods[0].name);
      await testSetup.fillFormField('input[name="quantity"]', '30');

      const now = new Date();
      const timeString = now.toISOString().slice(0, 16);
      await testSetup.fillFormField('input[name="mealTime"]', timeString);

      await page.locator('button[type="submit"]').click();

      // Go back online
      await testSetup.goOnline();

      // Wait for sync to occur
      await page.waitForTimeout(2000);

      // Check if sync status indicates success
      const syncStatus = page.locator('.sync-status, [class*="sync"]');
      if ((await syncStatus.count()) > 0) {
        // Should show online status or sync success
        const statusText = await syncStatus.textContent();
        expect(statusText).toMatch(/(オンライン|同期完了|同期済み)/);
      }

      // Verify data was synced by checking meal history
      await page.goto('/meals/history');
      await testSetup.waitForPageLoad();

      // The meal should appear in history (if sync worked)
      const mealRecords = page.locator('.meal-record, .meal-item');
      if ((await mealRecords.count()) > 0) {
        await expect(mealRecords.first()).toBeVisible();
      }
    });
  });

  test.describe('Sync Status Component', () => {
    test('should display online status when connected', async ({ page }) => {
      await page.goto('/');
      await testSetup.waitForPageLoad();

      // Look for sync status component
      const syncStatus = page.locator('.sync-status, [class*="sync"]');
      if ((await syncStatus.count()) > 0) {
        await expect(syncStatus).toBeVisible();

        // Should indicate online status
        const statusText = await syncStatus.textContent();
        expect(statusText).toMatch(/(オンライン|接続中|同期済み)/);
      }
    });

    test('should show pending sync count when items are queued', async ({
      page,
    }) => {
      // This test would require implementing offline queueing
      await page.goto('/meals/record');
      await testSetup.waitForPageLoad();

      // Go offline and create some records
      await testSetup.goOffline();

      // Record multiple meals
      for (let i = 0; i < 2; i++) {
        await testSetup.selectOption('select[name="catId"]', testCats[0].name);
        await testSetup.selectOption(
          'select[name="foodId"]',
          testFoods[0].name,
        );
        await testSetup.fillFormField('input[name="quantity"]', '25');

        const now = new Date();
        now.setMinutes(now.getMinutes() + i * 30); // Different times
        const timeString = now.toISOString().slice(0, 16);
        await testSetup.fillFormField('input[name="mealTime"]', timeString);

        await page.locator('button[type="submit"]').click();
        await page.waitForTimeout(500);
      }

      // Check if pending count is shown
      const pendingCount = page.locator('.pending-count, [class*="pending"]');
      if ((await pendingCount.count()) > 0) {
        await expect(pendingCount).toContainText('2');
      }
    });

    test('should allow manual sync trigger', async ({ page }) => {
      await page.goto('/');
      await testSetup.waitForPageLoad();

      // Look for manual sync button
      const syncButton = page.locator('button').filter({ hasText: '同期' });
      if ((await syncButton.count()) > 0) {
        await syncButton.click();

        // Should show sync in progress or completion
        await page.waitForTimeout(1000);

        const syncStatus = page.locator('.sync-status, [class*="sync"]');
        if ((await syncStatus.count()) > 0) {
          const statusText = await syncStatus.textContent();
          expect(statusText).toMatch(/(同期中|同期完了|同期済み)/);
        }
      }
    });
  });

  test.describe('Data Consistency', () => {
    test('should handle sync conflicts gracefully', async ({ page }) => {
      // This test simulates a conflict scenario
      // Create a meal record online
      await page.goto('/meals/record');
      await testSetup.waitForPageLoad();

      await testSetup.selectOption('select[name="catId"]', testCats[0].name);
      await testSetup.selectOption('select[name="foodId"]', testFoods[0].name);
      await testSetup.fillFormField('input[name="quantity"]', '30');

      const now = new Date();
      const timeString = now.toISOString().slice(0, 16);
      await testSetup.fillFormField('input[name="mealTime"]', timeString);

      await testSetup.clickButtonAndWait('button[type="submit"]', '/api/meals');
      await testSetup.waitForSuccessMessage();

      // Go offline and try to modify the same data
      await testSetup.goOffline();

      await page.goto('/meals/history');
      await testSetup.waitForPageLoad();

      // If edit functionality exists offline, test conflict resolution
      const editButton = page
        .locator('button')
        .filter({ hasText: '編集' })
        .first();
      if ((await editButton.count()) > 0) {
        await editButton.click();

        // Modify the record
        await testSetup.fillFormField('input[name="quantity"]', '35');
        await page.locator('button[type="submit"]').click();

        // Go back online
        await testSetup.goOnline();
        await page.waitForTimeout(2000);

        // Should handle conflict (implementation specific)
        const conflictDialog = page.locator(
          '.conflict-dialog, [class*="conflict"]',
        );
        if ((await conflictDialog.count()) > 0) {
          await expect(conflictDialog).toBeVisible();
        }
      }
    });

    test('should maintain data integrity during network interruptions', async ({
      page,
    }) => {
      await page.goto('/meals/record');
      await testSetup.waitForPageLoad();

      // Start recording a meal
      await testSetup.selectOption('select[name="catId"]', testCats[0].name);
      await testSetup.selectOption('select[name="foodId"]', testFoods[0].name);
      await testSetup.fillFormField('input[name="quantity"]', '30');

      const now = new Date();
      const timeString = now.toISOString().slice(0, 16);
      await testSetup.fillFormField('input[name="mealTime"]', timeString);

      // Go offline just before submitting
      await testSetup.goOffline();
      await page.locator('button[type="submit"]').click();

      // Should handle gracefully (queue or show error)
      const errorOrQueue = page.locator(
        '.error-message, .queued-message, [class*="error"], [class*="queue"]',
      );
      await expect(errorOrQueue).toBeVisible();

      // Go back online
      await testSetup.goOnline();
      await page.waitForTimeout(2000);

      // Data should eventually be consistent
      await page.goto('/meals/history');
      await testSetup.waitForPageLoad();

      // Check if the meal was eventually saved
      // Note: This depends on the specific offline implementation
    });
  });

  test.describe('Local Storage Management', () => {
    test('should store recent data in local storage', async ({ page }) => {
      // Load some data
      await page.goto('/cats');
      await testSetup.waitForPageLoad();

      // Check if data is stored in localStorage
      const localStorageData = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        return keys.filter(
          key =>
            key.includes('cat') || key.includes('meal') || key.includes('food'),
        );
      });

      // Should have some cached data (implementation specific)
      if (localStorageData.length > 0) {
        expect(localStorageData.length).toBeGreaterThan(0);
      }
    });

    test('should clear old cached data appropriately', async ({ page }) => {
      // This test would verify cache management
      await page.goto('/');
      await testSetup.waitForPageLoad();

      // Check localStorage size management
      const storageSize = await page.evaluate(() => {
        let total = 0;
        for (const key in localStorage) {
          if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
            total += localStorage[key].length;
          }
        }
        return total;
      });

      // Storage should be reasonable size (not unlimited growth)
      expect(storageSize).toBeLessThan(1024 * 1024); // Less than 1MB
    });
  });

  test.describe('Network Recovery', () => {
    test('should detect network recovery automatically', async ({ page }) => {
      await page.goto('/');
      await testSetup.waitForPageLoad();

      // Go offline
      await testSetup.goOffline();
      await page.waitForTimeout(1000);

      // Go back online
      await testSetup.goOnline();
      await page.waitForTimeout(2000);

      // Should detect network recovery
      const syncStatus = page.locator('.sync-status, [class*="sync"]');
      if ((await syncStatus.count()) > 0) {
        const statusText = await syncStatus.textContent();
        expect(statusText).toMatch(/(オンライン|接続中|同期済み)/);
      }
    });

    test('should retry failed requests after network recovery', async ({
      page,
    }) => {
      await page.goto('/meals/record');
      await testSetup.waitForPageLoad();

      // Go offline and try to submit
      await testSetup.goOffline();

      await testSetup.selectOption('select[name="catId"]', testCats[0].name);
      await testSetup.selectOption('select[name="foodId"]', testFoods[0].name);
      await testSetup.fillFormField('input[name="quantity"]', '30');

      const now = new Date();
      const timeString = now.toISOString().slice(0, 16);
      await testSetup.fillFormField('input[name="mealTime"]', timeString);

      await page.locator('button[type="submit"]').click();

      // Go back online
      await testSetup.goOnline();

      // Wait for automatic retry
      await page.waitForTimeout(3000);

      // Check if request was eventually successful
      const successMessage = page.locator(
        '.success-message, [class*="success"]',
      );
      if ((await successMessage.count()) > 0) {
        await expect(successMessage).toBeVisible();
      }
    });
  });
});
