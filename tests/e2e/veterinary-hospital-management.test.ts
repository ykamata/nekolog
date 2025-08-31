import { test, expect } from '@playwright/test';

test.describe('病院管理機能', () => {
  test.beforeEach(async ({ page }) => {
    // 認証が必要な場合のセットアップ
    await page.goto('/login');
    // ログイン処理（実際の認証フローに合わせて調整）
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // 病院管理ページに移動
    await page.goto('/veterinary-hospitals');
    await page.waitForLoadState('networkidle');
  });

  test('病院管理ページが正しく表示される', async ({ page }) => {
    // ページタイトルの確認
    await expect(page.locator('h1')).toContainText('病院管理');

    // 病院追加ボタンの確認
    await expect(page.locator('button:has-text("病院を追加")')).toBeVisible();

    // 検索バーの確認
    await expect(page.locator('input[placeholder*="検索"]')).toBeVisible();
  });

  test('新しい病院を登録できる', async ({ page }) => {
    // 病院追加ボタンをクリック
    await page.click('button:has-text("病院を追加")');

    // モーダルが表示されることを確認
    await expect(page.locator('text=病院登録')).toBeVisible();

    // フォームに入力
    await page.fill('input#name', 'テスト動物病院');
    await page.fill('input#address', '東京都渋谷区1-1-1');
    await page.fill('input#phone', '03-1234-5678');
    await page.fill('textarea#memo', 'テスト用の病院です');

    // 登録ボタンをクリック
    await page.click('button[type="submit"]:has-text("登録")');

    // 成功メッセージの確認（トーストメッセージ）
    await expect(page.locator('text=病院を登録しました')).toBeVisible();

    // モーダルが閉じることを確認
    await expect(page.locator('text=病院登録')).not.toBeVisible();

    // 一覧に新しい病院が表示されることを確認
    await expect(page.locator('text=テスト動物病院')).toBeVisible();
  });

  test('病院情報を編集できる', async ({ page }) => {
    // 既存の病院がある場合の編集テスト
    // まず病院を作成
    await page.click('button:has-text("病院を追加")');
    await page.fill('input#name', '編集テスト病院');
    await page.fill('input#address', '東京都新宿区2-2-2');
    await page.click('button[type="submit"]:has-text("登録")');
    await page.waitForTimeout(1000); // 登録完了を待つ

    // 編集ボタンをクリック
    await page.click('button:has-text("編集")').first();

    // 編集モーダルが表示されることを確認
    await expect(page.locator('text=病院情報編集')).toBeVisible();

    // フォームに既存の値が入っていることを確認
    await expect(page.locator('input#name')).toHaveValue('編集テスト病院');

    // 値を変更
    await page.fill('input#name', '編集済み病院');
    await page.fill('input#phone', '03-9876-5432');

    // 更新ボタンをクリック
    await page.click('button[type="submit"]:has-text("更新")');

    // 成功メッセージの確認
    await expect(page.locator('text=病院情報を更新しました')).toBeVisible();

    // 一覧で更新された内容が表示されることを確認
    await expect(page.locator('text=編集済み病院')).toBeVisible();
    await expect(page.locator('text=03-9876-5432')).toBeVisible();
  });

  test('病院を削除できる', async ({ page }) => {
    // まず病院を作成
    await page.click('button:has-text("病院を追加")');
    await page.fill('input#name', '削除テスト病院');
    await page.click('button[type="submit"]:has-text("登録")');
    await page.waitForTimeout(1000);

    // 削除ボタンをクリック
    await page.click('button:has-text("削除")').first();

    // 確認ダイアログが表示されることを確認
    await expect(page.locator('text=病院を削除')).toBeVisible();
    await expect(page.locator('text=削除テスト病院')).toBeVisible();

    // 削除を確認
    await page.click('button:has-text("削除")').last();

    // 成功メッセージの確認
    await expect(page.locator('text=病院を削除しました')).toBeVisible();

    // 一覧から削除されることを確認
    await expect(page.locator('text=削除テスト病院')).not.toBeVisible();
  });

  test('病院詳細を表示できる', async ({ page }) => {
    // まず病院を作成
    await page.click('button:has-text("病院を追加")');
    await page.fill('input#name', '詳細テスト病院');
    await page.fill('input#address', '東京都港区3-3-3');
    await page.fill('input#phone', '03-1111-2222');
    await page.fill('textarea#memo', '詳細表示のテスト用病院');
    await page.click('button[type="submit"]:has-text("登録")');
    await page.waitForTimeout(1000);

    // 詳細ボタンをクリック
    await page.click('button:has-text("詳細")').first();

    // 詳細モーダルが表示されることを確認
    await expect(page.locator('text=病院詳細')).toBeVisible();

    // 詳細情報が表示されることを確認
    await expect(page.locator('text=詳細テスト病院')).toBeVisible();
    await expect(page.locator('text=東京都港区3-3-3')).toBeVisible();
    await expect(page.locator('text=03-1111-2222')).toBeVisible();
    await expect(page.locator('text=詳細表示のテスト用病院')).toBeVisible();

    // 詳細画面から編集できることを確認
    await page.click('button:has-text("編集")');
    await expect(page.locator('text=病院情報編集')).toBeVisible();
  });

  test('病院を検索できる', async ({ page }) => {
    // 複数の病院を作成
    const hospitals = [
      { name: '渋谷動物病院', address: '東京都渋谷区' },
      { name: '新宿ペットクリニック', address: '東京都新宿区' },
      { name: '港区動物医療センター', address: '東京都港区' },
    ];

    for (const hospital of hospitals) {
      await page.click('button:has-text("病院を追加")');
      await page.fill('input#name', hospital.name);
      await page.fill('input#address', hospital.address);
      await page.click('button[type="submit"]:has-text("登録")');
      await page.waitForTimeout(500);
    }

    // 検索テスト
    await page.fill('input[placeholder*="検索"]', '渋谷');
    await page.waitForTimeout(1000); // デバウンス待ち

    // 検索結果の確認
    await expect(page.locator('text=渋谷動物病院')).toBeVisible();
    await expect(page.locator('text=新宿ペットクリニック')).not.toBeVisible();

    // 検索クリア
    await page.click('button svg'); // クリアボタン
    await page.waitForTimeout(500);

    // 全ての病院が再表示されることを確認
    await expect(page.locator('text=渋谷動物病院')).toBeVisible();
    await expect(page.locator('text=新宿ペットクリニック')).toBeVisible();
  });

  test('フォームバリデーションが機能する', async ({ page }) => {
    // 病院追加ボタンをクリック
    await page.click('button:has-text("病院を追加")');

    // 病院名を空のまま登録しようとする
    await page.click('button[type="submit"]:has-text("登録")');

    // 登録ボタンが無効になっていることを確認
    await expect(page.locator('button[type="submit"]:has-text("登録")')).toBeDisabled();

    // 病院名を入力すると登録ボタンが有効になることを確認
    await page.fill('input#name', 'バリデーションテスト病院');
    await expect(page.locator('button[type="submit"]:has-text("登録")')).toBeEnabled();

    // 不正な電話番号を入力
    await page.fill('input#phone', 'invalid-phone-123abc');
    await page.click('input#name'); // フォーカスを移してバリデーションを発火

    // エラーメッセージが表示されることを確認（実装に応じて調整）
    // await expect(page.locator('text=電話番号は数字、ハイフン、括弧のみ使用できます')).toBeVisible()
  });

  test('レスポンシブデザインが機能する', async ({ page }) => {
    // モバイルサイズに変更
    await page.setViewportSize({ width: 375, height: 667 });

    // モバイル表示でも基本機能が動作することを確認
    await expect(page.locator('h1')).toContainText('病院管理');
    await expect(page.locator('button:has-text("病院を追加")')).toBeVisible();

    // 病院を追加
    await page.click('button:has-text("病院を追加")');
    await page.fill('input#name', 'モバイルテスト病院');
    await page.click('button[type="submit"]:has-text("登録")');

    // モバイル表示で病院が表示されることを確認
    await expect(page.locator('text=モバイルテスト病院')).toBeVisible();

    // デスクトップサイズに戻す
    await page.setViewportSize({ width: 1280, height: 720 });

    // デスクトップ表示でも正常に表示されることを確認
    await expect(page.locator('text=モバイルテスト病院')).toBeVisible();
  });

  test('キーボードショートカットが機能する', async ({ page }) => {
    // Ctrl+N で新規追加モーダルが開くことを確認
    await page.keyboard.press('Control+n');
    await expect(page.locator('text=病院登録')).toBeVisible();

    // Escapeでモーダルが閉じることを確認
    await page.keyboard.press('Escape');
    await expect(page.locator('text=病院登録')).not.toBeVisible();
  });

  test('ページネーションが機能する', async ({ page }) => {
    // 多数の病院を作成（ページネーションをテストするため）
    for (let i = 1; i <= 15; i++) {
      await page.click('button:has-text("病院を追加")');
      await page.fill('input#name', `病院${i}`);
      await page.click('button[type="submit"]:has-text("登録")');
      await page.waitForTimeout(200);
    }

    // ページネーションが表示されることを確認
    await expect(page.locator('[aria-label="Pagination"]')).toBeVisible();

    // ページ情報の確認
    await expect(page.locator('text=1から10件目を表示')).toBeVisible();

    // 次のページに移動
    await page.click('button:has-text("次へ")');
    await expect(page.locator('text=11から15件目を表示')).toBeVisible();

    // 前のページに戻る
    await page.click('button:has-text("前へ")');
    await expect(page.locator('text=1から10件目を表示')).toBeVisible();
  });
});
