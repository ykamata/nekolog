import { test, expect } from '@playwright/test';

test.describe('基本認証テスト', () => {
  test('ログインページが表示される', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // ログインフォームの要素が存在することを確認
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('認証APIエンドポイントが利用可能', async ({ page }) => {
    // /api/auth/me エンドポイントにアクセス（未認証なので401が返る）
    const response = await page.request.get('/api/auth/me');
    expect(response.status()).toBe(401);
  });

  test('ユーザー登録APIが動作する', async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`;

    const response = await page.request.post('/api/auth/register', {
      data: {
        email: testEmail,
        password: 'password123',
        name: 'Test User',
      },
    });

    // 登録成功または既に存在する場合
    expect([200, 201, 409]).toContain(response.status());
  });

  test('無効な認証情報でログイン失敗', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 無効な認証情報を入力
    await page.fill('#email', 'invalid@example.com');
    await page.fill('#password', 'wrongpassword');

    // ログインAPIの応答を監視
    const responsePromise = page.waitForResponse('/api/auth/login');

    // ログインボタンをクリック
    await page.click('button[type="submit"]');

    // APIレスポンスを確認
    const response = await responsePromise;
    expect(response.status()).toBe(401);

    // エラーメッセージが表示されることを確認
    await expect(page.locator('.auth-error-display')).toBeVisible();
  });
});
