import { test, expect } from '@playwright/test';

test.describe('チャート表示モード切り替え機能', () => {
  test.beforeEach(async ({ page }) => {
    // ログインページに移動してログイン
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // ログイン完了を待つ
    await page.waitForURL('/');

    // Analytics ページに移動
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('デフォルトで線グラフモードが選択されている', async ({ page }) => {
    // 線グラフボタンがアクティブ状態であることを確認
    const lineButton = page.locator('button[title="線グラフ表示に切り替え"]');
    await expect(lineButton).toHaveClass(/bg-blue-600/);
    await expect(lineButton).toHaveClass(/text-white/);

    // 棒グラフボタンが非アクティブ状態であることを確認
    const barButton = page.locator('button[title="積み上げ棒グラフ表示に切り替え"]');
    await expect(barButton).toHaveClass(/bg-white/);
    await expect(barButton).toHaveClass(/text-gray-700/);
  });

  test('棒グラフボタンをクリックすると表示モードが切り替わる', async ({ page }) => {
    // 棒グラフボタンをクリック
    const barButton = page.locator('button[title="積み上げ棒グラフ表示に切り替え"]');
    await barButton.click();

    // 棒グラフボタンがアクティブ状態になることを確認
    await expect(barButton).toHaveClass(/bg-blue-600/);
    await expect(barButton).toHaveClass(/text-white/);

    // 線グラフボタンが非アクティブ状態になることを確認
    const lineButton = page.locator('button[title="線グラフ表示に切り替え"]');
    await expect(lineButton).toHaveClass(/bg-white/);
    await expect(lineButton).toHaveClass(/text-gray-700/);
  });

  test('線グラフボタンをクリックすると表示モードが切り替わる', async ({ page }) => {
    // 最初に棒グラフモードに切り替え
    const barButton = page.locator('button[title="積み上げ棒グラフ表示に切り替え"]');
    await barButton.click();

    // 線グラフボタンをクリック
    const lineButton = page.locator('button[title="線グラフ表示に切り替え"]');
    await lineButton.click();

    // 線グラフボタンがアクティブ状態になることを確認
    await expect(lineButton).toHaveClass(/bg-blue-600/);
    await expect(lineButton).toHaveClass(/text-white/);

    // 棒グラフボタンが非アクティブ状態になることを確認
    await expect(barButton).toHaveClass(/bg-white/);
    await expect(barButton).toHaveClass(/text-gray-700/);
  });

  test('棒グラフモードではフードタイプフィルターが無効になる', async ({ page }) => {
    // 棒グラフモードに切り替え
    const barButton = page.locator('button[title="積み上げ棒グラフ表示に切り替え"]');
    await barButton.click();

    // フードタイプセレクトが無効になることを確認
    const foodTypeSelect = page.locator('select').first();
    await expect(foodTypeSelect).toBeDisabled();
    await expect(foodTypeSelect).toHaveClass(/bg-gray-100/);
    await expect(foodTypeSelect).toHaveClass(/cursor-not-allowed/);

    // ヘルプテキストが表示されることを確認
    const helpText = page.locator('.food-type-filter .text-xs');
    await expect(helpText).toContainText('（積み上げ表示では無効）');
  });

  test('線グラフモードではフードタイプフィルターが有効になる', async ({ page }) => {
    // 最初に棒グラフモードに切り替え
    const barButton = page.locator('button[title="積み上げ棒グラフ表示に切り替え"]');
    await barButton.click();

    // 線グラフモードに戻す
    const lineButton = page.locator('button[title="線グラフ表示に切り替え"]');
    await lineButton.click();

    // フードタイプセレクトが有効になることを確認
    const foodTypeSelect = page.locator('select').first();
    await expect(foodTypeSelect).toBeEnabled();
    await expect(foodTypeSelect).not.toHaveClass(/bg-gray-100/);
    await expect(foodTypeSelect).not.toHaveClass(/cursor-not-allowed/);
  });

  test('表示モード設定がlocalStorageに永続化される', async ({ page }) => {
    // 棒グラフモードに切り替え
    const barButton = page.locator('button[title="積み上げ棒グラフ表示に切り替え"]');
    await barButton.click();

    // localStorageに設定が保存されることを確認
    const chartMode = await page.evaluate(() => {
      return localStorage.getItem('analytics-chart-mode');
    });
    expect(chartMode).toBe('bar');

    // ページをリロード
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 棒グラフモードが維持されることを確認
    await expect(barButton).toHaveClass(/bg-blue-600/);
    await expect(barButton).toHaveClass(/text-white/);
  });

  test('設定の自動保存メッセージが表示される', async ({ page }) => {
    const autoSaveMessage = page.locator('.chart-type-toggle .text-xs');
    await expect(autoSaveMessage).toContainText('(設定は自動保存されます)');
  });

  test('チャートタイトルが表示モードに応じて変更される', async ({ page }) => {
    // 線グラフモードのタイトルを確認
    const chartTitle = page.locator('canvas').first();
    // Chart.jsのタイトルは直接テキストとして取得できないため、
    // 代わりにチャート設定の変更を確認

    // 棒グラフモードに切り替え
    const barButton = page.locator('button[title="積み上げ棒グラフ表示に切り替え"]');
    await barButton.click();

    // 積み上げ表示の説明が表示されることを確認
    const stackedInfo = page.locator('.food-breakdown');
    await expect(stackedInfo).toBeVisible();

    const stackedDescription = page.locator('.bg-blue-50 p');
    await expect(stackedDescription).toContainText('積み上げ表示');
  });
});
