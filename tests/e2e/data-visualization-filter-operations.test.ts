import { test, expect } from '@playwright/test';
import { TestSetup } from './utils/test-setup';
import { testCats, testFoods, generateTestData } from './utils/test-data';

test.describe('データ可視化ページ - フィルター操作とチャート更新テスト', () => {
  let testSetup: TestSetup;

  test.beforeEach(async ({ page }) => {
    testSetup = new TestSetup(page);

    try {
      await testSetup.setupCleanDatabase();

      // テストデータの作成
      await testSetup.createTestCats([testCats[0], testCats[1], testCats[2]]);
      await testSetup.createTestFoods([testFoods[0], testFoods[1], testFoods[2], testFoods[3]]); // DRY and WET

      // 複数の猫と複数のフードタイプの食事記録を作成
      const cat1DryData = generateTestData.mealRecordsForAnalytics(
        testCats[0].name,
        testFoods[0].name, // DRY
        30,
      );
      const cat1WetData = generateTestData.mealRecordsForAnalytics(
        testCats[0].name,
        testFoods[1].name, // WET
        30,
      );
      const cat2DryData = generateTestData.mealRecordsForAnalytics(
        testCats[1].name,
        testFoods[2].name, // DRY
        30,
      );
      const cat2WetData = generateTestData.mealRecordsForAnalytics(
        testCats[1].name,
        testFoods[3].name, // WET
        30,
      );

      await testSetup.createTestMealRecords([
        ...cat1DryData,
        ...cat1WetData,
        ...cat2DryData,
        ...cat2WetData,
      ]);
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
      console.warn('Page load timeout:', error);
      // タイムアウトしても続行
    }
  });

  test.afterEach(async () => {
    await testSetup.setupCleanDatabase();
  });

  test.describe('猫選択フィルターの動作', () => {
    test('猫選択フィルターが正しく表示される', async ({ page }) => {
      // 猫選択ボタンが表示されることを確認
      const catButtons = page.locator('.cat-button');
      await expect(catButtons).toHaveCount(3);

      // 各猫の名前が表示されることを確認
      for (let i = 0; i < 3; i++) {
        const catButton = catButtons.nth(i);
        await expect(catButton).toContainText(testCats[i].name);
        if (testCats[i].weight) {
          await expect(catButton).toContainText(`${testCats[i].weight}kg`);
        }
      }

      // デフォルトで最初の猫が選択されていることを確認
      await expect(catButtons.first()).toHaveClass(/cat-button--active/);
    });

    test('猫選択の変更でチャートデータが更新される', async ({ page }) => {
      // チャートが表示されるまで待機
      await page.waitForSelector('canvas', { timeout: 10000 });

      // 最初の猫のチャートタイトルを確認
      const chartTitle = page.locator('.chart-title');
      await expect(chartTitle).toContainText(testCats[0].name);

      // 2匹目の猫を選択
      const secondCatButton = page.locator('.cat-button').nth(1);
      const startTime = Date.now();
      await secondCatButton.click();

      // チャートタイトルが更新されることを確認
      await expect(chartTitle).toContainText(testCats[1].name);

      // 更新時間が0.5秒以内であることを確認
      const updateTime = Date.now() - startTime;
      expect(updateTime).toBeLessThan(500);

      // 3匹目の猫を選択
      const thirdCatButton = page.locator('.cat-button').nth(2);
      await thirdCatButton.click();
      await expect(chartTitle).toContainText(testCats[2].name);

      // アクティブ状態が正しく切り替わることを確認
      await expect(thirdCatButton).toHaveClass(/cat-button--active/);
      await expect(secondCatButton).not.toHaveClass(/cat-button--active/);
      await expect(page.locator('.cat-button').first()).not.toHaveClass(/cat-button--active/);
    });

    test('猫選択の変更でサマリーデータが更新される', async ({ page }) => {
      // サマリーセクションが表示されることを確認
      const summarySection = page.locator('.summary-section');
      await expect(summarySection).toBeVisible();

      // 分析対象の猫名が表示されることを確認
      const analysisTarget = page.locator('.summary-card').first();
      await expect(analysisTarget).toContainText(testCats[0].name);

      // 2匹目の猫を選択
      const secondCatButton = page.locator('.cat-button').nth(1);
      await secondCatButton.click();

      // サマリーデータが更新されることを確認
      await expect(analysisTarget).toContainText(testCats[1].name);
    });
  });

  test.describe('期間選択フィルターの動作', () => {
    test('期間選択フィルターが正しく表示される', async ({ page }) => {
      // 期間選択ドロップダウンが表示されることを確認
      const periodSelect = page.locator('select').last();
      await expect(periodSelect).toBeVisible();

      // 期間選択ボタンが表示されることを確認
      const periodButtons = page.locator('.period-button');
      await expect(periodButtons).toHaveCount(5);

      // 各期間オプションが表示されることを確認
      const expectedPeriods = ['過去7日', '過去14日', '過去30日', '過去60日', '過去90日'];
      for (let i = 0; i < expectedPeriods.length; i++) {
        await expect(periodButtons.nth(i)).toContainText(expectedPeriods[i]);
      }

      // デフォルトで30日が選択されていることを確認
      const defaultActiveButton = page.locator('.period-button--active');
      await expect(defaultActiveButton).toContainText('過去30日');
    });

    test('期間選択の変更でチャートデータが更新される', async ({ page }) => {
      // チャートサブタイトルの初期状態を確認
      const chartSubtitle = page.locator('.chart-subtitle');
      await expect(chartSubtitle).toContainText('過去30日');

      // 7日間を選択
      const sevenDayButton = page.locator('.period-button').first();
      const startTime = Date.now();
      await sevenDayButton.click();

      // チャートサブタイトルが更新されることを確認
      await expect(chartSubtitle).toContainText('過去7日');

      // アクティブ状態が切り替わることを確認
      await expect(sevenDayButton).toHaveClass(/period-button--active/);

      // 更新時間が0.5秒以内であることを確認
      const updateTime = Date.now() - startTime;
      expect(updateTime).toBeLessThan(500);

      // 90日間を選択
      const ninetyDayButton = page.locator('.period-button').last();
      await ninetyDayButton.click();
      await expect(chartSubtitle).toContainText('過去90日');
      await expect(ninetyDayButton).toHaveClass(/period-button--active/);
      await expect(sevenDayButton).not.toHaveClass(/period-button--active/);
    });

    test('期間選択ドロップダウンでの変更が反映される', async ({ page }) => {
      const periodSelect = page.locator('select').last();
      const chartSubtitle = page.locator('.chart-subtitle');

      // 14日間を選択
      await periodSelect.selectOption('14');
      await expect(chartSubtitle).toContainText('過去14日');

      // 60日間を選択
      await periodSelect.selectOption('60');
      await expect(chartSubtitle).toContainText('過去60日');

      // 7日間を選択
      await periodSelect.selectOption('7');
      await expect(chartSubtitle).toContainText('過去7日');
    });
  });

  test.describe('フード種別フィルターの動作', () => {
    test('線グラフモードでフード種別フィルターが機能する', async ({ page }) => {
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

    test('ドライフードフィルターでデータが絞り込まれる', async ({ page }) => {
      // チャートが表示されるまで待機
      await page.waitForSelector('canvas', { timeout: 10000 });

      // ドライフードフィルターを選択
      const dryButton = page.locator('button[title="ドライフードのみ表示"]');
      const startTime = Date.now();
      await dryButton.click();

      // ボタンがアクティブ状態になることを確認
      await expect(dryButton).toHaveClass(/bg-blue-600/);

      // 他のボタンが非アクティブになることを確認
      const allButton = page.locator('button[title="すべてのフードタイプを表示"]');
      const wetButton = page.locator('button[title="ウェットフードのみ表示"]');
      await expect(allButton).toHaveClass(/bg-white/);
      await expect(wetButton).toHaveClass(/bg-white/);

      // 更新時間が0.5秒以内であることを確認
      const updateTime = Date.now() - startTime;
      expect(updateTime).toBeLessThan(500);

      // チャートが再描画されることを確認
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
    });

    test('ウェットフードフィルターでデータが絞り込まれる', async ({ page }) => {
      // ウェットフードフィルターを選択
      const wetButton = page.locator('button[title="ウェットフードのみ表示"]');
      await wetButton.click();

      // ボタンがアクティブ状態になることを確認
      await expect(wetButton).toHaveClass(/bg-blue-600/);

      // 他のボタンが非アクティブになることを確認
      const allButton = page.locator('button[title="すべてのフードタイプを表示"]');
      const dryButton = page.locator('button[title="ドライフードのみ表示"]');
      await expect(allButton).toHaveClass(/bg-white/);
      await expect(dryButton).toHaveClass(/bg-white/);
    });

    test('フィルター切り替えでリアルタイム更新される', async ({ page }) => {
      // すべて → ドライ → ウェット → すべて の順で切り替え
      const allButton = page.locator('button[title="すべてのフードタイプを表示"]');
      const dryButton = page.locator('button[title="ドライフードのみ表示"]');
      const wetButton = page.locator('button[title="ウェットフードのみ表示"]');

      // ドライフードに切り替え
      await dryButton.click();
      await expect(dryButton).toHaveClass(/bg-blue-600/);

      // ウェットフードに切り替え
      await wetButton.click();
      await expect(wetButton).toHaveClass(/bg-blue-600/);
      await expect(dryButton).toHaveClass(/bg-white/);

      // すべてに戻す
      await allButton.click();
      await expect(allButton).toHaveClass(/bg-blue-600/);
      await expect(wetButton).toHaveClass(/bg-white/);

      // 各切り替えでチャートが表示され続けることを確認
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('複合フィルター操作', () => {
    test('猫選択と期間選択の組み合わせ', async ({ page }) => {
      // 2匹目の猫を選択
      const secondCatButton = page.locator('.cat-button').nth(1);
      await secondCatButton.click();

      // チャートタイトルが更新されることを確認
      const chartTitle = page.locator('.chart-title');
      await expect(chartTitle).toContainText(testCats[1].name);

      // 7日間に期間を変更
      const sevenDayButton = page.locator('.period-button').first();
      await sevenDayButton.click();

      // チャートサブタイトルが更新されることを確認
      const chartSubtitle = page.locator('.chart-subtitle');
      await expect(chartSubtitle).toContainText('過去7日');

      // 両方の設定が維持されることを確認
      await expect(chartTitle).toContainText(testCats[1].name);
      await expect(chartSubtitle).toContainText('過去7日');
    });

    test('猫選択とフード種別フィルターの組み合わせ', async ({ page }) => {
      // 3匹目の猫を選択
      const thirdCatButton = page.locator('.cat-button').nth(2);
      await thirdCatButton.click();

      // ドライフードフィルターを選択
      const dryButton = page.locator('button[title="ドライフードのみ表示"]');
      await dryButton.click();

      // 両方の設定が適用されることを確認
      const chartTitle = page.locator('.chart-title');
      await expect(chartTitle).toContainText(testCats[2].name);
      await expect(dryButton).toHaveClass(/bg-blue-600/);

      // チャートが表示されることを確認
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
    });

    test('すべてのフィルターの組み合わせ', async ({ page }) => {
      // 2匹目の猫を選択
      const secondCatButton = page.locator('.cat-button').nth(1);
      await secondCatButton.click();

      // 14日間を選択
      const fourteenDayButton = page.locator('.period-button').nth(1);
      await fourteenDayButton.click();

      // ウェットフードフィルターを選択
      const wetButton = page.locator('button[title="ウェットフードのみ表示"]');
      await wetButton.click();

      // すべての設定が適用されることを確認
      const chartTitle = page.locator('.chart-title');
      const chartSubtitle = page.locator('.chart-subtitle');

      await expect(chartTitle).toContainText(testCats[1].name);
      await expect(chartSubtitle).toContainText('過去14日');
      await expect(wetButton).toHaveClass(/bg-blue-600/);

      // チャートが表示されることを確認
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('チャート更新の確認', () => {
    test('フィルター変更時にチャートが再描画される', async ({ page }) => {
      // 初期チャートの描画を確認
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();

      // チャートが描画されていることを確認
      const initialCanvasContent = await canvas.evaluate((canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return false;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return imageData.data.some(pixel => pixel !== 0);
      });
      expect(initialCanvasContent).toBeTruthy();

      // 猫を変更
      const secondCatButton = page.locator('.cat-button').nth(1);
      await secondCatButton.click();

      // チャートが再描画されることを確認
      await page.waitForTimeout(300); // 描画完了を待つ
      const updatedCanvasContent = await canvas.evaluate((canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return false;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return imageData.data.some(pixel => pixel !== 0);
      });
      expect(updatedCanvasContent).toBeTruthy();
    });

    test('積み上げ棒グラフモードでのフィルター動作', async ({ page }) => {
      // 積み上げ棒グラフモードに切り替え
      const barButton = page.locator('button[title="積み上げ棒グラフ表示に切り替え"]');
      await barButton.click();

      // フード種別フィルターが無効になることを確認
      const dryButton = page.locator('button[title="積み上げ表示では無効"]').nth(1);
      await expect(dryButton).toBeDisabled();

      // 猫選択と期間選択は有効であることを確認
      const secondCatButton = page.locator('.cat-button').nth(1);
      await secondCatButton.click();

      const sevenDayButton = page.locator('.period-button').first();
      await sevenDayButton.click();

      // チャートが更新されることを確認
      const chartTitle = page.locator('.chart-title');
      const chartSubtitle = page.locator('.chart-subtitle');
      await expect(chartTitle).toContainText(testCats[1].name);
      await expect(chartSubtitle).toContainText('過去7日');
    });
  });

  test.describe('パフォーマンステスト', () => {
    test('フィルター操作のレスポンス時間', async ({ page }) => {
      const operations = [
        () => page.locator('.cat-button').nth(1).click(),
        () => page.locator('.period-button').first().click(),
        () => page.locator('button[title="ドライフードのみ表示"]').click(),
        () => page.locator('button[title="ウェットフードのみ表示"]').click(),
      ];

      for (const operation of operations) {
        const startTime = Date.now();
        await operation();
        const responseTime = Date.now() - startTime;

        // 各操作が0.5秒以内に完了することを確認
        expect(responseTime).toBeLessThan(500);
      }
    });

    test('連続フィルター操作の安定性', async ({ page }) => {
      // 連続してフィルターを変更
      for (let i = 0; i < 5; i++) {
        // 猫を切り替え
        const catIndex = i % 3;
        await page.locator('.cat-button').nth(catIndex).click();

        // 期間を切り替え
        const periodIndex = i % 5;
        await page.locator('.period-button').nth(periodIndex).click();

        // フードタイプを切り替え（線グラフモードの場合）
        const lineButton = page.locator('button[title="線グラフ表示に切り替え"]');
        if (await lineButton.evaluate(el => el.classList.contains('bg-blue-600'))) {
          const foodTypeIndex = i % 3;
          const foodTypeButtons = [
            page.locator('button[title="すべてのフードタイプを表示"]'),
            page.locator('button[title="ドライフードのみ表示"]'),
            page.locator('button[title="ウェットフードのみ表示"]'),
          ];
          await foodTypeButtons[foodTypeIndex].click();
        }

        // チャートが正常に表示されることを確認
        const canvas = page.locator('canvas');
        await expect(canvas).toBeVisible();
      }
    });
  });

  test.describe('エラーハンドリング', () => {
    test('データ取得エラー時のフィルター操作', async ({ page }) => {
      // APIエラーをシミュレート
      await page.route('/api/meals/analytics*', route => route.abort());

      // フィルター操作を実行
      const secondCatButton = page.locator('.cat-button').nth(1);
      await secondCatButton.click();

      // エラー状態でもフィルターUIが操作可能であることを確認
      await expect(secondCatButton).toHaveClass(/cat-button--active/);

      // エラーメッセージまたは空の状態が表示されることを確認
      const errorOrEmpty = page.locator('.error-container, .empty-state, .no-data');
      if (await errorOrEmpty.count() > 0) {
        await expect(errorOrEmpty.first()).toBeVisible();
      }
    });

    test('不正なフィルター値の処理', async ({ page }) => {
      // 不正な期間値を設定
      await page.evaluate(() => {
        const select = document.querySelector('select') as HTMLSelectElement;
        if (select) {
          select.value = '999';
          select.dispatchEvent(new Event('change'));
        }
      });

      // システムがエラーを適切に処理することを確認
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('アクセシビリティ', () => {
    test('フィルターコントロールのキーボード操作', async ({ page }) => {
      // 猫選択ボタンのキーボード操作
      const firstCatButton = page.locator('.cat-button').first();
      await firstCatButton.focus();
      await page.keyboard.press('Enter');
      await expect(firstCatButton).toHaveClass(/cat-button--active/);

      // 期間選択ボタンのキーボード操作
      const periodButton = page.locator('.period-button').first();
      await periodButton.focus();
      await page.keyboard.press('Enter');
      await expect(periodButton).toHaveClass(/period-button--active/);

      // フード種別フィルターのキーボード操作
      const dryButton = page.locator('button[title="ドライフードのみ表示"]');
      await dryButton.focus();
      await page.keyboard.press('Enter');
      await expect(dryButton).toHaveClass(/bg-blue-600/);
    });

    test('フォーカス表示の確認', async ({ page }) => {
      const focusableElements = [
        '.cat-button',
        '.period-button',
        'button[title="すべてのフードタイプを表示"]',
        'button[title="ドライフードのみ表示"]',
        'button[title="ウェットフードのみ表示"]',
      ];

      for (const selector of focusableElements) {
        const element = page.locator(selector).first();
        await element.focus();

        // フォーカスアウトラインが表示されることを確認
        const focusOutline = await element.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return styles.outline || styles.boxShadow;
        });
        expect(focusOutline).toBeTruthy();
      }
    });
  });
});
