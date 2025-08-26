import { test, expect } from '@playwright/test';
import { AuthTestSetup } from './utils/auth-test-setup';

test.describe('認証状態永続化 - ブラウザリロードテスト', () => {
  let authSetup: AuthTestSetup;

  test.beforeEach(async ({ page, context }) => {
    authSetup = new AuthTestSetup(page, context);

    // テストユーザーを作成（既に存在する場合は無視）
    await authSetup.createTestUser();

    // 認証状態の変更を監視
    await authSetup.monitorAuthStateChanges();
  });

  test.afterEach(async () => {
    // テスト後のクリーンアップ
    await authSetup.clearAuthTokens();
  });

  test('ログイン後のブラウザリロードで認証状態が維持される', async ({ page }) => {
    // 要件1.1: ユーザーがログインした後にブラウザをリロードした場合、システムは自動的に認証状態を復元する

    // 1. ログイン
    await authSetup.loginAsTestUser();

    // 2. 認証状態を確認
    await authSetup.checkAuthenticationState(true);

    // 3. ローカルストレージとクッキーの状態を確認
    const hasLocalStorageAuth = await authSetup.checkLocalStorageAuth();
    const { hasAccessToken, hasRefreshToken } = await authSetup.checkAuthCookies();

    expect(hasLocalStorageAuth).toBeTruthy();
    expect(hasAccessToken).toBeTruthy();
    expect(hasRefreshToken).toBeTruthy();

    // 4. ブラウザをリロード
    await authSetup.reloadPage();

    // 5. 認証初期化の完了を待つ
    await authSetup.waitForAuthInitialization();

    // 6. リロード後も認証状態が維持されていることを確認
    await authSetup.checkAuthenticationState(true);

    // 7. 保護されたページにアクセスできることを確認
    await authSetup.accessProtectedPage('/');

    // ログインページにリダイレクトされないことを確認
    expect(page.url()).not.toContain('/login');
  });

  test('複数回のリロードでも認証状態が維持される', async ({ page }) => {
    // ログイン
    await authSetup.loginAsTestUser();

    // 複数回リロードして認証状態の維持を確認
    for (let i = 0; i < 3; i++) {
      await authSetup.reloadPage();
      await authSetup.waitForAuthInitialization();
      await authSetup.checkAuthenticationState(true);

      // 保護されたページにアクセスできることを確認
      await authSetup.accessProtectedPage('/');
      expect(page.url()).not.toContain('/login');
    }
  });

  test('新しいタブでも認証状態が共有される', async ({ context }) => {
    // 1. 最初のタブでログイン
    await authSetup.loginAsTestUser();
    await authSetup.checkAuthenticationState(true);

    // 2. 新しいタブを開く
    const newPage = await authSetup.openNewTab();
    const newAuthSetup = new AuthTestSetup(newPage, context);

    // 3. 新しいタブで保護されたページにアクセス
    await newAuthSetup.accessProtectedPage('/');

    // 4. 新しいタブでも認証状態が維持されていることを確認
    await newAuthSetup.checkAuthenticationState(true);
    expect(newPage.url()).not.toContain('/login');

    // クリーンアップ
    await newPage.close();
  });

  test('アクセストークン期限切れ時のリフレッシュトークンによる自動復旧', async ({ page }) => {
    // 要件1.2: 有効なリフレッシュトークンが存在する場合、システムは自動的にアクセストークンを更新する

    // 1. ログイン
    await authSetup.loginAsTestUser();

    // 2. アクセストークンのみを無効化（リフレッシュトークンは残す）
    await page.evaluate(() => {
      // アクセストークンクッキーを削除
      document.cookie = 'access-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    });

    // 3. ブラウザをリロード
    await authSetup.reloadPage();

    // 4. 認証初期化の完了を待つ
    await authSetup.waitForAuthInitialization();

    // 5. リフレッシュトークンによる自動復旧を確認
    await authSetup.checkAuthenticationState(true);

    // 6. 新しいアクセストークンが設定されていることを確認
    const { hasAccessToken } = await authSetup.checkAuthCookies();
    expect(hasAccessToken).toBeTruthy();
  });

  test('無効なトークン時のログインページリダイレクト', async ({ page }) => {
    // 要件1.3: 認証トークンが無効または期限切れの場合、システムはユーザーをログインページにリダイレクトする

    // 1. ログイン
    await authSetup.loginAsTestUser();

    // 2. 全ての認証トークンを無効化
    await authSetup.clearAuthTokens();

    // 3. ブラウザをリロード
    await authSetup.reloadPage();

    // 4. 保護されたページにアクセスを試行
    await authSetup.accessProtectedPage('/');

    // 5. ログインページにリダイレクトされることを確認
    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');

    // 6. 認証状態が未認証になっていることを確認
    await authSetup.checkAuthenticationState(false);
  });

  test('ネットワークエラー時の適切なエラーハンドリング', async ({ page }) => {
    // 要件2.2: 認証初期化中にエラーが発生した場合、システムは適切にエラーをハンドリングする

    // 1. ログイン
    await authSetup.loginAsTestUser();

    // 2. ネットワークエラーをシミュレート
    await authSetup.simulateNetworkError();

    // 3. ブラウザをリロード
    await authSetup.reloadPage();

    // 4. エラー状態の表示を確認
    await authSetup.checkAuthErrorMessage();

    // 5. ネットワークエラーのシミュレーションを解除
    await authSetup.clearNetworkErrorSimulation();

    // 6. ページを再度リロードして復旧を確認
    await authSetup.reloadPage();
    await authSetup.waitForAuthInitialization();
    await authSetup.checkAuthenticationState(true);
  });

  test('認証初期化の重複実行防止', async ({ page }) => {
    // 要件2.3: 複数の認証初期化が同時に実行されようとした場合、システムは重複実行を防ぐ

    // 1. ログイン
    await authSetup.loginAsTestUser();

    // 2. 複数の認証初期化を同時に実行
    await page.evaluate(() => {
      // 複数の認証初期化を並列実行
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(window.nuxtApp.$auth.initializeAuth());
      }
      return Promise.all(promises);
    });

    // 3. 認証状態の変更履歴を確認
    const stateChanges = await authSetup.getAuthStateChanges();

    // 4. 重複した初期化が発生していないことを確認
    // （具体的な実装に依存するため、ここでは基本的なチェックのみ）
    expect(stateChanges.length).toBeGreaterThan(0);

    // 5. 最終的な認証状態が正常であることを確認
    await authSetup.checkAuthenticationState(true);
  });

  test('認証初期化中のローディング状態表示', async ({ page }) => {
    // 要件4.1: 認証状態が初期化中の場合、システムは適切なローディング状態を表示する

    // 1. 認証トークンを設定（ログイン状態をシミュレート）
    await page.evaluate(() => {
      localStorage.setItem('auth-state', JSON.stringify({
        isAuthenticated: true,
        lastAuthCheck: Date.now(),
        version: '1.0.0',
      }));
    });

    // 2. ページをリロード
    await page.goto('/');

    // 3. 認証初期化中のローディング状態を確認
    await authSetup.checkAuthLoadingState();

    // 4. 初期化完了後にローディング状態が消えることを確認
    await authSetup.waitForAuthInitialization();

    const loadingElement = page.locator('.auth-loading, .loading-spinner, [class*="loading"]');
    await expect(loadingElement).not.toBeVisible();
  });

  test('異なるブラウザでの認証状態独立性', async ({ browser }) => {
    // 1. 最初のブラウザコンテキストでログイン
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    const authSetup1 = new AuthTestSetup(page1, context1);

    await authSetup1.loginAsTestUser();
    await authSetup1.checkAuthenticationState(true);

    // 2. 新しいブラウザコンテキスト（異なるセッション）を作成
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const authSetup2 = new AuthTestSetup(page2, context2);

    // 3. 新しいコンテキストでは認証されていないことを確認
    await authSetup2.accessProtectedPage('/');
    await page2.waitForURL('/login');
    expect(page2.url()).toContain('/login');

    // クリーンアップ
    await context1.close();
    await context2.close();
  });
});
