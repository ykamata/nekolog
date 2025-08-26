import type { Page, BrowserContext } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * 認証関連のE2Eテストユーティリティクラス
 */
export class AuthTestSetup {
  constructor(
    private page: Page,
    private context: BrowserContext,
  ) {}

  /**
   * テスト用ユーザーでログインする
   */
  async loginAsTestUser(email = 'test@example.com', password = 'password123'): Promise<void> {
    await this.page.goto('/login');

    // ページの読み込み完了を待つ
    await this.page.waitForLoadState('networkidle');

    // ログインフォームが表示されるまで待つ
    await this.page.waitForSelector('#email', { state: 'visible' });
    await this.page.waitForSelector('#password', { state: 'visible' });

    // ログインフォームの入力
    await this.page.fill('#email', email);
    await this.page.fill('#password', password);

    // ログインボタンをクリックして認証APIの応答を待つ
    const [response] = await Promise.all([
      this.page.waitForResponse('/api/auth/login'),
      this.page.click('button[type="submit"]'),
    ]);

    // ログイン成功を確認
    expect(response.ok()).toBeTruthy();

    // ダッシュボードまたはホームページにリダイレクトされることを確認
    await this.page.waitForURL(/\/(dashboard|index|$|cats|foods|meals)/);
  }

  /**
   * ログアウトする
   */
  async logout(): Promise<void> {
    // ログアウトボタンまたはメニューを探してクリック
    const logoutButton = this.page.locator('button:has-text("ログアウト"), a:has-text("ログアウト")');

    if (await logoutButton.count() > 0) {
      const [response] = await Promise.all([
        this.page.waitForResponse('/api/auth/logout'),
        logoutButton.click(),
      ]);

      expect(response.ok()).toBeTruthy();
    }

    // ログインページにリダイレクトされることを確認
    await this.page.waitForURL('/login');
  }

  /**
   * 認証状態を確認する
   */
  async checkAuthenticationState(expectedAuthenticated: boolean): Promise<void> {
    // /api/auth/me エンドポイントを呼び出して認証状態を確認
    const response = await this.page.request.get('/api/auth/me');

    if (expectedAuthenticated) {
      expect(response.ok()).toBeTruthy();
      const userData = await response.json();
      expect(userData).toHaveProperty('id');
      expect(userData).toHaveProperty('email');
    }
    else {
      expect(response.status()).toBe(401);
    }
  }

  /**
   * ブラウザをリロードする
   */
  async reloadPage(): Promise<void> {
    await this.page.reload({ waitUntil: 'networkidle' });
  }

  /**
   * 新しいタブを開く
   */
  async openNewTab(): Promise<Page> {
    const newPage = await this.context.newPage();
    return newPage;
  }

  /**
   * ローカルストレージの認証データを確認する
   */
  async checkLocalStorageAuth(): Promise<boolean> {
    try {
      // ページが読み込まれていることを確認
      await this.page.waitForLoadState('domcontentloaded');

      const authData = await this.page.evaluate(() => {
        try {
          const data = localStorage.getItem('auth-state');
          return data ? JSON.parse(data) : null;
        }
        catch (error) {
          return null;
        }
      });

      return authData && authData.isAuthenticated === true;
    }
    catch (error) {
      console.warn('LocalStorage access failed:', error);
      return false;
    }
  }

  /**
   * クッキーの認証トークンを確認する
   */
  async checkAuthCookies(): Promise<{ hasAccessToken: boolean; hasRefreshToken: boolean }> {
    const cookies = await this.context.cookies();

    const hasAccessToken = cookies.some(cookie => cookie.name === 'access-token');
    const hasRefreshToken = cookies.some(cookie => cookie.name === 'refresh-token');

    return { hasAccessToken, hasRefreshToken };
  }

  /**
   * 認証トークンをクリアする
   */
  async clearAuthTokens(): Promise<void> {
    try {
      // クッキーをクリア
      await this.context.clearCookies();

      // ローカルストレージをクリア（エラーハンドリング付き）
      await this.page.evaluate(() => {
        try {
          localStorage.removeItem('auth-state');
        }
        catch (error) {
          // LocalStorage access might be restricted
          console.warn('Failed to clear localStorage:', error);
        }
      });
    }
    catch (error) {
      console.warn('Failed to clear auth tokens:', error);
    }
  }

  /**
   * 認証が必要なページにアクセスして認証状態を確認する
   */
  async accessProtectedPage(path = '/'): Promise<void> {
    await this.page.goto(path);

    // 認証されている場合はページが表示される
    // 認証されていない場合はログインページにリダイレクトされる
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 認証初期化の完了を待つ
   */
  async waitForAuthInitialization(): Promise<void> {
    try {
      // 認証初期化が完了するまで待機
      await this.page.waitForFunction(() => {
        // Nuxtアプリケーションが利用可能で、認証が初期化されているかチェック
        return window.nuxtApp
          && window.nuxtApp.$auth
          && window.nuxtApp.$auth.isInitialized;
      }, { timeout: 10000 });
    }
    catch (error) {
      // 初期化チェックが失敗した場合は、単純に時間待ちする
      console.warn('Auth initialization check failed, using fallback wait:', error);
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * ネットワークエラーをシミュレートする
   */
  async simulateNetworkError(): Promise<void> {
    await this.page.route('/api/auth/**', (route) => {
      route.abort('failed');
    });
  }

  /**
   * ネットワークエラーのシミュレーションを解除する
   */
  async clearNetworkErrorSimulation(): Promise<void> {
    await this.page.unroute('/api/auth/**');
  }

  /**
   * 認証エラーメッセージの表示を確認する
   */
  async checkAuthErrorMessage(expectedMessage?: string): Promise<void> {
    const errorElement = this.page.locator('.auth-error, .error-message, [class*="error"], .global-error');
    await expect(errorElement).toBeVisible();

    if (expectedMessage) {
      await expect(errorElement).toContainText(expectedMessage);
    }
  }

  /**
   * 認証ローディング状態の表示を確認する
   */
  async checkAuthLoadingState(): Promise<void> {
    const loadingElement = this.page.locator('.auth-loading, .loading-spinner, [class*="loading"]');
    await expect(loadingElement).toBeVisible();
  }

  /**
   * 認証状態の変更を監視する
   */
  async monitorAuthStateChanges(): Promise<void> {
    await this.page.addInitScript(() => {
      window.authStateChanges = [];

      // 認証状態の変更を記録する簡単な仕組み
      const originalConsoleLog = console.log;
      console.log = function (...args) {
        if (args[0] && typeof args[0] === 'string' && args[0].includes('auth')) {
          window.authStateChanges.push({
            timestamp: Date.now(),
            message: args.join(' '),
          });
        }
        return originalConsoleLog.apply(console, args);
      };
    });
  }

  /**
   * 記録された認証状態の変更を取得する
   */
  async getAuthStateChanges(): Promise<any[]> {
    try {
      return await this.page.evaluate(() => window.authStateChanges || []);
    }
    catch (error) {
      console.warn('Failed to get auth state changes:', error);
      return [];
    }
  }

  /**
   * テスト用ユーザーを作成する（必要に応じて）
   */
  async createTestUser(email = 'test@example.com', password = 'password123'): Promise<void> {
    try {
      // ユーザー登録APIを呼び出し
      const response = await this.page.request.post('/api/auth/register', {
        data: {
          email,
          password,
          name: 'Test User',
        },
      });

      // 既に存在する場合は無視
      if (response.status() === 409) {
        console.log('Test user already exists');
        return;
      }

      expect(response.ok()).toBeTruthy();
    }
    catch (error) {
      console.warn('Failed to create test user:', error);
    }
  }
}
