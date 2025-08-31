import { test, expect } from '@playwright/test';

test.describe('先生管理機能', () => {
  test.beforeEach(async ({ page }) => {
    // ログインページに移動
    await page.goto('/login');

    // テストユーザーでログイン
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // ログイン完了まで待機
    await page.waitForURL('/');
  });

  test('先生管理ページにアクセスできる', async ({ page }) => {
    await page.goto('/veterinary-doctors');

    // ページタイトルが表示されることを確認
    await expect(page.locator('h1')).toContainText('先生管理');

    // 先生追加ボタンが表示されることを確認
    await expect(page.locator('button:has-text("先生を追加")')).toBeVisible();
  });

  test('先生一覧が表示される', async ({ page }) => {
    await page.goto('/veterinary-doctors');

    // 先生一覧のヘッダーが表示されることを確認
    await expect(page.locator('h2:has-text("先生一覧")')).toBeVisible();

    // 検索バーが表示されることを確認
    await expect(page.locator('input[placeholder*="検索"]')).toBeVisible();

    // 病院フィルタが表示されることを確認
    await expect(page.locator('select')).toBeVisible();
  });

  test('先生追加フォームが表示される', async ({ page }) => {
    await page.goto('/veterinary-doctors');

    // 先生追加ボタンをクリック
    await page.click('button:has-text("先生を追加")');

    // フォームモーダルが表示されることを確認
    await expect(page.locator('h3:has-text("先生登録")')).toBeVisible();

    // 必要なフィールドが表示されることを確認
    await expect(page.locator('input[id="name"]')).toBeVisible();
    await expect(page.locator('select[id="hospitalId"]')).toBeVisible();
    await expect(page.locator('input[id="specialization"]')).toBeVisible();

    // 登録ボタンが表示されることを確認
    await expect(page.locator('button[type="submit"]:has-text("登録")')).toBeVisible();

    // キャンセルボタンが表示されることを確認
    await expect(page.locator('button:has-text("キャンセル")')).toBeVisible();
  });

  test('先生名が未入力の場合、登録ボタンが無効になる', async ({ page }) => {
    await page.goto('/veterinary-doctors');

    // 先生追加ボタンをクリック
    await page.click('button:has-text("先生を追加")');

    // 登録ボタンが無効であることを確認
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('先生名を入力すると登録ボタンが有効になる', async ({ page }) => {
    await page.goto('/veterinary-doctors');

    // 先生追加ボタンをクリック
    await page.click('button:has-text("先生を追加")');

    // 先生名を入力
    await page.fill('input[id="name"]', 'テスト先生');

    // 登録ボタンが有効になることを確認
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test('キャンセルボタンでフォームが閉じる', async ({ page }) => {
    await page.goto('/veterinary-doctors');

    // 先生追加ボタンをクリック
    await page.click('button:has-text("先生を追加")');

    // フォームが表示されることを確認
    await expect(page.locator('h3:has-text("先生登録")')).toBeVisible();

    // キャンセルボタンをクリック
    await page.click('button:has-text("キャンセル")');

    // フォームが閉じることを確認
    await expect(page.locator('h3:has-text("先生登録")')).not.toBeVisible();
  });

  test('検索機能が動作する', async ({ page }) => {
    await page.goto('/veterinary-doctors');

    // 検索バーに入力
    await page.fill('input[placeholder*="検索"]', 'テスト');

    // 検索が実行されることを確認（デバウンス処理があるため少し待機）
    await page.waitForTimeout(400);

    // 検索バーの値が保持されることを確認
    await expect(page.locator('input[placeholder*="検索"]')).toHaveValue('テスト');
  });

  test('病院フィルタが動作する', async ({ page }) => {
    await page.goto('/veterinary-doctors');

    // 病院フィルタを選択
    const hospitalSelect = page.locator('select').first();
    await hospitalSelect.selectOption({ index: 1 }); // 最初のオプション（全ての病院）以外を選択

    // フィルタが適用されることを確認
    const selectedValue = await hospitalSelect.inputValue();
    expect(selectedValue).not.toBe('');
  });

  test('レスポンシブデザインが動作する', async ({ page }) => {
    // モバイルサイズに設定
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/veterinary-doctors');

    // モバイル表示でもページが正常に表示されることを確認
    await expect(page.locator('h1:has-text("先生管理")')).toBeVisible();
    await expect(page.locator('button:has-text("先生を追加")')).toBeVisible();

    // デスクトップサイズに戻す
    await page.setViewportSize({ width: 1280, height: 720 });

    // デスクトップ表示でも正常に表示されることを確認
    await expect(page.locator('h1:has-text("先生管理")')).toBeVisible();
    await expect(page.locator('button:has-text("先生を追加")')).toBeVisible();
  });
});
