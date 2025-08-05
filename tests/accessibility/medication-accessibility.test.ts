import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Medication Accessibility Tests', () => {
  test('should meet accessibility standards on home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('[data-nuxt-ssr-scannable-id]') // Nuxtの内部要素を除外
      .analyze();

    // 重要な違反のみをチェック（criticalとserious）
    const criticalViolations = accessibilityScanResults.violations.filter(
      violation => violation.impact === 'critical' || violation.impact === 'serious',
    );

    if (criticalViolations.length > 0) {
      console.log('アクセシビリティ違反:', JSON.stringify(criticalViolations, null, 2));
    }

    expect(criticalViolations).toEqual([]);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();

    // Should have main page heading
    expect(headings).toContain('薬管理');

    // Check heading levels are properly nested
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1); // Should have exactly one h1

    // Verify heading hierarchy
    const headingElements = await page.locator('h1, h2, h3, h4, h5, h6').all();
    let previousLevel = 0;

    for (const heading of headingElements) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const currentLevel = parseInt(tagName.charAt(1));

      // Heading levels should not skip (e.g., h1 -> h3)
      if (previousLevel > 0) {
        expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
      }

      previousLevel = currentLevel;
    }
  });

  test('should have proper form labels and accessibility', async ({ page }) => {
    await page.goto('/medications');
    await page.waitForSelector('.medications-container');

    // Open add medication modal
    await page.locator('.add-button').click();
    await page.waitForSelector('.modal-overlay');

    // Check form accessibility
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('.modal')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Check that all form inputs have proper labels
    const inputs = await page.locator('input, select, textarea').all();

    for (const input of inputs) {
      const inputId = await input.getAttribute('id');
      const inputName = await input.getAttribute('name');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      // Input should have either a label, aria-label, or aria-labelledby
      if (inputId) {
        const associatedLabel = await page.locator(`label[for="${inputId}"]`).count();
        const hasProperLabel = associatedLabel > 0 || ariaLabel || ariaLabelledBy;
        expect(hasProperLabel).toBe(true);
      }
      else if (inputName) {
        // If no id, should have aria-label or aria-labelledby
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }

    // Check required field indicators
    const requiredInputs = await page.locator('input[required], select[required]').all();

    for (const input of requiredInputs) {
      const ariaRequired = await input.getAttribute('aria-required');
      const ariaInvalid = await input.getAttribute('aria-invalid');

      // Required inputs should have aria-required
      expect(ariaRequired).toBe('true');

      // Should have aria-invalid attribute
      expect(ariaInvalid).toBeDefined();
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/medications');
    await page.waitForSelector('.medications-container');

    // Test tab navigation
    await page.keyboard.press('Tab');

    // Should focus on first interactive element
    const firstFocusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'INPUT', 'SELECT', 'A']).toContain(firstFocusedElement);

    // Test navigation through medication items
    const medicationItems = await page.locator('.medication-item').count();

    if (medicationItems > 0) {
      // Navigate to first medication item
      await page.locator('.medication-item').first().focus();

      // Should be able to activate with Enter or Space
      await page.keyboard.press('Enter');

      // Should open medication details or edit modal
      const modalVisible = await page.locator('.modal-overlay').isVisible();
      const detailsVisible = await page.locator('.medication-details').isVisible();

      expect(modalVisible || detailsVisible).toBe(true);

      // Close modal/details with Escape
      await page.keyboard.press('Escape');

      // Modal should close
      if (modalVisible) {
        await expect(page.locator('.modal-overlay')).not.toBeVisible();
      }
    }

    // Test add button keyboard access
    await page.locator('.add-button').focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('.modal-overlay')).toBeVisible();

    // Test form keyboard navigation
    await page.keyboard.press('Tab'); // Should focus first form field
    await page.keyboard.type('キーボードテスト薬');

    await page.keyboard.press('Tab'); // Move to next field
    await page.keyboard.press('ArrowDown'); // Should open select dropdown

    // Close modal with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    await page.goto('/medications');
    await page.waitForSelector('.medications-container');

    // Check main content areas have proper roles
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible();

    // Check navigation has proper role
    const navigation = page.locator('nav, [role="navigation"]');
    if (await navigation.count() > 0) {
      await expect(navigation.first()).toBeVisible();
    }

    // Check buttons have proper roles and states
    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      const role = await button.getAttribute('role');
      const ariaPressed = await button.getAttribute('aria-pressed');
      const ariaExpanded = await button.getAttribute('aria-expanded');
      const ariaHaspopup = await button.getAttribute('aria-haspopup');

      // Button role should be button or not specified (implicit)
      if (role) {
        expect(['button', 'tab', 'menuitem']).toContain(role);
      }

      // If button has dropdown/popup, should have aria-haspopup
      const hasDropdown = await button.locator('+ .dropdown, + .menu').count() > 0;
      if (hasDropdown) {
        expect(ariaHaspopup).toBeTruthy();
      }
    }

    // Check lists have proper structure
    const lists = await page.locator('ul, ol').all();

    for (const list of lists) {
      const listItems = await list.locator('li').count();
      if (listItems > 0) {
        // List should have list items
        expect(listItems).toBeGreaterThan(0);

        // Check if it's a navigation list
        const role = await list.getAttribute('role');
        if (role === 'menubar' || role === 'menu') {
          // Menu items should have proper roles
          const menuItems = await list.locator('[role="menuitem"]').count();
          expect(menuItems).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should support screen reader announcements', async ({ page }) => {
    await page.goto('/medications');
    await page.waitForSelector('.medications-container');

    // Check for live regions
    const liveRegions = await page.locator('[aria-live]').all();

    // Should have live regions for dynamic content updates
    expect(liveRegions.length).toBeGreaterThan(0);

    // Test status announcements
    await page.locator('.add-button').click();
    await page.waitForSelector('.modal-overlay');

    // Fill form with invalid data to trigger validation
    await page.locator('.submit-button').click();

    // Should have error announcements
    const errorRegion = page.locator('[aria-live="assertive"], [role="alert"]');
    if (await errorRegion.count() > 0) {
      await expect(errorRegion.first()).toBeVisible();
    }

    // Fill valid data
    await page.locator('input[name="name"]').fill('スクリーンリーダーテスト薬');
    await page.locator('select[name="type"]').selectOption('MEDICINE');
    await page.locator('.submit-button').click();

    // Should announce success
    const successRegion = page.locator('[aria-live="polite"]');
    if (await successRegion.count() > 0) {
      const successMessage = await successRegion.first().textContent();
      expect(successMessage).toBeTruthy();
    }
  });

  test('should have accessible medication calendar', async ({ page }) => {
    await page.goto('/medication-calendar');
    await page.waitForSelector('.calendar-container');

    // Run accessibility scan on calendar
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Check calendar structure
    const calendar = page.locator('[role="grid"], table');
    await expect(calendar).toBeVisible();

    // Check calendar navigation
    const prevButton = page.locator('.calendar-nav-button').first();
    const nextButton = page.locator('.calendar-nav-button').last();

    await expect(prevButton).toHaveAttribute('aria-label');
    await expect(nextButton).toHaveAttribute('aria-label');

    // Check calendar days
    const calendarDays = await page.locator('.calendar-day').all();

    for (const day of calendarDays.slice(0, 5)) { // Check first 5 days
      const ariaLabel = await day.getAttribute('aria-label');
      const role = await day.getAttribute('role');

      // Days should have descriptive labels
      expect(ariaLabel).toBeTruthy();

      // Should have proper role
      expect(['gridcell', 'button']).toContain(role);
    }

    // Test keyboard navigation
    await page.locator('.calendar-day.current-month').first().focus();

    // Arrow keys should navigate calendar
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');

    // Enter should select day
    await page.keyboard.press('Enter');

    // Should show day details
    await expect(page.locator('.day-details')).toBeVisible();
  });

  test('should have accessible medication records table', async ({ page }) => {
    await page.goto('/medication-records');
    await page.waitForSelector('.records-container');

    // Check table accessibility
    const table = page.locator('table, [role="table"]');
    if (await table.count() > 0) {
      // Table should have caption or aria-label
      const caption = await table.locator('caption').count();
      const ariaLabel = await table.getAttribute('aria-label');
      const ariaLabelledBy = await table.getAttribute('aria-labelledby');

      expect(caption > 0 || ariaLabel || ariaLabelledBy).toBe(true);

      // Check table headers
      const headers = await table.locator('th, [role="columnheader"]').all();

      for (const header of headers) {
        const scope = await header.getAttribute('scope');
        const role = await header.getAttribute('role');

        // Headers should have proper scope or role
        expect(scope === 'col' || role === 'columnheader').toBe(true);
      }
    }

    // Check list accessibility if using list instead of table
    const recordsList = page.locator('.records-list, [role="list"]');
    if (await recordsList.count() > 0) {
      const listItems = await recordsList.locator('[role="listitem"], li').count();
      expect(listItems).toBeGreaterThan(0);
    }

    // Test sorting accessibility
    const sortButtons = await page.locator('.sort-button, [aria-sort]').all();

    for (const sortButton of sortButtons) {
      const ariaSort = await sortButton.getAttribute('aria-sort');
      const ariaLabel = await sortButton.getAttribute('aria-label');

      // Sort buttons should have aria-sort and descriptive labels
      expect(['ascending', 'descending', 'none']).toContain(ariaSort);
      expect(ariaLabel).toBeTruthy();
    }
  });

  test('should support high contrast mode', async ({ page }) => {
    // Enable high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });

    await page.goto('/medications');
    await page.waitForSelector('.medications-container');

    // Check that elements are still visible and have sufficient contrast
    const buttons = await page.locator('button').all();

    for (const button of buttons.slice(0, 3)) { // Check first 3 buttons
      const styles = await button.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          border: computed.border,
        };
      });

      // Button should have visible styling
      expect(styles.backgroundColor !== 'rgba(0, 0, 0, 0)'
        || styles.border !== 'none'
        || styles.color !== 'rgba(0, 0, 0, 0)').toBe(true);
    }

    // Test with forced colors
    await page.addStyleTag({
      content: `
        @media (forced-colors: active) {
          * {
            forced-color-adjust: none;
          }
        }
      `,
    });

    // Elements should still be distinguishable
    const medicationItems = await page.locator('.medication-item').all();

    for (const item of medicationItems.slice(0, 2)) {
      await expect(item).toBeVisible();
    }
  });

  test('should support reduced motion preferences', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto('/medications');
    await page.waitForSelector('.medications-container');

    // Test modal animation
    await page.locator('.add-button').click();

    // Modal should appear without animation or with reduced animation
    await expect(page.locator('.modal-overlay')).toBeVisible();

    // Check that transitions are disabled or reduced
    const modal = page.locator('.modal');
    const transitionDuration = await modal.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return computed.transitionDuration;
    });

    // Should have no transition or very short transition
    expect(['0s', '0.01s', '0.1s']).toContain(transitionDuration);

    await page.keyboard.press('Escape');

    // Test calendar navigation without animation
    await page.goto('/medication-calendar');
    await page.waitForSelector('.calendar-container');

    await page.locator('.calendar-nav-button').first().click();

    // Calendar should change without animation
    await page.waitForSelector('.calendar-day');
  });

  test('should be usable with voice control', async ({ page }) => {
    await page.goto('/medications');
    await page.waitForSelector('.medications-container');

    // Check that interactive elements have accessible names
    const interactiveElements = await page.locator('button, input, select, a').all();

    for (const element of interactiveElements.slice(0, 10)) { // Check first 10 elements
      const tagName = await element.evaluate(el => el.tagName.toLowerCase());
      const accessibleName = await element.evaluate((el) => {
        // Get accessible name (simplified version)
        return el.getAttribute('aria-label')
          || el.getAttribute('title')
          || el.textContent?.trim()
          || el.getAttribute('alt')
          || el.getAttribute('placeholder');
      });

      // Interactive elements should have accessible names for voice control
      expect(accessibleName).toBeTruthy();
    }

    // Test that form fields have clear labels for voice commands
    await page.locator('.add-button').click();
    await page.waitForSelector('.modal-overlay');

    const formFields = await page.locator('input, select, textarea').all();

    for (const field of formFields) {
      const label = await field.evaluate((el) => {
        const id = el.getAttribute('id');
        if (id) {
          const labelEl = document.querySelector(`label[for="${id}"]`);
          if (labelEl) return labelEl.textContent;
        }
        return el.getAttribute('aria-label') || el.getAttribute('placeholder');
      });

      expect(label).toBeTruthy();
    }
  });

  test('should handle focus management properly', async ({ page }) => {
    await page.goto('/medications');
    await page.waitForSelector('.medications-container');

    // Test modal focus management
    await page.locator('.add-button').click();
    await page.waitForSelector('.modal-overlay');

    // Focus should be trapped in modal
    const modalFirstFocusable = page.locator('.modal input, .modal button, .modal select').first();
    const modalLastFocusable = page.locator('.modal input, .modal button, .modal select').last();

    await modalFirstFocusable.focus();

    // Shift+Tab from first element should go to last
    await page.keyboard.press('Shift+Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'INPUT', 'SELECT']).toContain(focusedElement);

    // Close modal and check focus return
    await page.keyboard.press('Escape');
    await expect(page.locator('.modal-overlay')).not.toBeVisible();

    // Focus should return to add button
    const currentFocus = await page.evaluate(() => document.activeElement?.textContent);
    expect(currentFocus).toContain('追加');

    // Test skip links if present
    const skipLinks = await page.locator('.skip-link, [href="#main-content"]').count();
    if (skipLinks > 0) {
      await page.keyboard.press('Tab');
      const skipLink = page.locator('.skip-link, [href="#main-content"]').first();
      await skipLink.click();

      // Should focus main content
      const mainContent = await page.evaluate(() => document.activeElement?.id);
      expect(['main-content', 'main']).toContain(mainContent);
    }
  });
});
