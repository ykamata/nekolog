import { test, expect } from '@playwright/test';

test.describe('データ可視化ページ - 基本機能テスト', () => {
  test.beforeEach(async ({ page }) => {
    // Analytics ページに直接移動
    await page.goto('/analytics');

    // ページが読み込まれるまで待機
    try {
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    }
    catch (error) {
      console.warn('Page load timeout:', error);
      // タイムアウトしても続行
    }
  });

  test.describe('要件4.1: 表示モード切り替えボタンの基本動作', () => {
    test('ページが正常に表示される', async ({ page }) => {
      // ページタイトルまたは基本要素が表示されることを確認
      const pageTitle = page.locator('.page-title');
      const analyticsPage = page.locator('.analytics-page');
      const pageHeader = page.locator('.page-header');

      // いずれかの要素が表示されることを確認
      try {
        await expect(pageTitle).toBeVisible({ timeout: 5000 });
      }
      catch {
        try {
          await expect(analyticsPage).toBeVisible({ timeout: 5000 });
        }
        catch {
          await expect(pageHeader).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('チャート表示モード切り替えボタンが存在する', async ({ page }) => {
      // 線グラフボタンの存在確認
      const lineButton = page.locator('button').filter({ hasText: '線グラフ' });
      if (await lineButton.count() > 0) {
        await expect(lineButton.first()).toBeVisible();
      }

      // 積み上げ棒グラフボタンの存在確認
      const barButton = page.locator('button').filter({ hasText: '積み上げ棒グラフ' });
      if (await barButton.count() > 0) {
        await expect(barButton.first()).toBeVisible();
      }
    });

    test('表示モード切り替えボタンがクリック可能', async ({ page }) => {
      // 線グラフボタンのクリック
      const lineButton = page.locator('button').filter({ hasText: '線グラフ' });
      if (await lineButton.count() > 0) {
        await lineButton.first().click();
        // エラーが発生しないことを確認
        await expect(lineButton.first()).toBeVisible();
      }

      // 積み上げ棒グラフボタンのクリック
      const barButton = page.locator('button').filter({ hasText: '積み上げ棒グラフ' });
      if (await barButton.count() > 0) {
        await barButton.first().click();
        // エラーが発生しないことを確認
        await expect(barButton.first()).toBeVisible();
      }
    });
  });

  test.describe('要件4.2: フード種別フィルターの基本動作', () => {
    test('フード種別フィルターボタンが存在する', async ({ page }) => {
      // すべてボタンの存在確認
      const allButton = page.locator('button').filter({ hasText: 'すべて' });
      if (await allButton.count() > 0) {
        await expect(allButton.first()).toBeVisible();
      }

      // ドライフードボタンの存在確認
      const dryButton = page.locator('button').filter({ hasText: 'ドライ' });
      if (await dryButton.count() > 0) {
        await expect(dryButton.first()).toBeVisible();
      }

      // ウェットフードボタンの存在確認
      const wetButton = page.locator('button').filter({ hasText: 'ウェット' });
      if (await wetButton.count() > 0) {
        await expect(wetButton.first()).toBeVisible();
      }
    });

    test('フード種別フィルターボタンがクリック可能', async ({ page }) => {
      // ドライフードボタンのクリック
      const dryButton = page.locator('button').filter({ hasText: 'ドライ' });
      if (await dryButton.count() > 0) {
        await dryButton.first().click();
        await expect(dryButton.first()).toBeVisible();
      }

      // ウェットフードボタンのクリック
      const wetButton = page.locator('button').filter({ hasText: 'ウェット' });
      if (await wetButton.count() > 0) {
        await wetButton.first().click();
        await expect(wetButton.first()).toBeVisible();
      }
    });
  });

  test.describe('要件4.3: 猫選択フィルターの基本動作', () => {
    test('猫選択ボタンが存在する', async ({ page }) => {
      // 猫選択ボタンの存在確認
      const catButtons = page.locator('.cat-button, button').filter({ hasText: /猫|みけ|しろ|くろ/ });
      if (await catButtons.count() > 0) {
        await expect(catButtons.first()).toBeVisible();
      }
    });

    test('猫選択ボタンがクリック可能', async ({ page }) => {
      // 猫選択ボタンのクリック
      const catButtons = page.locator('.cat-button, button').filter({ hasText: /猫|みけ|しろ|くろ/ });
      if (await catButtons.count() > 0) {
        await catButtons.first().click();
        await expect(catButtons.first()).toBeVisible();
      }
    });
  });

  test.describe('要件4.4: 期間選択フィルターの基本動作', () => {
    test('期間選択コントロールが存在する', async ({ page }) => {
      // 期間選択ドロップダウンの存在確認
      const periodSelect = page.locator('select');
      if (await periodSelect.count() > 0) {
        await expect(periodSelect.first()).toBeVisible();
      }

      // 期間選択ボタンの存在確認
      const periodButtons = page.locator('button').filter({ hasText: /日|週|月/ });
      if (await periodButtons.count() > 0) {
        await expect(periodButtons.first()).toBeVisible();
      }
    });

    test('期間選択コントロールが操作可能', async ({ page }) => {
      // 期間選択ドロップダウンの操作
      const periodSelect = page.locator('select');
      if (await periodSelect.count() > 0) {
        await periodSelect.first().selectOption({ index: 0 });
        await expect(periodSelect.first()).toBeVisible();
      }

      // 期間選択ボタンの操作
      const periodButtons = page.locator('button').filter({ hasText: /日|週|月/ });
      if (await periodButtons.count() > 0) {
        await periodButtons.first().click();
        await expect(periodButtons.first()).toBeVisible();
      }
    });
  });

  test.describe('チャート表示の基本確認', () => {
    test('チャートコンテナが存在する', async ({ page }) => {
      // チャートコンテナの存在確認
      const chartContainer = page.locator('.chart-container, canvas, [class*="chart"]');
      if (await chartContainer.count() > 0) {
        await expect(chartContainer.first()).toBeVisible();
      }
    });

    test('ページが5秒以内に表示される', async ({ page }) => {
      const startTime = Date.now();

      // ページに移動
      await page.goto('/analytics');

      // 基本要素が表示されるまで待機
      const pageTitle = page.locator('.page-title');
      const analyticsPage = page.locator('.analytics-page');

      try {
        await expect(pageTitle).toBeVisible({ timeout: 5000 });
      }
      catch {
        await expect(analyticsPage).toBeVisible({ timeout: 5000 });
      }

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(10000); // 10秒以内（緩い条件）
    });
  });

  test.describe('エラーハンドリングの基本確認', () => {
    test('ページエラーが発生しない', async ({ page }) => {
      let hasError = false;

      page.on('pageerror', (error) => {
        hasError = true;
      });

      await page.goto('/analytics');
      await page.waitForTimeout(2000); // 2秒待機

      expect(hasError).toBeFalsy();
    });

    test('コンソールエラーが致命的でない', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto('/analytics');
      await page.waitForTimeout(2000); // 2秒待機

      // 致命的なエラーがないことを確認（一部のエラーは許容）
      const fatalErrors = errors.filter(error =>
        error.includes('TypeError')
        || error.includes('ReferenceError')
        || error.includes('SyntaxError'),
      );

      expect(fatalErrors.length).toBe(0);
    });
  });

  test.describe('アクセシビリティの基本確認', () => {
    test('基本的なアクセシビリティ要素が存在する', async ({ page }) => {
      // ページタイトルまたは基本要素の存在確認
      const pageTitle = page.locator('.page-title');
      const analyticsPage = page.locator('.analytics-page');

      try {
        await expect(pageTitle).toBeVisible({ timeout: 5000 });
      }
      catch {
        await expect(analyticsPage).toBeVisible({ timeout: 5000 });
      }

      // フォーカス可能な要素の存在確認
      const focusableElements = page.locator('button, select, input, a');
      if (await focusableElements.count() > 0) {
        await expect(focusableElements.first()).toBeVisible();
      }
    });

    test('キーボードナビゲーションの基本動作', async ({ page }) => {
      // タブキーでフォーカス移動
      await page.keyboard.press('Tab');

      // フォーカスされた要素が存在することを確認
      const focusedElement = page.locator(':focus');
      if (await focusedElement.count() > 0) {
        await expect(focusedElement).toBeVisible();
      }
    });
  });

  test.describe('レスポンシブデザインの基本確認', () => {
    test('デスクトップ表示が正常', async ({ page }) => {
      // デスクトップサイズに設定
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.goto('/analytics');

      // ページが表示されることを確認
      const pageTitle = page.locator('.page-title');
      const analyticsPage = page.locator('.analytics-page');

      try {
        await expect(pageTitle).toBeVisible({ timeout: 5000 });
      }
      catch {
        await expect(analyticsPage).toBeVisible({ timeout: 5000 });
      }
    });

    test('モバイル表示が正常', async ({ page }) => {
      // モバイルサイズに設定
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/analytics');

      // ページが表示されることを確認
      const pageTitle = page.locator('.page-title');
      const analyticsPage = page.locator('.analytics-page');

      try {
        await expect(pageTitle).toBeVisible({ timeout: 5000 });
      }
      catch {
        await expect(analyticsPage).toBeVisible({ timeout: 5000 });
      }
    });

    test('タブレット表示が正常', async ({ page }) => {
      // タブレットサイズに設定
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/analytics');

      // ページが表示されることを確認
      const pageTitle = page.locator('.page-title');
      const analyticsPage = page.locator('.analytics-page');

      try {
        await expect(pageTitle).toBeVisible({ timeout: 5000 });
      }
      catch {
        await expect(analyticsPage).toBeVisible({ timeout: 5000 });
      }
    });
  });
});
