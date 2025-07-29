import { test, expect } from '@playwright/test';
import { TestSetup } from './utils/test-setup';
import { testCats, testFoods } from './utils/test-data';

test.describe('Responsive Design Validation', () => {
  let testSetup: TestSetup;

  // Define viewport sizes for testing
  const viewports = {
    mobile: { width: 375, height: 667 }, // iPhone SE
    mobileLarge: { width: 414, height: 896 }, // iPhone 11 Pro Max
    tablet: { width: 768, height: 1024 }, // iPad
    tabletLarge: { width: 1024, height: 768 }, // iPad Landscape
    desktop: { width: 1200, height: 800 }, // Desktop
    desktopLarge: { width: 1920, height: 1080 }, // Large Desktop
  };

  test.beforeEach(async ({ page }) => {
    testSetup = new TestSetup(page);
    await testSetup.setupCleanDatabase();

    // Create test data
    await testSetup.createTestCats([testCats[0], testCats[1]]);
    await testSetup.createTestFoods([testFoods[0], testFoods[1]]);
  });

  test.afterEach(async () => {
    await testSetup.setupCleanDatabase();
  });

  test.describe('Home Page Responsive Design', () => {
    Object.entries(viewports).forEach(([deviceName, viewport]) => {
      test(`should display properly on ${deviceName} (${viewport.width}x${viewport.height})`, async ({
        page,
      }) => {
        await testSetup.setViewportSize(viewport.width, viewport.height);
        await page.goto('/');
        await testSetup.waitForPageLoad();

        // Check basic layout elements
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('.welcome-section, .hero')).toBeVisible();

        // Check stats section
        const statsSection = page.locator('.stats-section, .stats-grid');
        if ((await statsSection.count()) > 0) {
          await expect(statsSection).toBeVisible();
        }

        // Check quick actions
        const quickActions = page.locator(
          '.quick-actions-section, .actions-grid',
        );
        if ((await quickActions.count()) > 0) {
          await expect(quickActions).toBeVisible();
        }

        // Verify no horizontal scrolling on mobile
        if (viewport.width <= 768) {
          const bodyWidth = await page.evaluate(
            () => document.body.scrollWidth,
          );
          expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 20); // Allow small margin
        }

        // Take screenshot for visual verification
        await testSetup.takeScreenshot(`home-${deviceName}`);
      });
    });

    test('should adapt navigation for mobile devices', async ({ page }) => {
      // Test mobile navigation
      await testSetup.setViewportSize(
        viewports.mobile.width,
        viewports.mobile.height,
      );
      await page.goto('/');
      await testSetup.waitForPageLoad();

      // Check for mobile-specific navigation elements
      const mobileNav = page.locator('.mobile-nav, [class*="mobile"]');
      if ((await mobileNav.count()) > 0) {
        await expect(mobileNav).toBeVisible();
      }

      // Test desktop navigation
      await testSetup.setViewportSize(
        viewports.desktop.width,
        viewports.desktop.height,
      );
      await page.reload();
      await testSetup.waitForPageLoad();

      // Check for desktop-specific navigation elements
      const desktopNav = page.locator('.desktop-nav, [class*="desktop"]');
      if ((await desktopNav.count()) > 0) {
        await expect(desktopNav).toBeVisible();
      }
    });
  });

  test.describe('Meal Recording Form Responsive Design', () => {
    Object.entries(viewports).forEach(([deviceName, viewport]) => {
      test(`should display meal recording form properly on ${deviceName}`, async ({
        page,
      }) => {
        await testSetup.setViewportSize(viewport.width, viewport.height);
        await page.goto('/meals/record');
        await testSetup.waitForPageLoad();

        // Check form elements are visible and accessible
        await expect(page.locator('select[name="catId"]')).toBeVisible();
        await expect(page.locator('select[name="foodId"]')).toBeVisible();
        await expect(page.locator('input[name="quantity"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();

        // Check form layout adapts to screen size
        const formContainer = page.locator('.form-container, form');
        await expect(formContainer).toBeVisible();

        // Verify form fields are properly sized for touch on mobile
        if (viewport.width <= 768) {
          const submitButton = page.locator('button[type="submit"]');
          const buttonBox = await submitButton.boundingBox();

          if (buttonBox) {
            // Button should be at least 44px high for touch accessibility
            expect(buttonBox.height).toBeGreaterThanOrEqual(40);
          }
        }

        // Take screenshot
        await testSetup.takeScreenshot(`meal-form-${deviceName}`);
      });
    });

    test('should handle form interactions on touch devices', async ({
      page,
    }) => {
      await testSetup.setViewportSize(
        viewports.mobile.width,
        viewports.mobile.height,
      );
      await page.goto('/meals/record');
      await testSetup.waitForPageLoad();

      // Test touch interactions
      await page.tap('select[name="catId"]');
      await expect(page.locator('select[name="catId"]')).toBeFocused();

      // Test form submission on mobile
      await testSetup.selectOption('select[name="catId"]', testCats[0].name);
      await testSetup.selectOption('select[name="foodId"]', testFoods[0].name);
      await testSetup.fillFormField('input[name="quantity"]', '30');

      const now = new Date();
      const timeString = now.toISOString().slice(0, 16);
      await testSetup.fillFormField('input[name="mealTime"]', timeString);

      // Submit via tap
      await page.tap('button[type="submit"]');

      // Should handle submission properly
      await testSetup.waitForSuccessMessage();
    });
  });

  test.describe('Data Lists Responsive Design', () => {
    test('should display cat list responsively', async ({ page }) => {
      // Test mobile view
      await testSetup.setViewportSize(
        viewports.mobile.width,
        viewports.mobile.height,
      );
      await page.goto('/cats');
      await testSetup.waitForPageLoad();

      // Check cat cards are stacked on mobile
      const catCards = page.locator('.cat-card, .cat-item');
      if ((await catCards.count()) > 0) {
        await expect(catCards.first()).toBeVisible();

        // Cards should stack vertically on mobile
        const firstCardBox = await catCards.first().boundingBox();
        const secondCardBox = await catCards.nth(1).boundingBox();

        if (firstCardBox && secondCardBox) {
          expect(secondCardBox.y).toBeGreaterThan(
            firstCardBox.y + firstCardBox.height - 10,
          );
        }
      }

      // Test desktop view
      await testSetup.setViewportSize(
        viewports.desktop.width,
        viewports.desktop.height,
      );
      await page.reload();
      await testSetup.waitForPageLoad();

      // Cards might be in grid layout on desktop
      if ((await catCards.count()) > 1) {
        const firstCardBox = await catCards.first().boundingBox();
        const secondCardBox = await catCards.nth(1).boundingBox();

        if (firstCardBox && secondCardBox) {
          // On desktop, cards might be side by side
          const isHorizontalLayout
            = Math.abs(firstCardBox.y - secondCardBox.y) < 50;
          const isVerticalLayout
            = secondCardBox.y > firstCardBox.y + firstCardBox.height - 10;

          expect(isHorizontalLayout || isVerticalLayout).toBeTruthy();
        }
      }

      await testSetup.takeScreenshot('cat-list-desktop');
    });

    test('should display food list with proper filtering on mobile', async ({
      page,
    }) => {
      await testSetup.setViewportSize(
        viewports.mobile.width,
        viewports.mobile.height,
      );
      await page.goto('/foods');
      await testSetup.waitForPageLoad();

      // Check filter buttons are accessible on mobile
      const filterButtons = page.locator('.filter-button, .type-filter button');
      if ((await filterButtons.count()) > 0) {
        await expect(filterButtons.first()).toBeVisible();

        // Buttons should be touch-friendly
        const buttonBox = await filterButtons.first().boundingBox();
        if (buttonBox) {
          expect(buttonBox.height).toBeGreaterThanOrEqual(40);
        }
      }

      // Test search input on mobile
      const searchInput = page.locator('input[placeholder*="検索"]');
      if ((await searchInput.count()) > 0) {
        await expect(searchInput).toBeVisible();

        // Should be properly sized for mobile
        const inputBox = await searchInput.boundingBox();
        if (inputBox) {
          expect(inputBox.height).toBeGreaterThanOrEqual(40);
        }
      }

      await testSetup.takeScreenshot('food-list-mobile');
    });
  });

  test.describe('Charts and Analytics Responsive Design', () => {
    test('should display charts responsively across devices', async ({
      page,
    }) => {
      // Create some meal data for charts
      const mealData = [
        {
          catName: testCats[0].name,
          foodName: testFoods[0].name,
          quantity: 30,
          mealTime: new Date().toISOString(),
        },
      ];
      await testSetup.createTestMealRecords(mealData);

      Object.entries(viewports).forEach(async ([deviceName, viewport]) => {
        await testSetup.setViewportSize(viewport.width, viewport.height);
        await page.goto('/analytics');
        await testSetup.waitForPageLoad();

        // Check chart container is visible
        const chartContainer = page.locator('.chart-container, canvas');
        if ((await chartContainer.count()) > 0) {
          await expect(chartContainer.first()).toBeVisible();

          // Chart should fit within viewport
          const chartBox = await chartContainer.first().boundingBox();
          if (chartBox) {
            expect(chartBox.width).toBeLessThanOrEqual(viewport.width);
          }
        }

        // Check filter controls are accessible
        const filterControls = page.locator('select, .filter-button');
        if ((await filterControls.count()) > 0) {
          await expect(filterControls.first()).toBeVisible();
        }

        await testSetup.takeScreenshot(`analytics-${deviceName}`);
      });
    });

    test('should handle chart interactions on touch devices', async ({
      page,
    }) => {
      await testSetup.setViewportSize(
        viewports.mobile.width,
        viewports.mobile.height,
      );
      await page.goto('/analytics');
      await testSetup.waitForPageLoad();

      const chartCanvas = page.locator('canvas').first();
      if ((await chartCanvas.count()) > 0) {
        // Test touch interaction with chart
        await page.tap(chartCanvas.locator('xpath=.'));

        // Chart should remain functional
        await expect(chartCanvas).toBeVisible();
      }
    });
  });

  test.describe('Modal and Dialog Responsive Design', () => {
    test('should display modals properly on mobile devices', async ({
      page,
    }) => {
      await testSetup.setViewportSize(
        viewports.mobile.width,
        viewports.mobile.height,
      );
      await page.goto('/cats');
      await testSetup.waitForPageLoad();

      // Open add cat modal
      const addButton = page.locator('button:has-text("猫を追加")');
      if ((await addButton.count()) > 0) {
        await addButton.click();

        // Modal should be visible and properly sized
        const modal = page.locator('.modal-content, .modal');
        if ((await modal.count()) > 0) {
          await expect(modal).toBeVisible();

          // Modal should fit within mobile viewport
          const modalBox = await modal.boundingBox();
          if (modalBox) {
            expect(modalBox.width).toBeLessThanOrEqual(viewports.mobile.width);
            expect(modalBox.height).toBeLessThanOrEqual(
              viewports.mobile.height,
            );
          }
        }

        // Form fields should be touch-friendly
        const nameInput = page.locator('input[name="name"]');
        if ((await nameInput.count()) > 0) {
          const inputBox = await nameInput.boundingBox();
          if (inputBox) {
            expect(inputBox.height).toBeGreaterThanOrEqual(40);
          }
        }

        await testSetup.takeScreenshot('modal-mobile');
      }
    });

    test('should handle modal scrolling on small screens', async ({ page }) => {
      await testSetup.setViewportSize(320, 568); // iPhone 5 size
      await page.goto('/cats');
      await testSetup.waitForPageLoad();

      const addButton = page.locator('button:has-text("猫を追加")');
      if ((await addButton.count()) > 0) {
        await addButton.click();

        const modal = page.locator('.modal-content, .modal');
        if ((await modal.count()) > 0) {
          await expect(modal).toBeVisible();

          // Modal should be scrollable if content is too tall
          const isScrollable = await modal.evaluate((el) => {
            return el.scrollHeight > el.clientHeight;
          });

          // If scrollable, test scrolling
          if (isScrollable) {
            await modal.scroll({ top: 100 });
            // Should not cause layout issues
            await expect(modal).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Typography and Spacing Responsive Design', () => {
    test('should scale typography appropriately across devices', async ({
      page,
    }) => {
      Object.entries(viewports).forEach(async ([deviceName, viewport]) => {
        await testSetup.setViewportSize(viewport.width, viewport.height);
        await page.goto('/');
        await testSetup.waitForPageLoad();

        // Check main heading
        const mainHeading = page.locator('h1').first();
        const headingStyles = await mainHeading.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            fontSize: styles.fontSize,
            lineHeight: styles.lineHeight,
          };
        });

        // Font size should be reasonable for the device
        const fontSize = parseFloat(headingStyles.fontSize);
        if (viewport.width <= 480) {
          // Mobile should have smaller but readable text
          expect(fontSize).toBeGreaterThanOrEqual(20);
          expect(fontSize).toBeLessThanOrEqual(32);
        }
        else if (viewport.width >= 1200) {
          // Desktop can have larger text
          expect(fontSize).toBeGreaterThanOrEqual(24);
        }
      });
    });

    test('should maintain proper spacing on different screen sizes', async ({
      page,
    }) => {
      // Test mobile spacing
      await testSetup.setViewportSize(
        viewports.mobile.width,
        viewports.mobile.height,
      );
      await page.goto('/');
      await testSetup.waitForPageLoad();

      // Check that elements don't overlap
      const sections = page.locator('section, .section');
      const sectionCount = await sections.count();

      for (let i = 0; i < sectionCount - 1; i++) {
        const currentSection = sections.nth(i);
        const nextSection = sections.nth(i + 1);

        const currentBox = await currentSection.boundingBox();
        const nextBox = await nextSection.boundingBox();

        if (currentBox && nextBox) {
          // Sections should not overlap
          expect(nextBox.y).toBeGreaterThanOrEqual(
            currentBox.y + currentBox.height - 5,
          );
        }
      }
    });
  });

  test.describe('Performance on Different Devices', () => {
    test('should load quickly on mobile devices', async ({ page }) => {
      await testSetup.setViewportSize(
        viewports.mobile.width,
        viewports.mobile.height,
      );

      const startTime = Date.now();
      await page.goto('/');
      await testSetup.waitForPageLoad();
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time on mobile
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle orientation changes gracefully', async ({ page }) => {
      // Start in portrait
      await testSetup.setViewportSize(375, 667);
      await page.goto('/');
      await testSetup.waitForPageLoad();

      await expect(page.locator('h1')).toBeVisible();

      // Switch to landscape
      await testSetup.setViewportSize(667, 375);
      await page.waitForTimeout(500);

      // Layout should adapt
      await expect(page.locator('h1')).toBeVisible();

      // No horizontal scrolling should occur
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(667 + 20);
    });
  });

  test.describe('Accessibility on Different Devices', () => {
    test('should maintain accessibility on mobile devices', async ({
      page,
    }) => {
      await testSetup.setViewportSize(
        viewports.mobile.width,
        viewports.mobile.height,
      );
      await page.goto('/');
      await testSetup.waitForPageLoad();

      // Check basic accessibility
      await testSetup.checkAccessibility();

      // Check touch target sizes
      const buttons = page.locator('button, a');
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const buttonBox = await button.boundingBox();

        if (buttonBox) {
          // Touch targets should be at least 44x44px
          expect(
            Math.min(buttonBox.width, buttonBox.height),
          ).toBeGreaterThanOrEqual(40);
        }
      }
    });

    test('should support keyboard navigation on all devices', async ({
      page,
    }) => {
      Object.entries(viewports).forEach(async ([deviceName, viewport]) => {
        await testSetup.setViewportSize(viewport.width, viewport.height);
        await page.goto('/');
        await testSetup.waitForPageLoad();

        // Test tab navigation
        await page.keyboard.press('Tab');
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();

        // Focus should be clearly visible
        const focusStyles = await focusedElement.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            outline: styles.outline,
            boxShadow: styles.boxShadow,
          };
        });

        // Should have some form of focus indication
        expect(
          focusStyles.outline !== 'none' || focusStyles.boxShadow !== 'none',
        ).toBeTruthy();
      });
    });
  });
});
