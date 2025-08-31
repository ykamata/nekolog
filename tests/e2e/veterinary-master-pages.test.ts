import { test, expect } from '@playwright/test';

test.describe('病院・先生管理ページ', () => {
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

  test('病院管理ページが正しく表示される', async ({ page }) => {
    // 病院管理ページに移動
    await page.goto('/veterinary-hospitals');

    // ページタイトルを確認
    await expect(page.locator('h1')).toContainText('病院管理');

    // 病院追加ボタンが表示されることを確認
    await expect(page.locator('button:has-text("病院を追加")')).toBeVisible();

    // 病院一覧コンポーネントが表示されることを確認
    await expect(page.locator('.veterinary-hospital-list')).toBeVisible();
  });

  test('先生管理ページが正しく表示される', async ({ page }) => {
    // 先生管理ページに移動
    await page.goto('/veterinary-doctors');

    // ページタイトルを確認
    await expect(page.locator('h1')).toContainText('先生管理');

    // 先生追加ボタンが表示されることを確認
    await expect(page.locator('button:has-text("先生を追加")')).toBeVisible();

    // 先生一覧コンポーネントが表示されることを確認
    await expect(page.locator('.veterinary-doctor-list')).toBeVisible();
  });

  test('病院管理ページで新規登録モーダルが開く', async ({ page }) => {
    await page.goto('/veterinary-hospitals');

    // 病院追加ボタンをクリック
    await page.click('button:has-text("病院を追加")');

    // モーダルが表示されることを確認
    await expect(page.locator('text=病院登録')).toBeVisible();

    // フォームが表示されることを確認
    await expect(page.locator('input[name="name"]')).toBeVisible();
  });

  test('先生管理ページで新規登録モーダルが開く', async ({ page }) => {
    await page.goto('/veterinary-doctors');

    // 先生追加ボタンをクリック
    await page.click('button:has-text("先生を追加")');

    // モーダルが表示されることを確認
    await expect(page.locator('text=先生登録')).toBeVisible();

    // フォームが表示されることを確認
    await expect(page.locator('input[name="name"]')).toBeVisible();
  });

  test('病院管理ページでキーボードショートカットが動作する', async ({ page }) => {
    await page.goto('/veterinary-hospitals');

    // Ctrl+N で新規追加モーダルが開くことを確認
    await page.keyboard.press('Control+n');
    await expect(page.locator('text=病院登録')).toBeVisible();

    // Escapeでモーダルが閉じることを確認
    await page.keyboard.press('Escape');
    await expect(page.locator('text=病院登録')).not.toBeVisible();
  });

  test('先生管理ページでキーボードショートカットが動作する', async ({ page }) => {
    await page.goto('/veterinary-doctors');

    // Ctrl+N で新規追加モーダルが開くことを確認
    await page.keyboard.press('Control+n');
    await expect(page.locator('text=先生登録')).toBeVisible();

    // Escapeでモーダルが閉じることを確認
    await page.keyboard.press('Escape');
    await expect(page.locator('text=先生登録')).not.toBeVisible();
  });

  test('レスポンシブデザインが正しく動作する', async ({ page }) => {
    // モバイルサイズに設定
    await page.setViewportSize({ width: 375, height: 667 });

    // 病院管理ページをテスト
    await page.goto('/veterinary-hospitals');
    await expect(page.locator('h1')).toContainText('病院管理');

    // 先生管理ページをテスト
    await page.goto('/veterinary-doctors');
    await expect(page.locator('h1')).toContainText('先生管理');
  });
});
