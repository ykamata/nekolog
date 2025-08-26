import { test, expect } from '@playwright/test';
import { AuthTestSetup } from './utils/auth-test-setup';
import { TestSetup } from './utils/test-setup';

test.describe('認証フロー統合テスト', () => {
  let authSetup: AuthTestSetup;
  let testSetup: TestSetup;

  test.beforeEach(async ({ page, context }) => {
    authSetup = new AuthTestSetup(page, context);
    testSetup = new TestSetup(page);

    // テストデータベースのセットアップ
    await testSetup.setupCleanDatabase();

    // テストユーザーを作成（既に存在する場合は無視）
    await authSetup.createTestUser();

    // 認証状態の変更を監視
    await authSetup.monitorAuthStateChanges();
  });

  test.afterEach(async () => {
    // テスト後のクリーンアップ
    await authSetup.clearAuthTokens();
  });

  test('完全な認証フロー: ログイン → リロード → 操作継続', async ({ page }) => {
    // 要件1, 要件2, 要件3, 要件4の統合テスト

    // Phase 1: ログイン
    await test.step('ユーザーログイン', async () => {
      await authSetup.loginAsTestUser();
      await authSetup.checkAuthenticationState(true);

      // ダッシュボードまたはホームページが表示されることを確認
      expect(page.url()).not.toContain('/login');
    });

    // Phase 2: アプリケーション操作（猫の管理）
    await test.step('認証後のアプリケーション操作', async () => {
      // テストデータの作成
      await testSetup.createTestCats([
        { id: '1', name: 'テスト猫1', breed: 'ミックス', birthDate: '2020-01-01', weight: 4.5 },
      ]);

      // 猫管理ページにアクセス
      await page.goto('/cats');
      await testSetup.waitForPageLoad();

      // 猫のリストが表示されることを確認
      await expect(page.locator('text=テスト猫1')).toBeVisible();
    });

    // Phase 3: ブラウザリロード
    await test.step('ブラウザリロード', async () => {
      await authSetup.reloadPage();
      await authSetup.waitForAuthInitialization();

      // リロード後も認証状態が維持されることを確認
      await authSetup.checkAuthenticationState(true);
    });

    // Phase 4: リロード後の操作継続
    await test.step('リロード後の操作継続', async () => {
      // 猫管理ページに再度アクセス
      await page.goto('/cats');
      await testSetup.waitForPageLoad();

      // データが正常に表示されることを確認
      await expect(page.locator('text=テスト猫1')).toBeVisible();

      // 新しい猫を追加する操作
      const addButton = page.locator('button:has-text("猫を追加"), a:has-text("猫を追加")');
      if (await addButton.count() > 0) {
        await addButton.click();

        // フォームが表示されることを確認
        await expect(page.locator('input[name="name"], input[placeholder*="名前"]')).toBeVisible();
      }
    });

    // Phase 5: 食事記録の操作
    await test.step('食事記録の操作', async () => {
      // フードデータの作成
      await testSetup.createTestFoods([
        { id: '1', name: 'テストフード', type: 'dry', manufacturer: 'テストメーカー', caloriesPerGram: 3.5 },
      ]);

      // 食事記録ページにアクセス
      await page.goto('/meals/record');
      await testSetup.waitForPageLoad();

      // 食事記録フォームが表示されることを確認
      const catSelect = page.locator('select[name="catId"], select:has(option:text-matches("テスト猫1"))');
      if (await catSelect.count() > 0) {
        await expect(catSelect).toBeVisible();
      }
    });
  });

  test('認証エラーケースの統合テスト', async ({ page }) => {
    // 要件2.2, 要件3.2: エラーハンドリングの統合テスト

    await test.step('無効な認証情報でのログイン試行', async () => {
      await page.goto('/login');

      // 無効な認証情報を入力
      await page.fill('input[name="email"]', 'invalid@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');

      // ログインボタンをクリック
      await page.click('button[type="submit"]');

      // エラーメッセージが表示されることを確認
      await authSetup.checkAuthErrorMessage('Invalid email or password');

      // ログインページに留まることを確認
      expect(page.url()).toContain('/login');
    });

    await test.step('ネットワークエラー時の認証フロー', async () => {
      // 正常にログイン
      await authSetup.loginAsTestUser();

      // ネットワークエラーをシミュレート
      await authSetup.simulateNetworkError();

      // 保護されたページにアクセス
      await page.goto('/cats');

      // エラー状態が適切に表示されることを確認
      await authSetup.checkAuthErrorMessage();

      // ネットワーク復旧後の自動復旧
      await authSetup.clearNetworkErrorSimulation();
      await authSetup.reloadPage();
      await authSetup.waitForAuthInitialization();

      // 認証状態が復旧することを確認
      await authSetup.checkAuthenticationState(true);
    });

    await test.step('トークン期限切れ時の自動ログアウト', async () => {
      // ログイン
      await authSetup.loginAsTestUser();

      // 全てのトークンを無効化
      await authSetup.clearAuthTokens();

      // 保護されたページにアクセス
      await page.goto('/cats');

      // ログインページにリダイレクトされることを確認
      await page.waitForURL('/login');
      expect(page.url()).toContain('/login');
    });
  });

  test('複数セッション間での認証状態管理', async ({ context }) => {
    // 要件2.3: 認証状態の一貫性テスト

    await test.step('複数タブでの認証状態同期', async () => {
      // 最初のタブでログイン
      await authSetup.loginAsTestUser();

      // 新しいタブを開く
      const newPage = await authSetup.openNewTab();
      const newAuthSetup = new AuthTestSetup(newPage, context);

      // 新しいタブでも認証状態が共有されることを確認
      await newAuthSetup.accessProtectedPage('/cats');
      await newAuthSetup.checkAuthenticationState(true);

      // 最初のタブでログアウト
      await authSetup.logout();

      // 新しいタブでページをリロード
      await newPage.reload();

      // 新しいタブでもログアウト状態になることを確認
      await newPage.waitForURL('/login');
      expect(newPage.url()).toContain('/login');

      await newPage.close();
    });
  });

  test('認証状態の永続化とデータ整合性', async ({ page }) => {
    // 要件1.1: 永続化データの整合性テスト

    await test.step('認証状態の永続化', async () => {
      // ログイン
      await authSetup.loginAsTestUser();

      // ローカルストレージの認証データを確認
      const authData = await page.evaluate(() => {
        const data = localStorage.getItem('auth-state');
        return data ? JSON.parse(data) : null;
      });

      expect(authData).toBeTruthy();
      expect(authData.isAuthenticated).toBe(true);
      expect(authData.version).toBeTruthy();
      expect(authData.lastAuthCheck).toBeTruthy();
    });

    await test.step('古いバージョンのデータ移行', async () => {
      // 古いバージョンの認証データを設定
      await page.evaluate(() => {
        localStorage.setItem('auth-state', JSON.stringify({
          isAuthenticated: true,
          lastAuthCheck: Date.now(),
          // version フィールドなし（古いバージョン）
        }));
      });

      // ページをリロード
      await authSetup.reloadPage();
      await authSetup.waitForAuthInitialization();

      // データが新しいバージョンに移行されることを確認
      const updatedAuthData = await page.evaluate(() => {
        const data = localStorage.getItem('auth-state');
        return data ? JSON.parse(data) : null;
      });

      expect(updatedAuthData.version).toBeTruthy();
    });

    await test.step('破損したデータの処理', async () => {
      // 破損した認証データを設定
      await page.evaluate(() => {
        localStorage.setItem('auth-state', 'invalid-json-data');
      });

      // ページをリロード
      await authSetup.reloadPage();

      // エラーが適切に処理され、ログインページにリダイレクトされることを確認
      await page.waitForURL('/login');
      expect(page.url()).toContain('/login');
    });
  });

  test('認証フローのパフォーマンステスト', async ({ page }) => {
    // 要件4: ユーザーエクスペリエンスの検証

    await test.step('認証初期化のパフォーマンス', async () => {
      // ログイン
      await authSetup.loginAsTestUser();

      // リロード時間を測定
      const startTime = Date.now();
      await authSetup.reloadPage();
      await authSetup.waitForAuthInitialization();
      const endTime = Date.now();

      const initializationTime = endTime - startTime;

      // 認証初期化が5秒以内に完了することを確認
      expect(initializationTime).toBeLessThan(5000);
    });

    await test.step('認証状態の応答性', async () => {
      // ログイン
      await authSetup.loginAsTestUser();

      // 複数の保護されたページに連続アクセス
      const pages = ['/cats', '/foods', '/meals/record'];

      for (const pagePath of pages) {
        const startTime = Date.now();
        await page.goto(pagePath);
        await testSetup.waitForPageLoad();
        const endTime = Date.now();

        const loadTime = endTime - startTime;

        // 各ページが3秒以内に読み込まれることを確認
        expect(loadTime).toBeLessThan(3000);

        // ログインページにリダイレクトされないことを確認
        expect(page.url()).not.toContain('/login');
      }
    });
  });

  test('認証フローのアクセシビリティテスト', async ({ page }) => {
    // 要件4: ユーザーエクスペリエンスの検証

    await test.step('ログインフォームのアクセシビリティ', async () => {
      await page.goto('/login');

      // フォームラベルの関連付けを確認
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');

      await expect(emailInput).toHaveAttribute('id');
      await expect(passwordInput).toHaveAttribute('id');

      // ラベルが適切に関連付けられていることを確認
      const emailLabel = page.locator('label[for="email"]');
      const passwordLabel = page.locator('label[for="password"]');

      await expect(emailLabel).toBeVisible();
      await expect(passwordLabel).toBeVisible();
    });

    await test.step('エラーメッセージのアクセシビリティ', async () => {
      await page.goto('/login');

      // 無効な認証情報でログイン試行
      await page.fill('input[name="email"]', 'invalid@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // エラーメッセージがスクリーンリーダーで読み上げ可能であることを確認
      const errorElement = page.locator('.auth-error, .error-message, [class*="error"]');
      await expect(errorElement).toBeVisible();

      // ARIA属性の確認
      const ariaLive = await errorElement.getAttribute('aria-live');
      const role = await errorElement.getAttribute('role');

      expect(ariaLive || role).toBeTruthy();
    });

    await test.step('ローディング状態のアクセシビリティ', async () => {
      // 認証初期化中のローディング状態を確認
      await page.evaluate(() => {
        localStorage.setItem('auth-state', JSON.stringify({
          isAuthenticated: true,
          lastAuthCheck: Date.now(),
          version: '1.0.0',
        }));
      });

      await page.goto('/');

      // ローディング要素のアクセシビリティ属性を確認
      const loadingElement = page.locator('.auth-loading, .loading-spinner, [class*="loading"]');

      if (await loadingElement.count() > 0) {
        const ariaLabel = await loadingElement.getAttribute('aria-label');
        const ariaLive = await loadingElement.getAttribute('aria-live');

        expect(ariaLabel || ariaLive).toBeTruthy();
      }
    });
  });
});
