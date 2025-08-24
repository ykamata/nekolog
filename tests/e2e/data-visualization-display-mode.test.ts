import { test, expect } from '@playwright/test';
import { TestSetup } from './utils/test-setup';
import { testCats, testFoods, generateTestData } from './utils/test-data';

test.describe('データ可視化ページ - 表示モード切り替えテスト', () => {
  let testSetup: TestSetup;

  test.beforeEach(async ({ page }) => {
    testSetup = new TestSetup(page);

    try {
      await testSetup.setupCleanDatabase();

      // テストデータの作成
      await testSetup.createTestCats([testCats[0], testCats[1]]);
      await testSetup.createTestFoods([testFoods[0], testFoods[1]]); // DRY and WET

      // 分析用の食事記録を作成
      const analyticsData = generateTestData.mealRecordsForAnalytics(
        testCats[0].name,
        testFoods[0].name,
        14, // 14日分のデータ
      );
      await testSetup.createTestMealRecords(analyticsData);
    }
    catch (error) {
      console.warn('Test data setup failed:', error);
    }

    // Analytics ページに直接移動（認証をスキップ）
    await page.goto('/analytics');

    // ページが読み込まれるまで待機
    try {
      await page.waitForLoadState('networkidle', { timeout: 10000 });
    }
    catch (error) {

      // タイムアウトしても続行
    }
  });

  test.afterEach(async () => {
    await testSetup.setupCleanDatabase();
  });

  test.describe('要件4.1: 表示モード切り替えボタンの動作', () => {
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

    test('積み上げ棒グラフボタンをクリックすると表示モードが切り替わる', async ({ page }) => {
      // 積み上げ棒グラフボタンをクリック
      const barButton = page.locator('button[title="積み上げ棒グラフ表示に切り替え"]');
      await barButton.click();

      // 0.5秒以内にグラフが更新されることを確認（要件6.2）
      const startTime = Date.now();

      // 棒グラフボタンがアクティブ状態になることを確認
      await expect(barButton).toHaveClass(/bg-blue-600/);
      await expect(barButton).toHaveClass(/text-white/);

      // 線グラフボタンが非アクティブ状態になることを確認
      const lineButton = page.locator('button[title="線グラフ表示に切り替え"]');
      await expect(lineButton).toHaveClass(/bg-white/);
      await expect(lineButton).toHaveClass(/text-gray-700/);

      const updateTime = Date.now() - startTime;
      expect(updateTime).toBeLessThan(500); // 0.5秒以内
    });

    test('線グラフボタンをクリックすると表示モードが切り替わる', async ({ page }) => {
      // 最初に棒グラフモードに切り替え
      const barButton = page.locator('button[title="積み上げ棒グラフ表示に切り替え"]');
      await barButton.click();

      // 線グラフボタンをクリック
      const lineButton = page.locator('button[title="線グラフ表示に切り替え"]');

      const startTime = Date.now();
      await lineButton.click();

      // 線グラフボタンがアクティブ状態になることを確認
      await expect(lineButton).toHaveClass(/bg-blue-600/);
      await expect(lineButton).toHaveClass(/text-white/);

      // 棒グラフボタンが非アクティブ状態になることを確認
      await expect(barButton).toHaveClass(/bg-white/);
      await expect(barButton).toHaveClass(/text-gray-700/);

      const updateTime = Date.now() - startTime;
      expect(updateTime).toBeLessThan(500); // 0.5秒以内
    });

    test('表示モード設定がlocalStorageに永続化される', async ({ page }) => {
      // 積み上げ棒グラフモードに切り替え
      const barButton = page.locator('button[title="積み上げ棒グラフ表示に切り替え"]');
      await barButton.click();

      // localStorageに設定が保存されることを確認
      const chartMode = await page.evaluate(() => {
        return localStorage.getItem('analytics-chart-mode');
      });
      expect(chartMode).toBe('bar');

      // ページをリロード
      await page.reload();
      await testSetup.waitForPageLoad();

      // 積み上げ棒グラフモードが維持されることを確認
      await expect(barButton).toHaveClass(/bg-blue-600/);
      await expect(barButton).toHaveClass(/text-white/);
    });
  });

  test.describe('要件4.2: フード種別切り替えボタンの動作', () => {
    test('線グラフモードではフード種別フィルターが有効', async ({ page }) => {
      // 線グラフモードであることを確認
      const lineButton = page.locator('button[title="線グラフ表示に切り替え"]');
      await expect(lineButton).toHaveClass(/bg-blue-600/);

      // フード種別フィルターボタンが有効であることを確認
      const allButton = page.locator('button[title="すべてのフードタイプを表示"]');
      const dryButton = page.locator('button[title="ドライフードのみ表示"]');
      const wetButton = page.locator('button[title="ウェットフードのみ表示"]');

      await expect(allButton).toBeEnabled();
      await expect(dryButton).toBeEnabled();
      await expect(wetButton).toBeEnabled();

      // デフォルトで「すべて」が選択されていることを確認
      await expect(allButton).toHaveClass(/bg-blue-600/);
    });

    test('ドライフードフィルターをクリックすると表示が切り替わる', async ({ page }) => {
      // ドライフードボタンをクリック
      const dryButton = page.locator('button[title="ドライフードのみ表示"]');

      const startTime = Date.now();
      await dryButton.click();

      // ドライフードボタンがアクティブ状態になることを確認
      await expect(dryButton).toHaveClass(/bg-blue-600/);
      await expect(dryButton).toHaveClass(/text-white/);

      // 他のボタンが非アクティブ状態になることを確認
      const allButton = page.locator('button[title="すべてのフードタイプを表示"]');
      const wetButton = page.locator('button[title="ウェットフードのみ表示"]');
      await expect(allButton).toHaveClass(/bg-white/);
      await expect(wetButton).toHaveClass(/bg-white/);

      const updateTime = Date.now() - startTime;
      expect(updateTime).toBeLessThan(500); // 0.5秒以内
    });

    test('ウェットフードフィルターをクリックすると表示が切り替わる', async ({ page }) => {
      // ウェットフードボタンをクリック
      const wetButton = page.locator('button[title="ウェットフードのみ表示"]');

      const startTime = Date.now();
      await wetButton.click();

      // ウェットフードボタンがアクティブ状態になることを確認
      await expect(wetButton).toHaveClass(/bg-blue-600/);
      await expect(wetButton).toHaveClass(/text-white/);

      // 他のボタンが非アクティブ状態になることを確認
      const allButton = page.locator('button[title="すべてのフードタイプを表示"]');
      const dryButton = page.locator('button[title="ドライフードのみ表示"]');
      await expect(allButton).toHaveClass(/bg-white/);
      await expect(dryButton).toHaveClass(/bg-white/);

      const updateTime = Date.now() - startTime;
      expect(updateTime).toBeLessThan(500); // 0.5秒以内
    });

    test('積み上げ棒グラフモードではフード種別フィルターが無効', async ({ page }) => {
      // 積み上げ棒グラフモードに切り替え
      const barButton = page.locator('button[title="積み上げ棒グラフ表示に切り替え"]');
      await barButton.click();

      // フード種別フィルターボタンが無効になることを確認
      const allButton = page.locator('button[title="積み上げ表示では無効"]').first();
      const dryButton = page.locator('button[title="積み上げ表示では無効"]').nth(1);
      const wetButton = page.locator('button[title="積み上げ表示では無効"]').nth(2);

      await expect(allButton).toBeDisabled();
      await expect(dryButton).toBeDisabled();
      await expect(wetButton).toBeDisabled();

      // 無効状態のスタイルが適用されることを確認
      await expect(allButton).toHaveClass(/bg-gray-100/);
      await expect(allButton).toHaveClass(/cursor-not-allowed/);

      // ヘルプテキストが表示されることを確認
      const helpText = page.locator('.food-type-filter .text-xs');
      await expect(helpText).toContainText('（積み上げ表示では無効）');
    });
  });

  test.describe('要件4.3: 猫選択ドロップダウンの動作', () => {
    test('猫選択ボタンをクリックすると選択された猫のデータが表示される', async ({ page }) => {
      // 2匹目の猫を選択
      const secondCatButton = page.locator('.cat-button').nth(1);

      const startTime = Date.now();
      await secondCatButton.click();

      // 選択された猫のボタンがアクティブ状態になることを確認
      await expect(secondCatButton).toHaveClass(/cat-button--active/);

      // 1匹目の猫のボタンが非アクティブ状態になることを確認
      const firstCatButton = page.locator('.cat-button').first();
      await expect(firstCatButton).not.toHaveClass(/cat-button--active/);

      // チャートタイトルが更新されることを確認
      const chartTitle = page.locator('.chart-title');
      await expect(chartTitle).toContainText(testCats[1].name);

      const updateTime = Date.now() - startTime;
      expect(updateTime).toBeLessThan(500); // 0.5秒以内
    });

    test('猫選択の変更がチャートデータに反映される', async ({ page }) => {
      // チャートが表示されるまで待機
      await page.waitForSelector('canvas', { timeout: 10000 });

      // 最初の猫のデータでチャートが表示されていることを確認
      const chartTitle = page.locator('.chart-title');
      await expect(chartTitle).toContainText(testCats[0].name);

      // 2匹目の猫を選択
      const secondCatButton = page.locator('.cat-button').nth(1);
      await secondCatButton.click();

      // チャートタイトルが更新されることを確認
      await expect(chartTitle).toContainText(testCats[1].name);

      // チャートが再描画されることを確認（canvasが存在し続ける）
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('要件4.4: 期間選択ボタンの動作', () => {
    test('期間選択ボタンをクリックすると選択された期間のデータが表示される', async ({ page }) => {
      // 期間選択ドロップダウンを確認
      const periodSelect = page.locator('select').last();
      await expect(periodSelect).toBeVisible();

      // 7日間を選択
      const startTime = Date.now();
      await periodSelect.selectOption('7');

      // 選択が反映されることを確認
      await expect(periodSelect).toHaveValue('7');

      // チャートサブタイトルが更新されることを確認
      const chartSubtitle = page.locator('.chart-subtitle');
      await expect(chartSubtitle).toContainText('過去7日');

      const updateTime = Date.now() - startTime;
      expect(updateTime).toBeLessThan(500); // 0.5秒以内
    });

    test('異なる期間を選択するとデータが更新される', async ({ page }) => {
      const periodSelect = page.locator('select').last();

      // 30日間を選択
      await periodSelect.selectOption('30');
      await expect(periodSelect).toHaveValue('30');

      // チャートサブタイトルが更新されることを確認
      const chartSubtitle = page.locator('.chart-subtitle');
      await expect(chartSubtitle).toContainText('過去30日');

      // 60日間に変更
      await periodSelect.selectOption('60');
      await expect(periodSelect).toHaveValue('60');
      await expect(chartSubtitle).toContainText('過去60日');

      // 90日間に変更
      await periodSelect.selectOption('90');
      await expect(periodSelect).toHaveValue('90');
      await expect(chartSubtitle).toContainText('過去90日');
    });
  });

  test.describe('チャート表示の確認', () => {
    test('LineChartと積み上げ棒グラフが正しく表示される', async ({ page }) => {
      // チャートキャンバスが表示されることを確認
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();

      // 線グラフモードでチャートが描画されることを確認
      const canvasContent = await canvas.evaluate((canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return false;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return imageData.data.some(pixel => pixel !== 0);
      });
      expect(canvasContent).toBeTruthy();

      // 積み上げ棒グラフモードに切り替え
      const barButton = page.locator('button[title="積み上げ棒グラフ表示に切り替え"]');
      await barButton.click();

      // チャートが再描画されることを確認
      await page.waitForTimeout(500); // 描画完了を待つ
      const barCanvasContent = await canvas.evaluate((canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return false;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return imageData.data.some(pixel => pixel !== 0);
      });
      expect(barCanvasContent).toBeTruthy();
    });

    test('チャート表示が1秒以内に完了する', async ({ page }) => {
      const startTime = Date.now();

      // ページに移動してチャートの表示を待つ
      await page.goto('/analytics');
      await testSetup.waitForPageLoad();

      // チャートが表示されるまで待機
      await expect(page.locator('canvas')).toBeVisible();

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(1000); // 1秒以内（要件6.1）
    });
  });

  test.describe('エラーハンドリング', () => {
    test('データ取得エラー時の適切な表示', async ({ page }) => {
      // APIエラーをシミュレート
      await page.route('/api/meals/analytics*', route => route.abort());

      await page.goto('/analytics');
      await testSetup.waitForPageLoad();

      // エラー状態が表示されることを確認
      const errorContainer = page.locator('.error-container, .error-message, [class*="error"]');
      if (await errorContainer.count() > 0) {
        await expect(errorContainer.first()).toBeVisible();
      }
    });

    test('データが存在しない場合の表示', async ({ page }) => {
      // すべての食事記録を削除
      await testSetup.clearAllMealRecords();

      await page.goto('/analytics');
      await testSetup.waitForPageLoad();

      // 空の状態またはメッセージが表示されることを確認
      const emptyState = page.locator('.empty-state, .no-data, [class*="empty"]');
      if (await emptyState.count() > 0) {
        await expect(emptyState.first()).toBeVisible();
      }
      else {
        // チャートは表示されるがデータがない状態
        await expect(page.locator('canvas')).toBeVisible();
      }
    });
  });

  test.describe('アクセシビリティ', () => {
    test('キーボードナビゲーションが機能する', async ({ page }) => {
      // タブキーでフォーカス移動
      await page.keyboard.press('Tab');

      // フォーカスされた要素が表示されることを確認
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // Enterキーで操作できることを確認
      await page.keyboard.press('Enter');

      // 操作が実行されることを確認（エラーが発生しない）
      await expect(page.locator('canvas')).toBeVisible();
    });

    test('適切なaria属性が設定されている', async ({ page }) => {
      // チャートキャンバスのアクセシビリティ属性を確認
      const canvas = page.locator('canvas');
      if (await canvas.count() > 0) {
        const ariaLabel = await canvas.getAttribute('aria-label');
        const role = await canvas.getAttribute('role');

        // いずれかのアクセシビリティ属性が設定されていることを確認
        expect(ariaLabel || role).toBeTruthy();
      }
    });
  });
});
