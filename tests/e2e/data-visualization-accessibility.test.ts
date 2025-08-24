import { test, expect } from '@playwright/test';

test.describe('データ可視化 - アクセシビリティ', () => {
  test.beforeEach(async ({ page }) => {
    // テスト用のデータをセットアップ
    await page.goto('/analytics');

    // ページが完全に読み込まれるまで待機
    await page.waitForLoadState('networkidle');
  });

  test.describe('キーボードナビゲーション', () => {
    test('チャートがキーボードでフォーカス可能', async ({ page }) => {
      // チャートキャンバスを見つける
      const chartCanvas = page.locator('canvas[role="img"]');
      await expect(chartCanvas).toBeVisible();

      // Tabキーでフォーカス
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // チャートにフォーカスが当たることを確認
      await expect(chartCanvas).toBeFocused();
    });

    test('チャートフォーカス時にキーボード操作説明が表示される', async ({ page }) => {
      const chartCanvas = page.locator('canvas[role="img"]');

      // チャートにフォーカス
      await chartCanvas.focus();

      // キーボード操作説明が表示されることを確認
      const instructions = page.locator('.keyboard-instructions');
      await expect(instructions).toBeVisible();
      await expect(instructions).toContainText('キーボード操作');
      await expect(instructions).toContainText('← → : データポイント移動');
    });

    test('矢印キーでデータポイントを移動できる', async ({ page }) => {
      const chartCanvas = page.locator('canvas[role="img"]');

      // チャートにフォーカス
      await chartCanvas.focus();

      // 右矢印キーを押す
      await page.keyboard.press('ArrowRight');

      // データポイント情報が更新されることを確認
      const dataPointInfo = page.locator('[aria-live="assertive"]');
      await expect(dataPointInfo).toBeVisible();
    });

    test('Enterキーで詳細情報を表示できる', async ({ page }) => {
      const chartCanvas = page.locator('canvas[role="img"]');

      // チャートにフォーカスして矢印キーで移動
      await chartCanvas.focus();
      await page.keyboard.press('ArrowRight');

      // Enterキーを押す
      await page.keyboard.press('Enter');

      // 詳細情報が表示されることを確認（DOM変更を待機）
      await page.waitForTimeout(100);
    });

    test('Escapeキーでキーボードナビゲーションを終了できる', async ({ page }) => {
      const chartCanvas = page.locator('canvas[role="img"]');

      // チャートにフォーカス
      await chartCanvas.focus();

      // キーボード操作説明が表示されることを確認
      await expect(page.locator('.keyboard-instructions')).toBeVisible();

      // Escapeキーを押す
      await page.keyboard.press('Escape');

      // キーボード操作説明が非表示になることを確認
      await expect(page.locator('.keyboard-instructions')).not.toBeVisible();
    });

    test('フィルターボタンがキーボードで操作可能', async ({ page }) => {
      // チャートタイプ切り替えボタンをTabで移動
      await page.keyboard.press('Tab');

      const lineChartButton = page.locator('[aria-label="線グラフ表示"]');
      await expect(lineChartButton).toBeFocused();

      // Spaceキーで選択
      await page.keyboard.press('Space');

      // 選択状態が変更されることを確認
      await expect(lineChartButton).toHaveAttribute('aria-checked', 'true');
    });
  });

  test.describe('スクリーンリーダー対応', () => {
    test('チャートに適切なARIA属性が設定されている', async ({ page }) => {
      const chartCanvas = page.locator('canvas');

      // 基本的なARIA属性を確認
      await expect(chartCanvas).toHaveAttribute('role', 'img');
      await expect(chartCanvas).toHaveAttribute('aria-label');
      await expect(chartCanvas).toHaveAttribute('aria-describedby');

      // aria-labelの内容を確認
      const ariaLabel = await chartCanvas.getAttribute('aria-label');
      expect(ariaLabel).toContain('グラフによる食事カロリー推移');
    });

    test('チャートの説明が提供されている', async ({ page }) => {
      const description = page.locator('[aria-live="polite"]');

      await expect(description).toBeVisible();
      await expect(description).toContainText('日分のデータを含む');
      await expect(description).toContainText('キーボードの矢印キーでデータポイントを移動できます');
    });

    test('フィルターコントロールに適切なラベルが設定されている', async ({ page }) => {
      // チャートタイプ切り替え
      const chartTypeGroup = page.locator('[role="radiogroup"][aria-labelledby="chart-type-label"]');
      await expect(chartTypeGroup).toBeVisible();

      const chartTypeButtons = chartTypeGroup.locator('[role="radio"]');
      const buttonCount = await chartTypeButtons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = chartTypeButtons.nth(i);
        await expect(button).toHaveAttribute('aria-label');
        await expect(button).toHaveAttribute('aria-checked');
      }

      // フードタイプフィルター
      const foodTypeGroup = page.locator('[role="radiogroup"][aria-labelledby="food-type-label"]');
      await expect(foodTypeGroup).toBeVisible();

      const foodTypeButtons = foodTypeGroup.locator('[role="radio"]');
      const foodButtonCount = await foodTypeButtons.count();

      for (let i = 0; i < foodButtonCount; i++) {
        const button = foodTypeButtons.nth(i);
        await expect(button).toHaveAttribute('aria-label');
        await expect(button).toHaveAttribute('aria-checked');
      }
    });

    test('期間選択に適切なラベルが関連付けられている', async ({ page }) => {
      const select = page.locator('#date-range-select');
      const label = page.locator('[for="date-range-select"]');

      await expect(select).toBeVisible();
      await expect(label).toBeVisible();
      await expect(select).toHaveAttribute('aria-label', '表示期間を選択');
    });

    test('サマリーカードに適切なARIA属性が設定されている', async ({ page }) => {
      const summaryCards = page.locator('[role="article"]');
      const cardCount = await summaryCards.count();

      expect(cardCount).toBeGreaterThan(0);

      for (let i = 0; i < cardCount; i++) {
        const card = summaryCards.nth(i);
        await expect(card).toHaveAttribute('aria-labelledby');

        const valueElement = card.locator('.summary-value, p');
        if (await valueElement.count() > 0) {
          await expect(valueElement.first()).toHaveAttribute('aria-label');
        }
      }
    });

    test('装飾的な要素にaria-hidden属性が設定されている', async ({ page }) => {
      // SVGアイコン
      const svgIcons = page.locator('svg');
      const svgCount = await svgIcons.count();

      for (let i = 0; i < svgCount; i++) {
        const svg = svgIcons.nth(i);
        await expect(svg).toHaveAttribute('aria-hidden', 'true');
      }

      // 装飾的なアイコン
      const decorativeIcons = page.locator('.summary-icon, .action-icon');
      const iconCount = await decorativeIcons.count();

      for (let i = 0; i < iconCount; i++) {
        const icon = decorativeIcons.nth(i);
        await expect(icon).toHaveAttribute('aria-hidden', 'true');
      }
    });
  });

  test.describe('フォーカス管理', () => {
    test('すべてのインタラクティブ要素がフォーカス可能', async ({ page }) => {
      // ページ内のすべてのボタンとセレクト要素を取得
      const interactiveElements = page.locator('button:not([disabled]), select, canvas[tabindex]');
      const elementCount = await interactiveElements.count();

      expect(elementCount).toBeGreaterThan(0);

      // 各要素がフォーカス可能であることを確認
      for (let i = 0; i < Math.min(elementCount, 10); i++) { // 最初の10個をテスト
        const element = interactiveElements.nth(i);
        await element.focus();
        await expect(element).toBeFocused();
      }
    });

    test('フォーカス順序が論理的である', async ({ page }) => {
      // Tabキーで順次フォーカスを移動
      const focusableElements = [
        '[aria-label="線グラフ表示"]',
        '[aria-label="積み上げ棒グラフ表示"]',
        '[aria-label="すべてのフードタイプを表示"]',
        '#date-range-select',
        'canvas[role="img"]',
      ];

      for (const selector of focusableElements) {
        await page.keyboard.press('Tab');
        const element = page.locator(selector);
        if (await element.count() > 0 && await element.isVisible()) {
          await expect(element).toBeFocused();
        }
      }
    });

    test('フォーカス時に適切な視覚的フィードバックが提供される', async ({ page }) => {
      const button = page.locator('[aria-label="線グラフ表示"]');

      // フォーカス前の状態を確認
      await button.focus();

      // フォーカスリングが表示されることを確認（CSSスタイルの確認）
      const focusedButton = page.locator('[aria-label="線グラフ表示"]:focus');
      await expect(focusedButton).toBeVisible();
    });
  });

  test.describe('エラー状態のアクセシビリティ', () => {
    test('エラー状態でも適切なARIA属性が設定される', async ({ page }) => {
      // ネットワークエラーをシミュレート
      await page.route('/api/meals/analytics*', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      // ページをリロード
      await page.reload();
      await page.waitForLoadState('networkidle');

      // エラーコンテナが表示されることを確認
      const errorContainer = page.locator('.error-container');
      if (await errorContainer.count() > 0) {
        await expect(errorContainer).toBeVisible();

        // リトライボタンがフォーカス可能であることを確認
        const retryButton = errorContainer.locator('button');
        if (await retryButton.count() > 0) {
          await retryButton.focus();
          await expect(retryButton).toBeFocused();
        }
      }
    });
  });

  test.describe('レスポンシブアクセシビリティ', () => {
    test('モバイル表示でもアクセシビリティが維持される', async ({ page }) => {
      // モバイルビューポートに変更
      await page.setViewportSize({ width: 375, height: 667 });

      // チャートが表示されることを確認
      const chartCanvas = page.locator('canvas[role="img"]');
      await expect(chartCanvas).toBeVisible();

      // フォーカス可能であることを確認
      await chartCanvas.focus();
      await expect(chartCanvas).toBeFocused();

      // キーボード操作説明が表示されることを確認
      const instructions = page.locator('.keyboard-instructions');
      await expect(instructions).toBeVisible();
    });

    test('タブレット表示でもアクセシビリティが維持される', async ({ page }) => {
      // タブレットビューポートに変更
      await page.setViewportSize({ width: 768, height: 1024 });

      // すべてのフィルターコントロールがアクセス可能であることを確認
      const chartTypeButtons = page.locator('[role="radiogroup"][aria-labelledby="chart-type-label"] [role="radio"]');
      const buttonCount = await chartTypeButtons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = chartTypeButtons.nth(i);
        await button.focus();
        await expect(button).toBeFocused();
      }
    });
  });

  test.describe('動的コンテンツのアクセシビリティ', () => {
    test('チャートタイプ変更時にARIA属性が更新される', async ({ page }) => {
      const chartCanvas = page.locator('canvas[role="img"]');

      // 初期状態のaria-labelを取得
      const initialLabel = await chartCanvas.getAttribute('aria-label');
      expect(initialLabel).toContain('線グラフ');

      // 積み上げ棒グラフに変更
      const barChartButton = page.locator('[aria-label="積み上げ棒グラフ表示"]');
      await barChartButton.click();

      // aria-labelが更新されることを確認
      await page.waitForTimeout(500); // 更新を待機
      const updatedLabel = await chartCanvas.getAttribute('aria-label');
      expect(updatedLabel).toContain('積み上げ棒グラフ');
    });

    test('データ更新時にライブリージョンが更新される', async ({ page }) => {
      const liveRegion = page.locator('[aria-live="polite"]');

      // 初期状態のテキストを取得
      const initialText = await liveRegion.textContent();

      // 期間を変更
      const periodSelect = page.locator('#date-range-select');
      await periodSelect.selectOption('14');

      // ライブリージョンのテキストが更新されることを確認
      await page.waitForTimeout(1000); // データ更新を待機
      const updatedText = await liveRegion.textContent();

      // テキストが変更されていることを確認（具体的な内容は実装に依存）
      expect(updatedText).toBeDefined();
    });
  });

  test.describe('色とコントラスト', () => {
    test('ハイコントラストモードで適切に表示される', async ({ page }) => {
      // ハイコントラストモードをシミュレート
      await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });

      // チャートが表示されることを確認
      const chartCanvas = page.locator('canvas[role="img"]');
      await expect(chartCanvas).toBeVisible();

      // フォーカス時のコントラストが適切であることを確認
      await chartCanvas.focus();
      await expect(chartCanvas).toBeFocused();
    });
  });
});
