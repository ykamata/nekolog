/**
 * テスト環境用の認証バイパスミドルウェア
 * E2Eテスト実行時に認証を無効化する
 */

export default defineNuxtRouteMiddleware((to) => {
  // テスト環境でのみ動作
  if (!process.env.PLAYWRIGHT_TEST) {
    return;
  }

  // ログインページ以外で認証をバイパス
  if (to.path !== '/login' && to.path !== '/register') {
    // 認証状態を直接設定
    if (import.meta.client) {
      const authState = useState('auth.state', () => ({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }));

      // 認証状態を更新
      authState.value.user = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      };
      authState.value.isAuthenticated = true;
      authState.value.isLoading = false;
      authState.value.error = null;
    }
  }
});
