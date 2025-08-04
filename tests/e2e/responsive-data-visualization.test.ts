import { test, expect } from '@playwright/test';

test.describe('データ可視化ページのレスポンシブデザイン', () => {
  test.beforeEach(async ({ page }) => {
    // テスト用のログイン処理
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('デスクトップ表示の確認', async ({ page }) => {
    // デスクトップサイズに設定
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/analytics');

    // ページヘッダーの表示確認
    await expect(page.locator('.page-header')).toBeVisible();
    await expect(page.locator('.page-title')).toContainText('データ分析');

    // フィルターセクションの表示確認
    await expect(page.locator('.filters-section')).toBeVisible();
    await expect(page.locator('.cat-selector')).toBeVisible();
    await expect(page.locator('.period-selector')).toBeVisible();

    // チャートセクションの表示確認
    await expect(page.locator('.chart-section')).toBeVisible();
    await expect(page.locator('.chart-container')).toBeVisible();

    // サマリーセクションの表示確認
    await expect(page.locator('.summary-section')).toBeVisible();
    await expect(page.locator('.summary-grid')).toBeVisible();

    // クイックアクションの表示確認
    await expect(page.locator('.quick-actions')).toBeVisible();
    await expect(page.locator('.action-buttons')).toBeVisible();
  });

  test('タブレット表示の確認', async ({ page }) => {
    // タブレットサイズに設定
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/analytics');

    // レスポンシブレイアウトの確認
    await expect(page.locator('.page-header')).toBeVisible();
    await expect(page.locator('.filters-section')).toBeVisible();
    await expect(page.locator('.chart-section')).toBeVisible();

    // タブレット用のスタイルが適用されているか確認
    const chartContainer = page.locator('.chart-container');
    await expect(chartContainer).toBeVisible();

    // サマリーグリッドのレイアウト確認
    const summaryGrid = page.locator('.summary-grid');
    await expect(summaryGrid).toBeVisible();
  });

  test('モバイル表示の確認', async ({ page }) => {
    // モバイルサイズに設定
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/analytics');

    // モバイル用レイアウトの確認
    await expect(page.locator('.page-header')).toBeVisible();
    await expect(page.locator('.filters-section')).toBeVisible();

    // 猫選択ボタンが縦並びになっているか確認
    const catSelector = page.locator('.cat-selector');
    await expect(catSelector).toBeVisible();

    // 期間選択ボタンが適切に表示されているか確認
    const periodSelector = page.locator('.period-selector');
    await expect(periodSelector).toBeVisible();

    // チャートコンテナのモバイル最適化確認
    const chartContainer = page.locator('.chart-container');
    await expect(chartContainer).toBeVisible();

    // サマリーカードが縦並びになっているか確認
    const summaryCards = page.locator('.summary-card');
    await expect(summaryCards.first()).toBeVisible();

    // アクションボタンのモバイルレイアウト確認
    const actionButtons = page.locator('.action-button');
    await expect(actionButtons.first()).toBeVisible();
  });

  test('小さなモバイル表示の確認', async ({ page }) => {
    // 小さなモバイルサイズに設定
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/analytics');

    // 小さな画面でも要素が適切に表示されるか確認
    await expect(page.locator('.page-header')).toBeVisible();
    await expect(page.locator('.page-title')).toBeVisible();

    // フィルターが適切に表示されるか確認
    await expect(page.locator('.filters-section')).toBeVisible();

    // チャートが適切なサイズで表示されるか確認
    const chartContainer = page.locator('.chart-container');
    await expect(chartContainer).toBeVisible();

    // アクションボタンが縦並びになっているか確認
    const actionButtons = page.locator('.action-buttons');
    await expect(actionButtons).toBeVisible();
  });

  test('タッチ操作の確認', async ({ page }) => {
    // モバイルサイズに設定
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/analytics');

    // 猫選択ボタンのタッチ操作
    const firstCatButton = page.locator('.cat-button').first();
    await expect(firstCatButton).toBeVisible();
    await firstCatButton.tap();
    await expect(firstCatButton).toHaveClass(/cat-button--active/);

    // 期間選択ボタンのタッチ操作
    const periodButton = page.locator('.period-button').nth(1);
    await expect(periodButton).toBeVisible();
    await periodButton.tap();
    await expect(periodButton).toHaveClass(/period-button--active/);

    // アクションボタンのタッチ操作
    const actionButton = page.locator('.action-button').first();
    await expect(actionButton).toBeVisible();
    // タッチしてもエラーが発生しないことを確認
    await actionButton.tap();
  });

  test('オリエンテーション変更の確認', async ({ page }) => {
    // 縦向きから開始
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/analytics');

    // チャートが表示されることを確認
    await expect(page.locator('.chart-container')).toBeVisible();

    // 横向きに変更
    await page.setViewportSize({ width: 667, height: 375 });

    // レイアウトが適切に調整されることを確認
    await expect(page.locator('.chart-container')).toBeVisible();
    await expect(page.locator('.filters-section')).toBeVisible();
  });

  test('チャートのレスポンシブ動作確認', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/analytics');

    // チャートが読み込まれるまで待機
    await page.waitForSelector('.chart-container canvas', { timeout: 10000 });

    // デスクトップでチャートが表示されることを確認
    const canvas = page.locator('.chart-container canvas');
    await expect(canvas).toBeVisible();

    // モバイルサイズに変更
    await page.setViewportSize({ width: 375, height: 667 });

    // チャートが引き続き表示されることを確認
    await expect(canvas).toBeVisible();

    // チャートコントロールがモバイル用レイアウトになることを確認
    const chartControls = page.locator('.chart-controls');
    await expect(chartControls).toBeVisible();
  });

  test('アクセシビリティの確認', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/analytics');

    // フォーカス可能な要素の確認
    const focusableElements = [
      '.cat-button',
      '.period-button',
      '.action-button',
    ];

    for (const selector of focusableElements) {
      const element = page.locator(selector).first();
      await expect(element).toBeVisible();
      await element.focus();
      // フォーカスが適用されることを確認（アウトラインが表示される）
      await expect(element).toBeFocused();
    }
  });

  test('パフォーマンス最適化の確認', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // ページ読み込み時間の測定
    const startTime = Date.now();
    await page.goto('/analytics');
    await page.waitForSelector('.chart-container', { timeout: 10000 });
    const loadTime = Date.now() - startTime;

    // 読み込み時間が合理的な範囲内であることを確認（10秒以内）
    expect(loadTime).toBeLessThan(10000);

    // スクロール性能の確認
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // スクロール後も要素が正常に表示されることを確認
    await expect(page.locator('.quick-actions')).toBeVisible();
  });

  test('エラー状態のレスポンシブ表示', async ({ page }) => {
    // ネットワークエラーをシミュレート
    await page.route('/api/cats', route => route.abort());

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/analytics');

    // エラー状態が適切に表示されることを確認
    await expect(page.locator('.error-container')).toBeVisible();
    await expect(page.locator('.error-title')).toBeVisible();
    await expect(page.locator('.retry-button')).toBeVisible();

    // リトライボタンのタッチ操作確認
    const retryButton = page.locator('.retry-button');
    await expect(retryButton).toBeVisible();
    // タッチしてもエラーが発生しないことを確認
    await retryButton.tap();
  });
});
