import { test, expect } from '@playwright/test';
import { TestSetup } from './utils/test-setup';
import { testCats, testFoods } from './utils/test-data';

test.describe('Cat and Food Management', () => {
  let testSetup: TestSetup;

  test.beforeEach(async ({ page }) => {
    testSetup = new TestSetup(page);
    await testSetup.setupCleanDatabase();
  });

  test.afterEach(async () => {
    await testSetup.setupCleanDatabase();
  });

  test.describe('Cat Management', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/cats');
      await testSetup.waitForPageLoad();
    });

    test('should display empty state when no cats exist', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('猫の管理');

      // Check stats show zero
      const catCountElement = page.locator('.stat-value').first();
      await expect(catCountElement).toContainText('0');

      // Check for empty state or add button
      const addButton = page
        .locator('button, a')
        .filter({ hasText: '猫を追加' });
      await expect(addButton).toBeVisible();
    });

    test('should successfully add a new cat', async ({ page }) => {
      // Click add cat button
      await testSetup.clickButtonAndWait('button:has-text("猫を追加")');

      // Fill out cat form in modal
      await testSetup.fillFormField('input[name="name"]', testCats[0].name);

      if (testCats[0].birthdate) {
        await testSetup.fillFormField(
          'input[name="birthdate"]',
          testCats[0].birthdate,
        );
      }

      if (testCats[0].weight) {
        await testSetup.fillFormField(
          'input[name="weight"]',
          testCats[0].weight.toString(),
        );
      }

      // Submit form
      await testSetup.clickButtonAndWait('button[type="submit"]', '/api/cats');

      // Verify cat appears in list
      await expect(page.locator('.cat-card, .cat-item')).toContainText(
        testCats[0].name,
      );

      // Check stats updated
      const catCountElement = page.locator('.stat-value').first();
      await expect(catCountElement).toContainText('1');
    });

    test('should validate required fields when adding cat', async ({
      page,
    }) => {
      // Click add cat button
      await testSetup.clickButtonAndWait('button:has-text("猫を追加")');

      // Try to submit without name
      await testSetup.clickButtonAndWait('button[type="submit"]');

      // Check for validation error
      await expect(
        page.locator('.error-message, [class*="error"]'),
      ).toContainText('名前は必須です');
    });

    test('should successfully edit an existing cat', async ({ page }) => {
      // First create a cat
      await testSetup.createTestCats([testCats[0]]);
      await page.reload();
      await testSetup.waitForPageLoad();

      // Click edit button
      const editButton = page
        .locator('button')
        .filter({ hasText: '編集' })
        .first();
      await editButton.click();

      // Update cat name
      const updatedName = testCats[0].name + ' (更新済み)';
      await testSetup.fillFormField('input[name="name"]', updatedName);

      // Submit form
      await testSetup.clickButtonAndWait('button[type="submit"]', '/api/cats/');

      // Verify updated name appears
      await expect(page.locator('.cat-card, .cat-item')).toContainText(
        updatedName,
      );
    });

    test('should successfully delete a cat with confirmation', async ({
      page,
    }) => {
      // First create a cat
      await testSetup.createTestCats([testCats[0]]);
      await page.reload();
      await testSetup.waitForPageLoad();

      // Click delete button
      const deleteButton = page
        .locator('button')
        .filter({ hasText: '削除' })
        .first();
      await deleteButton.click();

      // Confirm deletion in dialog
      const confirmButton = page
        .locator('button')
        .filter({ hasText: '削除' })
        .last();
      await testSetup.clickButtonAndWait(
        confirmButton.locator('xpath=.'),
        '/api/cats/',
      );

      // Verify cat is removed
      await expect(page.locator('.cat-card, .cat-item')).not.toContainText(
        testCats[0].name,
      );

      // Check stats updated
      const catCountElement = page.locator('.stat-value').first();
      await expect(catCountElement).toContainText('0');
    });

    test('should display multiple cats in grid/list view', async ({ page }) => {
      // Create multiple cats
      await testSetup.createTestCats(testCats);
      await page.reload();
      await testSetup.waitForPageLoad();

      // Verify all cats are displayed
      for (const cat of testCats) {
        await expect(page.locator('.cat-card, .cat-item')).toContainText(
          cat.name,
        );
      }

      // Test view mode toggle if available
      const listViewButton = page.locator('button[title="リスト表示"]');
      if ((await listViewButton.count()) > 0) {
        await listViewButton.click();
        // Verify layout changed (implementation specific)
      }

      const gridViewButton = page.locator('button[title="グリッド表示"]');
      if ((await gridViewButton.count()) > 0) {
        await gridViewButton.click();
        // Verify layout changed (implementation specific)
      }
    });
  });

  test.describe('Food Management', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/foods');
      await testSetup.waitForPageLoad();
    });

    test('should display empty state when no foods exist', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('フード管理');

      // Check stats show zero
      const totalCountElement = page
        .locator('.stat-item')
        .filter({ hasText: '総フード数' })
        .locator('.stat-value');
      await expect(totalCountElement).toContainText('0');

      // Check for add button
      const addButton = page
        .locator('button, a')
        .filter({ hasText: 'フードを追加' });
      await expect(addButton).toBeVisible();
    });

    test('should successfully add a new food', async ({ page }) => {
      // Click add food button
      await testSetup.clickButtonAndWait('button:has-text("フードを追加")');

      // Fill out food form
      await testSetup.fillFormField('input[name="name"]', testFoods[0].name);
      await testSetup.selectOption('select[name="type"]', testFoods[0].type);

      if (testFoods[0].brand) {
        await testSetup.fillFormField(
          'input[name="brand"]',
          testFoods[0].brand,
        );
      }

      await testSetup.fillFormField(
        'input[name="caloriesPerGram"]',
        testFoods[0].caloriesPerGram.toString(),
      );

      if (testFoods[0].pricePerUnit) {
        await testSetup.fillFormField(
          'input[name="pricePerUnit"]',
          testFoods[0].pricePerUnit.toString(),
        );
      }

      // Submit form
      await testSetup.clickButtonAndWait('button[type="submit"]', '/api/foods');

      // Verify food appears in list
      await expect(page.locator('.food-card, .food-item')).toContainText(
        testFoods[0].name,
      );

      // Check stats updated
      const totalCountElement = page
        .locator('.stat-item')
        .filter({ hasText: '総フード数' })
        .locator('.stat-value');
      await expect(totalCountElement).toContainText('1');
    });

    test('should validate required fields when adding food', async ({
      page,
    }) => {
      // Click add food button
      await testSetup.clickButtonAndWait('button:has-text("フードを追加")');

      // Try to submit without required fields
      await testSetup.clickButtonAndWait('button[type="submit"]');

      // Check for validation errors
      await expect(
        page.locator('.error-message, [class*="error"]'),
      ).toBeVisible();
    });

    test('should filter foods by type', async ({ page }) => {
      // Create foods of different types
      await testSetup.createTestFoods(testFoods);
      await page.reload();
      await testSetup.waitForPageLoad();

      // Test DRY filter
      const dryButton = page.locator('button').filter({ hasText: 'ドライ' });
      await dryButton.click();

      // Verify only dry foods are shown
      const dryFoods = testFoods.filter(f => f.type === 'DRY');
      for (const food of dryFoods) {
        await expect(page.locator('.food-card, .food-item')).toContainText(
          food.name,
        );
      }

      // Test WET filter
      const wetButton = page.locator('button').filter({ hasText: 'ウェット' });
      await wetButton.click();

      // Verify only wet foods are shown
      const wetFoods = testFoods.filter(f => f.type === 'WET');
      for (const food of wetFoods) {
        await expect(page.locator('.food-card, .food-item')).toContainText(
          food.name,
        );
      }

      // Test ALL filter
      const allButton = page.locator('button').filter({ hasText: 'すべて' });
      await allButton.click();

      // Verify all foods are shown
      for (const food of testFoods) {
        await expect(page.locator('.food-card, .food-item')).toContainText(
          food.name,
        );
      }
    });

    test('should search foods by name and brand', async ({ page }) => {
      // Create test foods
      await testSetup.createTestFoods(testFoods);
      await page.reload();
      await testSetup.waitForPageLoad();

      // Search by food name
      const searchInput = page.locator('input[placeholder*="検索"]');
      await searchInput.fill(testFoods[0].name.substring(0, 5));

      // Verify filtered results
      await expect(page.locator('.food-card, .food-item')).toContainText(
        testFoods[0].name,
      );

      // Clear search
      const clearButton = page.locator('.search-clear, button:has-text("✕")');
      if ((await clearButton.count()) > 0) {
        await clearButton.click();

        // Verify all foods are shown again
        for (const food of testFoods) {
          await expect(page.locator('.food-card, .food-item')).toContainText(
            food.name,
          );
        }
      }
    });

    test('should display food statistics correctly', async ({ page }) => {
      // Create mixed food types
      await testSetup.createTestFoods(testFoods);
      await page.reload();
      await testSetup.waitForPageLoad();

      // Check total count
      const totalCount = testFoods.length;
      const totalCountElement = page
        .locator('.stat-item')
        .filter({ hasText: '総フード数' })
        .locator('.stat-value');
      await expect(totalCountElement).toContainText(totalCount.toString());

      // Check dry food count
      const dryCount = testFoods.filter(f => f.type === 'DRY').length;
      const dryCountElement = page
        .locator('.stat-item')
        .filter({ hasText: 'ドライフード' })
        .locator('.stat-value');
      await expect(dryCountElement).toContainText(dryCount.toString());

      // Check wet food count
      const wetCount = testFoods.filter(f => f.type === 'WET').length;
      const wetCountElement = page
        .locator('.stat-item')
        .filter({ hasText: 'ウェットフード' })
        .locator('.stat-value');
      await expect(wetCountElement).toContainText(wetCount.toString());
    });

    test('should successfully edit an existing food', async ({ page }) => {
      // First create a food
      await testSetup.createTestFoods([testFoods[0]]);
      await page.reload();
      await testSetup.waitForPageLoad();

      // Click edit button
      const editButton = page
        .locator('button')
        .filter({ hasText: '編集' })
        .first();
      await editButton.click();

      // Update food name
      const updatedName = testFoods[0].name + ' (更新済み)';
      await testSetup.fillFormField('input[name="name"]', updatedName);

      // Submit form
      await testSetup.clickButtonAndWait(
        'button[type="submit"]',
        '/api/foods/',
      );

      // Verify updated name appears
      await expect(page.locator('.food-card, .food-item')).toContainText(
        updatedName,
      );
    });

    test('should successfully delete a food with confirmation', async ({
      page,
    }) => {
      // First create a food
      await testSetup.createTestFoods([testFoods[0]]);
      await page.reload();
      await testSetup.waitForPageLoad();

      // Click delete button
      const deleteButton = page
        .locator('button')
        .filter({ hasText: '削除' })
        .first();
      await deleteButton.click();

      // Confirm deletion in dialog
      const confirmButton = page
        .locator('button')
        .filter({ hasText: '削除' })
        .last();
      await testSetup.clickButtonAndWait(
        confirmButton.locator('xpath=.'),
        '/api/foods/',
      );

      // Verify food is removed
      await expect(page.locator('.food-card, .food-item')).not.toContainText(
        testFoods[0].name,
      );

      // Check stats updated
      const totalCountElement = page
        .locator('.stat-item')
        .filter({ hasText: '総フード数' })
        .locator('.stat-value');
      await expect(totalCountElement).toContainText('0');
    });
  });

  test.describe('Integration Tests', () => {
    test('should maintain data consistency between cat and food management', async ({
      page,
    }) => {
      // Create cats and foods
      await testSetup.createTestCats([testCats[0]]);
      await testSetup.createTestFoods([testFoods[0]]);

      // Navigate to meal recording to verify data is available
      await page.goto('/meals/record');
      await testSetup.waitForPageLoad();

      // Verify cat and food are available in dropdowns
      const catSelect = page.locator('select[name="catId"]');
      await expect(catSelect.locator('option')).toContainText(testCats[0].name);

      const foodSelect = page.locator('select[name="foodId"]');
      await expect(foodSelect.locator('option')).toContainText(
        testFoods[0].name,
      );
    });

    test('should handle navigation between management pages', async ({
      page,
    }) => {
      // Start at cats page
      await page.goto('/cats');
      await testSetup.waitForPageLoad();
      await expect(page.locator('h1')).toContainText('猫の管理');

      // Navigate to foods page via quick action
      const foodsLink = page.locator('a[href="/foods"]');
      if ((await foodsLink.count()) > 0) {
        await foodsLink.click();
        await testSetup.waitForPageLoad();
        await expect(page.locator('h1')).toContainText('フード管理');
      }

      // Navigate to meal recording via quick action
      const mealRecordLink = page.locator('a[href="/meals/record"]');
      if ((await mealRecordLink.count()) > 0) {
        await mealRecordLink.click();
        await testSetup.waitForPageLoad();
        await expect(page.locator('h1')).toContainText('食事記録');
      }
    });
  });
});
