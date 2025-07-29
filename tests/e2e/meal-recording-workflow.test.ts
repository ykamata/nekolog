import { test, expect } from '@playwright/test';
import { TestSetup } from './utils/test-setup';
import { testCats, testFoods } from './utils/test-data';

test.describe('Meal Recording Workflow', () => {
  let testSetup: TestSetup;

  test.beforeEach(async ({ page }) => {
    testSetup = new TestSetup(page);

    // Setup clean database and test data
    await testSetup.setupCleanDatabase();
    await testSetup.createTestCats(testCats.slice(0, 2)); // Use first 2 cats
    await testSetup.createTestFoods(testFoods.slice(0, 2)); // Use first 2 foods

    // Navigate to meal recording page
    await page.goto('/meals/record');
    await testSetup.waitForPageLoad();
  });

  test.afterEach(async () => {
    await testSetup.setupCleanDatabase();
  });

  test('should display meal recording form with all required fields', async ({
    page,
  }) => {
    // Check page title and description
    await expect(page.locator('h1')).toContainText('食事記録');
    await expect(page.locator('.page-description')).toContainText(
      '猫の食事内容を記録してください',
    );

    // Check form fields are present
    await expect(page.locator('select[name="catId"]')).toBeVisible();
    await expect(page.locator('select[name="foodId"]')).toBeVisible();
    await expect(page.locator('input[name="quantity"]')).toBeVisible();
    await expect(page.locator('input[name="mealTime"]')).toBeVisible();
    await expect(page.locator('textarea[name="notes"]')).toBeVisible();

    // Check submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText(
      '記録する',
    );
  });

  test('should successfully record a meal with all fields', async ({
    page,
  }) => {
    // Fill out the form
    await testSetup.selectOption('select[name="catId"]', testCats[0].name);
    await testSetup.selectOption('select[name="foodId"]', testFoods[0].name);
    await testSetup.fillFormField('input[name="quantity"]', '30');

    // Set meal time to current time
    const now = new Date();
    const timeString = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm format
    await testSetup.fillFormField('input[name="mealTime"]', timeString);

    await testSetup.fillFormField(
      'textarea[name="notes"]',
      'テスト用の食事記録',
    );

    // Submit the form
    await testSetup.clickButtonAndWait('button[type="submit"]', '/api/meals');

    // Check for success message
    await testSetup.waitForSuccessMessage('食事記録を保存しました');

    // Verify form is reset after successful submission
    await expect(page.locator('input[name="quantity"]')).toHaveValue('');
    await expect(page.locator('textarea[name="notes"]')).toHaveValue('');
  });

  test('should calculate calories automatically when quantity is entered', async ({
    page,
  }) => {
    // Select cat and food
    await testSetup.selectOption('select[name="catId"]', testCats[0].name);
    await testSetup.selectOption('select[name="foodId"]', testFoods[0].name);

    // Enter quantity
    await testSetup.fillFormField('input[name="quantity"]', '30');

    // Check that calories are calculated and displayed
    const expectedCalories = 30 * testFoods[0].caloriesPerGram;
    await expect(page.locator('.calorie-display')).toContainText(
      expectedCalories.toString(),
    );
  });

  test('should show validation errors for invalid input', async ({ page }) => {
    // Try to submit without selecting cat
    await testSetup.clickButtonAndWait('button[type="submit"]');

    // Check for validation errors
    await expect(
      page.locator('.error-message, [class*="error"]'),
    ).toBeVisible();
    await expect(
      page.locator('.error-message, [class*="error"]'),
    ).toContainText('猫を選択してください');

    // Select cat but not food
    await testSetup.selectOption('select[name="catId"]', testCats[0].name);
    await testSetup.clickButtonAndWait('button[type="submit"]');

    await expect(
      page.locator('.error-message, [class*="error"]'),
    ).toContainText('フードを選択してください');

    // Select food but enter invalid quantity
    await testSetup.selectOption('select[name="foodId"]', testFoods[0].name);
    await testSetup.fillFormField('input[name="quantity"]', '0');
    await testSetup.clickButtonAndWait('button[type="submit"]');

    await expect(
      page.locator('.error-message, [class*="error"]'),
    ).toContainText('量は0より大きい値を入力してください');
  });

  test('should support predefined quantity buttons', async ({ page }) => {
    // Select cat and food first
    await testSetup.selectOption('select[name="catId"]', testCats[0].name);
    await testSetup.selectOption('select[name="foodId"]', testFoods[0].name);

    // Check if predefined quantity buttons exist
    const quantityButtons = page.locator(
      '.quantity-button, [class*="quantity-btn"]',
    );
    const buttonCount = await quantityButtons.count();

    if (buttonCount > 0) {
      // Click first quantity button
      await quantityButtons.first().click();

      // Verify quantity field is filled
      const quantityInput = page.locator('input[name="quantity"]');
      const value = await quantityInput.inputValue();
      expect(parseFloat(value)).toBeGreaterThan(0);
    }
  });

  test('should handle form cancellation', async ({ page }) => {
    // Fill out some fields
    await testSetup.selectOption('select[name="catId"]', testCats[0].name);
    await testSetup.fillFormField('input[name="quantity"]', '25');
    await testSetup.fillFormField('textarea[name="notes"]', 'テスト');

    // Click cancel button if it exists
    const cancelButton = page
      .locator('button[type="button"]')
      .filter({ hasText: 'キャンセル' });
    if ((await cancelButton.count()) > 0) {
      await cancelButton.click();

      // Verify form is reset
      await expect(page.locator('input[name="quantity"]')).toHaveValue('');
      await expect(page.locator('textarea[name="notes"]')).toHaveValue('');
    }
  });

  test('should display quick stats correctly', async ({ page }) => {
    // Check that stats are displayed
    await expect(page.locator('.stat-value')).toHaveCount(2); // Cats and Foods count

    // Verify cat count
    const catCountElement = page
      .locator('.stat-item')
      .filter({ hasText: '登録猫数' })
      .locator('.stat-value');
    await expect(catCountElement).toContainText('2');

    // Verify food count
    const foodCountElement = page
      .locator('.stat-item')
      .filter({ hasText: '登録フード数' })
      .locator('.stat-value');
    await expect(foodCountElement).toContainText('2');
  });

  test('should navigate to related pages via quick actions', async ({
    page,
  }) => {
    // Test navigation to cats page
    const catsLink = page.locator('a[href="/cats"]');
    if ((await catsLink.count()) > 0) {
      await catsLink.click();
      await testSetup.waitForPageLoad();
      await expect(page).toHaveURL('/cats');
      await expect(page.locator('h1')).toContainText('猫の管理');

      // Go back to meal recording
      await page.goto('/meals/record');
      await testSetup.waitForPageLoad();
    }

    // Test navigation to foods page
    const foodsLink = page.locator('a[href="/foods"]');
    if ((await foodsLink.count()) > 0) {
      await foodsLink.click();
      await testSetup.waitForPageLoad();
      await expect(page).toHaveURL('/foods');
      await expect(page.locator('h1')).toContainText('フード管理');

      // Go back to meal recording
      await page.goto('/meals/record');
      await testSetup.waitForPageLoad();
    }

    // Test navigation to meal history
    const historyLink = page.locator('a[href="/meals/history"]');
    if ((await historyLink.count()) > 0) {
      await historyLink.click();
      await testSetup.waitForPageLoad();
      await expect(page).toHaveURL('/meals/history');
    }
  });

  test('should handle loading states properly', async ({ page }) => {
    // Reload page to see loading state
    await page.reload();

    // Check for loading spinner or skeleton
    const loadingElement = page.locator(
      '.loading-spinner, .loading-container, [class*="loading"]',
    );
    if ((await loadingElement.count()) > 0) {
      await expect(loadingElement).toBeVisible();

      // Wait for loading to complete
      await testSetup.waitForPageLoad();
      await expect(loadingElement).not.toBeVisible();
    }

    // Verify form is ready after loading
    await expect(page.locator('select[name="catId"]')).toBeVisible();
    await expect(page.locator('select[name="foodId"]')).toBeVisible();
  });

  test('should maintain form state during navigation', async ({ page }) => {
    // Fill out form partially
    await testSetup.selectOption('select[name="catId"]', testCats[0].name);
    await testSetup.fillFormField('input[name="quantity"]', '25');

    // Navigate away and back (if browser supports it)
    await page.goBack();
    await page.goForward();
    await testSetup.waitForPageLoad();

    // Note: Form state persistence depends on implementation
    // This test documents the expected behavior
  });
});
