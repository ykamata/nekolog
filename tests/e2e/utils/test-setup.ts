import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { TestCat, TestFood, TestMealRecord } from './test-data';

/**
 * Test setup and teardown utilities for E2E tests
 */

export class TestSetup {
  constructor(private page: Page) {}

  /**
   * Setup test database with clean state
   */
  async setupCleanDatabase(): Promise<void> {
    // Clear all existing data via API calls
    await this.clearAllMealRecords();
    await this.clearAllCats();
    await this.clearAllFoods();
  }

  /**
   * Create test cats via API
   */
  async createTestCats(cats: TestCat[]): Promise<void> {
    for (const cat of cats) {
      await this.page.request.post('/api/cats', {
        data: cat,
      });
    }
  }

  /**
   * Create test foods via API
   */
  async createTestFoods(foods: TestFood[]): Promise<void> {
    for (const food of foods) {
      await this.page.request.post('/api/foods', {
        data: food,
      });
    }
  }

  /**
   * Create test meal records via API
   */
  async createTestMealRecords(records: TestMealRecord[]): Promise<void> {
    // First get cats and foods to map names to IDs
    const catsResponse = await this.page.request.get('/api/cats');
    const cats = await catsResponse.json();

    const foodsResponse = await this.page.request.get('/api/foods');
    const foods = await foodsResponse.json();

    for (const record of records) {
      const cat = cats.find((c: any) => c.name === record.catName);
      const food = foods.find((f: any) => f.name === record.foodName);

      if (cat && food) {
        await this.page.request.post('/api/meals', {
          data: {
            catId: cat.id,
            foodId: food.id,
            quantity: record.quantity,
            calories: record.calories || food.caloriesPerGram * record.quantity,
            mealTime: record.mealTime,
            notes: record.notes,
          },
        });
      }
    }
  }

  /**
   * Clear all meal records
   */
  async clearAllMealRecords(): Promise<void> {
    const response = await this.page.request.get('/api/meals');
    if (response.ok()) {
      const meals = await response.json();
      for (const meal of meals) {
        await this.page.request.delete(`/api/meals/${meal.id}`);
      }
    }
  }

  /**
   * Clear all cats
   */
  async clearAllCats(): Promise<void> {
    const response = await this.page.request.get('/api/cats');
    if (response.ok()) {
      const cats = await response.json();
      for (const cat of cats) {
        await this.page.request.delete(`/api/cats/${cat.id}`);
      }
    }
  }

  /**
   * Clear all foods
   */
  async clearAllFoods(): Promise<void> {
    const response = await this.page.request.get('/api/foods');
    if (response.ok()) {
      const foods = await response.json();
      for (const food of foods) {
        await this.page.request.delete(`/api/foods/${food.id}`);
      }
    }
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('body', { state: 'visible' });
  }

  /**
   * Wait for API request to complete
   */
  async waitForApiRequest(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForResponse(urlPattern);
  }

  /**
   * Simulate offline mode
   */
  async goOffline(): Promise<void> {
    await this.page.context().setOffline(true);
  }

  /**
   * Simulate online mode
   */
  async goOnline(): Promise<void> {
    await this.page.context().setOffline(false);
  }

  /**
   * Set viewport size for responsive testing
   */
  async setViewportSize(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  /**
   * Check if element is visible and enabled
   */
  async isElementReady(selector: string): Promise<boolean> {
    try {
      const element = this.page.locator(selector);
      await expect(element).toBeVisible();
      await expect(element).toBeEnabled();
      return true;
    }
    catch {
      return false;
    }
  }

  /**
   * Fill form field with validation
   */
  async fillFormField(selector: string, value: string): Promise<void> {
    const field = this.page.locator(selector);
    await expect(field).toBeVisible();
    await expect(field).toBeEnabled();
    await field.fill(value);

    // Verify the value was set correctly
    await expect(field).toHaveValue(value);
  }

  /**
   * Select option from dropdown
   */
  async selectOption(selector: string, value: string): Promise<void> {
    const select = this.page.locator(selector);
    await expect(select).toBeVisible();
    await expect(select).toBeEnabled();
    await select.selectOption(value);
  }

  /**
   * Click button with loading state handling
   */
  async clickButtonAndWait(
    selector: string,
    waitForResponse?: string | RegExp,
  ): Promise<void> {
    const button = this.page.locator(selector);
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();

    if (waitForResponse) {
      const [response] = await Promise.all([
        this.page.waitForResponse(waitForResponse),
        button.click(),
      ]);
      expect(response.ok()).toBeTruthy();
    }
    else {
      await button.click();
    }
  }

  /**
   * Wait for success message to appear
   */
  async waitForSuccessMessage(message?: string): Promise<void> {
    const successSelector
      = '.success-banner, .success-message, [class*="success"]';
    await expect(this.page.locator(successSelector)).toBeVisible();

    if (message) {
      await expect(this.page.locator(successSelector)).toContainText(message);
    }
  }

  /**
   * Wait for error message to appear
   */
  async waitForErrorMessage(message?: string): Promise<void> {
    const errorSelector = '.error-container, .error-message, [class*="error"]';
    await expect(this.page.locator(errorSelector)).toBeVisible();

    if (message) {
      await expect(this.page.locator(errorSelector)).toContainText(message);
    }
  }

  /**
   * Check responsive design elements
   */
  async checkResponsiveElements(): Promise<void> {
    const viewport = this.page.viewportSize();
    if (!viewport) return;

    if (viewport.width <= 768) {
      // Mobile checks
      await expect(
        this.page.locator('.mobile-nav, [class*="mobile"]'),
      ).toBeVisible();
    }
    else {
      // Desktop checks
      await expect(
        this.page.locator('.desktop-nav, [class*="desktop"]'),
      ).toBeVisible();
    }
  }

  /**
   * Verify page accessibility
   */
  async checkAccessibility(): Promise<void> {
    // Check for proper heading structure
    const h1 = this.page.locator('h1');
    await expect(h1).toBeVisible();

    // Check for alt text on images
    const images = this.page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }

    // Check for form labels
    const inputs = this.page.locator('input, select, textarea');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      if (id) {
        const label = this.page.locator(`label[for="${id}"]`);
        const hasLabel = (await label.count()) > 0;
        expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }
  }
}
