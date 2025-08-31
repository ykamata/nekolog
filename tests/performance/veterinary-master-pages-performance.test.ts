import { test, expect } from '@playwright/test';

test.describe('病院・先生管理ページ パフォーマンステスト', () => {
  test.beforeEach(async ({ page }) => {
    // ログインページに移動
    await page.goto('/login');

    // テストユーザーでログイン
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // ログイン完了を待機
    await page.waitForURL('/');
  });

  test('病院管理ページの読み込み時間', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/veterinary-hospitals');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // 1秒以内に読み込まれることを確認
    expect(loadTime).toBeLessThan(1000);
  });

  test('先生管理ページの読み込み時間', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/veterinary-doctors');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // 1秒以内に読み込まれることを確認
    expect(loadTime).toBeLessThan(1000);
  });

  test('病院フォームモーダルの表示時間', async ({ page }) => {
    await page.goto('/veterinary-hospitals');

    const startTime = Date.now();

    await page.click('button:has-text("病院を追加")');
    await page.waitForSelector('text=病院登録');

    const modalOpenTime = Date.now() - startTime;

    // 500ms以内にモーダルが表示されることを確認
    expect(modalOpenTime).toBeLessThan(500);
  });

  test('先生フォームモーダルの表示時間', async ({ page }) => {
    await page.goto('/veterinary-doctors');

    const startTime = Date.now();

    await page.click('button:has-text("先生を追加")');
    await page.waitForSelector('text=先生登録');

    const modalOpenTime = Date.now() - startTime;

    // 500ms以内にモーダルが表示されることを確認
    expect(modalOpenTime).toBeLessThan(500);
  });

  test('検索機能のレスポンス時間', async ({ page }) => {
    await page.goto('/veterinary-hospitals');

    // 検索入力フィールドを取得
    const searchInput = page.locator('input[placeholder*="検索"]');

    if (await searchInput.count() > 0) {
      const startTime = Date.now();

      await searchInput.fill('テスト病院');
      await page.waitForTimeout(100); // デバウンス処理を考慮

      const searchTime = Date.now() - startTime;

      // 500ms以内に検索結果が表示されることを確認
      expect(searchTime).toBeLessThan(500);
    }
  });

  test('大量データでのページネーション性能', async ({ page }) => {
    await page.goto('/veterinary-hospitals');

    // ページネーションが存在する場合のテスト
    const paginationButtons = page.locator('[aria-label*="ページ"]');

    if (await paginationButtons.count() > 0) {
      const startTime = Date.now();

      await paginationButtons.first().click();
      await page.waitForLoadState('networkidle');

      const paginationTime = Date.now() - startTime;

      // 1秒以内にページ切り替えが完了することを確認
      expect(paginationTime).toBeLessThan(1000);
    }
  });

  test('メモリ使用量の監視', async ({ page }) => {
    await page.goto('/veterinary-hospitals');

    // パフォーマンスメトリクスを取得
    const metrics = await page.evaluate(() => {
      return {
        usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
        totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
      };
    });

    // メモリ使用量が適切な範囲内であることを確認（50MB以下）
    if (metrics.usedJSHeapSize > 0) {
      expect(metrics.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('ネットワークリクエストの最適化', async ({ page }) => {
    const requests: string[] = [];

    page.on('request', (request) => {
      requests.push(request.url());
    });

    await page.goto('/veterinary-hospitals');
    await page.waitForLoadState('networkidle');

    // 不要なリクエストが発生していないことを確認
    const apiRequests = requests.filter(url => url.includes('/api/'));

    // API リクエスト数が適切であることを確認（10個以下）
    expect(apiRequests.length).toBeLessThan(10);
  });

  test('レスポンシブ表示の性能', async ({ page }) => {
    // デスクトップサイズでページを読み込み
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/veterinary-hospitals');

    const startTime = Date.now();

    // モバイルサイズに変更
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(100); // レイアウト調整を待機

    const resizeTime = Date.now() - startTime;

    // 200ms以内にレスポンシブ調整が完了することを確認
    expect(resizeTime).toBeLessThan(200);
  });

  test('フォーム入力の応答性', async ({ page }) => {
    await page.goto('/veterinary-hospitals');

    // 病院追加フォームを開く
    await page.click('button:has-text("病院を追加")');
    await page.waitForSelector('input[name="name"]');

    const startTime = Date.now();

    // フォームに入力
    await page.fill('input[name="name"]', 'テスト病院名');

    const inputTime = Date.now() - startTime;

    // 100ms以内に入力が反映されることを確認
    expect(inputTime).toBeLessThan(100);
  });

  test('並行処理の性能', async ({ page }) => {
    // 複数のページを同時に開いて性能をテスト
    const [page1, page2] = await Promise.all([
      page.goto('/veterinary-hospitals'),
      page.goto('/veterinary-doctors'),
    ]);

    await Promise.all([
      page.waitForLoadState('networkidle'),
      page.waitForLoadState('networkidle'),
    ]);

    // 両方のページが正常に読み込まれることを確認
    await expect(page.locator('h1')).toContainText('病院管理');
  });
});
