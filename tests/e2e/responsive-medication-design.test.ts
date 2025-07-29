import { test, expect } from '@playwright/test';

test.describe('Responsive Medication Design Tests', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 },
    { name: 'Large Desktop', width: 2560, height: 1440 },
  ];

  viewports.forEach(({ name, width, height }) => {
    test(`should display medications page correctly on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/medications');
      await page.waitForSelector('.medications-container');

      // Check page layout
      const container = page.locator('.medications-container');
      await expect(container).toBeVisible();

      // Check responsive navigation
      if (width < 768) {
        // Mobile: should have hamburger menu or mobile nav
        const mobileNav = page.locator('.mobile-nav, .hamburger-menu');
        if (await mobileNav.count() > 0) {
          await expect(mobileNav).toBeVisible();
        }
      }
      else {
        // Desktop: should have full navigation
        const desktopNav = page.locator('.desktop-nav, .main-nav');
        if (await desktopNav.count() > 0) {
          await expect(desktopNav).toBeVisible();
        }
      }

      // Check medication grid/list layout
      const medicationItems = page.locator('.medication-item');
      const itemCount = await medicationItems.count();

      if (itemCount > 0) {
        // Check grid layout adapts to screen size
        const firstItem = medicationItems.first();
        const itemBox = await firstItem.boundingBox();

        if (itemBox) {
          // Items should not overflow viewport
          expect(itemBox.x + itemBox.width).toBeLessThanOrEqual(width);

          // Items should have reasonable size
          expect(itemBox.width).toBeGreaterThan(100);
          expect(itemBox.height).toBeGreaterThan(50);
        }
      }

      // Check add button accessibility
      const addButton = page.locator('.add-button');
      await expect(addButton).toBeVisible();

      const addButtonBox = await addButton.boundingBox();
      if (addButtonBox) {
        // Button should be large enough for touch on mobile
        if (width < 768) {
          expect(addButtonBox.height).toBeGreaterThanOrEqual(44); // iOS minimum touch target
        }
      }
    });

    test(`should handle medication form modal on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/medications');
      await page.waitForSelector('.medications-container');

      // Open modal
      await page.locator('.add-button').click();
      await expect(page.locator('.modal-overlay')).toBeVisible();

      const modal = page.locator('.modal');
      const modalBox = await modal.boundingBox();

      if (modalBox) {
        if (width < 768) {
          // Mobile: modal should be full-screen or nearly full-screen
          expect(modalBox.width).toBeGreaterThan(width * 0.9);
        }
        else {
          // Desktop: modal should be centered and reasonably sized
          expect(modalBox.width).toBeLessThan(width * 0.8);
          expect(modalBox.width).toBeGreaterThan(400);
        }

        // Modal should not overflow viewport
        expect(modalBox.x).toBeGreaterThanOrEqual(0);
        expect(modalBox.y).toBeGreaterThanOrEqual(0);
        expect(modalBox.x + modalBox.width).toBeLessThanOrEqual(width);
        expect(modalBox.y + modalBox.height).toBeLessThanOrEqual(height);
      }

      // Check form field layout
      const formFields = page.locator('.modal input, .modal select, .modal textarea');
      const fieldCount = await formFields.count();

      for (let i = 0; i < Math.min(fieldCount, 3); i++) {
        const field = formFields.nth(i);
        const fieldBox = await field.boundingBox();

        if (fieldBox) {
          // Fields should be appropriately sized
          if (width < 768) {
            expect(fieldBox.width).toBeGreaterThan(200);
            expect(fieldBox.height).toBeGreaterThanOrEqual(44); // Touch target size
          }
          else {
            expect(fieldBox.width).toBeGreaterThan(250);
          }
        }
      }

      // Close modal
      await page.keyboard.press('Escape');
      await expect(page.locator('.modal-overlay')).not.toBeVisible();
    });

    test(`should display medication calendar correctly on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/medication-calendar');
      await page.waitForSelector('.calendar-container');

      const calendar = page.locator('.calendar-grid');
      const calendarBox = await calendar.boundingBox();

      if (calendarBox) {
        // Calendar should fit in viewport
        expect(calendarBox.width).toBeLessThanOrEqual(width);
        expect(calendarBox.height).toBeLessThanOrEqual(height * 0.8);
      }

      // Check calendar day cells
      const calendarDays = page.locator('.calendar-day');
      const dayCount = await calendarDays.count();

      if (dayCount > 0) {
        const firstDay = calendarDays.first();
        const dayBox = await firstDay.boundingBox();

        if (dayBox) {
          if (width < 768) {
            // Mobile: days should be large enough for touch
            expect(dayBox.width).toBeGreaterThanOrEqual(40);
            expect(dayBox.height).toBeGreaterThanOrEqual(40);
          }
          else {
            // Desktop: days can be smaller but still usable
            expect(dayBox.width).toBeGreaterThanOrEqual(30);
            expect(dayBox.height).toBeGreaterThanOrEqual(30);
          }
        }
      }

      // Check calendar navigation
      const navButtons = page.locator('.calendar-nav-button');
      const navCount = await navButtons.count();

      for (let i = 0; i < navCount; i++) {
        const navButton = navButtons.nth(i);
        const navBox = await navButton.boundingBox();

        if (navBox) {
          if (width < 768) {
            // Mobile: nav buttons should be touch-friendly
            expect(navBox.width).toBeGreaterThanOrEqual(44);
            expect(navBox.height).toBeGreaterThanOrEqual(44);
          }
        }
      }
    });

    test(`should handle medication records list on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/medication-records');
      await page.waitForSelector('.records-container');

      // Check records layout
      const recordItems = page.locator('.record-item');
      const recordCount = await recordItems.count();

      if (recordCount > 0) {
        const firstRecord = recordItems.first();
        const recordBox = await firstRecord.boundingBox();

        if (recordBox) {
          // Records should fit in viewport width
          expect(recordBox.width).toBeLessThanOrEqual(width);

          if (width < 768) {
            // Mobile: records should stack vertically
            expect(recordBox.width).toBeGreaterThan(width * 0.8);
          }
        }
      }

      // Check filter controls
      const filters = page.locator('.filter-control, .cat-filter, .status-filter');
      const filterCount = await filters.count();

      for (let i = 0; i < Math.min(filterCount, 3); i++) {
        const filter = filters.nth(i);
        const filterBox = await filter.boundingBox();

        if (filterBox) {
          if (width < 768) {
            // Mobile: filters should be full-width or stacked
            expect(filterBox.width).toBeGreaterThan(150);
          }
        }
      }

      // Check add record button
      const addRecordButton = page.locator('.add-record-button');
      if (await addRecordButton.count() > 0) {
        const buttonBox = await addRecordButton.boundingBox();

        if (buttonBox && width < 768) {
          // Mobile: button should be touch-friendly
          expect(buttonBox.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });

  test('should handle orientation changes on mobile', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/medications');
    await page.waitForSelector('.medications-container');

    // Check portrait layout
    const portraitItems = await page.locator('.medication-item').count();

    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500); // Wait for layout adjustment

    // Check landscape layout
    const landscapeItems = await page.locator('.medication-item').count();
    expect(landscapeItems).toBe(portraitItems); // Same items should be visible

    // Check that layout adapts
    const container = page.locator('.medications-container');
    const containerBox = await container.boundingBox();

    if (containerBox) {
      expect(containerBox.width).toBeLessThanOrEqual(667);
      expect(containerBox.height).toBeLessThanOrEqual(375);
    }
  });

  test('should handle zoom levels correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/medications');
    await page.waitForSelector('.medications-container');

    // Test different zoom levels
    const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

    for (const zoom of zoomLevels) {
      await page.evaluate((zoomLevel) => {
        document.body.style.zoom = zoomLevel.toString();
      }, zoom);

      await page.waitForTimeout(300);

      // Check that content is still accessible
      const addButton = page.locator('.add-button');
      await expect(addButton).toBeVisible();

      // Check that text is readable
      const medicationItems = page.locator('.medication-item');
      const itemCount = await medicationItems.count();

      if (itemCount > 0) {
        const firstItem = medicationItems.first();
        await expect(firstItem).toBeVisible();

        // Text should not be cut off
        const itemText = await firstItem.textContent();
        expect(itemText?.length).toBeGreaterThan(0);
      }
    }

    // Reset zoom
    await page.evaluate(() => {
      document.body.style.zoom = '1';
    });
  });

  test('should handle text scaling', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Test with different font sizes
    const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px'];

    for (const fontSize of fontSizes) {
      await page.addStyleTag({
        content: `
          * {
            font-size: ${fontSize} !important;
          }
        `,
      });

      await page.goto('/medications');
      await page.waitForSelector('.medications-container');

      // Check that layout doesn't break with larger text
      const container = page.locator('.medications-container');
      await expect(container).toBeVisible();

      // Check that buttons are still clickable
      const addButton = page.locator('.add-button');
      await expect(addButton).toBeVisible();

      const buttonBox = await addButton.boundingBox();
      if (buttonBox) {
        // Button should be large enough for the text
        expect(buttonBox.width).toBeGreaterThan(50);
        expect(buttonBox.height).toBeGreaterThan(20);
      }

      // Check medication items
      const medicationItems = page.locator('.medication-item');
      const itemCount = await medicationItems.count();

      if (itemCount > 0) {
        const firstItem = medicationItems.first();
        const itemBox = await firstItem.boundingBox();

        if (itemBox) {
          // Items should expand to accommodate larger text
          expect(itemBox.height).toBeGreaterThan(30);
        }
      }
    }
  });

  test('should handle print styles', async ({ page }) => {
    await page.goto('/medications');
    await page.waitForSelector('.medications-container');

    // Emulate print media
    await page.emulateMedia({ media: 'print' });

    // Check that page is still readable in print mode
    const container = page.locator('.medications-container');
    await expect(container).toBeVisible();

    // Check that navigation elements are hidden in print
    const navigation = page.locator('.nav, .navigation');
    if (await navigation.count() > 0) {
      const navStyles = await navigation.first().evaluate((el) => {
        return window.getComputedStyle(el).display;
      });

      // Navigation should be hidden in print
      expect(navStyles).toBe('none');
    }

    // Check that content is optimized for print
    const medicationItems = page.locator('.medication-item');
    const itemCount = await medicationItems.count();

    if (itemCount > 0) {
      const firstItem = medicationItems.first();
      const itemStyles = await firstItem.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          pageBreakInside: computed.pageBreakInside,
        };
      });

      // Print styles should use appropriate colors and page breaks
      expect(itemStyles.color).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('should handle reduced data mode', async ({ page }) => {
    // Simulate slow connection
    await page.route('**/*', (route) => {
      // Add delay to simulate slow connection
      setTimeout(() => route.continue(), 100);
    });

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/medications');
    await page.waitForSelector('.medications-container');

    // Check that essential content loads first
    const essentialElements = [
      '.medications-container',
      '.add-button',
      '.medication-item',
    ];

    for (const selector of essentialElements) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        await expect(element.first()).toBeVisible();
      }
    }

    // Check that images are optimized or lazy-loaded
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < Math.min(imageCount, 3); i++) {
      const img = images.nth(i);
      const loading = await img.getAttribute('loading');
      const src = await img.getAttribute('src');

      // Images should be lazy-loaded or optimized
      expect(loading === 'lazy' || src?.includes('placeholder')).toBe(true);
    }
  });

  test('should handle touch interactions on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/medications');
    await page.waitForSelector('.medications-container');

    // Test touch targets
    const touchTargets = page.locator('button, a, .clickable');
    const targetCount = await touchTargets.count();

    for (let i = 0; i < Math.min(targetCount, 5); i++) {
      const target = touchTargets.nth(i);
      const targetBox = await target.boundingBox();

      if (targetBox) {
        // Touch targets should meet minimum size requirements
        expect(targetBox.width).toBeGreaterThanOrEqual(44);
        expect(targetBox.height).toBeGreaterThanOrEqual(44);
      }
    }

    // Test swipe gestures if implemented
    const medicationItems = page.locator('.medication-item');
    const itemCount = await medicationItems.count();

    if (itemCount > 0) {
      const firstItem = medicationItems.first();
      const itemBox = await firstItem.boundingBox();

      if (itemBox) {
        // Test swipe gesture
        await page.mouse.move(itemBox.x + 10, itemBox.y + itemBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(itemBox.x + itemBox.width - 10, itemBox.y + itemBox.height / 2);
        await page.mouse.up();

        // Check if swipe action was triggered (if implemented)
        const swipeActions = page.locator('.swipe-action, .action-menu');
        if (await swipeActions.count() > 0) {
          await expect(swipeActions.first()).toBeVisible();
        }
      }
    }

    // Test pinch zoom (if applicable)
    await page.touchscreen.tap(200, 200);

    // Simulate pinch gesture
    await page.evaluate(() => {
      const event = new TouchEvent('touchstart', {
        touches: [
          new Touch({ identifier: 0, target: document.body, clientX: 100, clientY: 100 }),
          new Touch({ identifier: 1, target: document.body, clientX: 200, clientY: 200 }),
        ],
      });
      document.body.dispatchEvent(event);
    });
  });
});
