/**
 * Client-side route middleware to check if user is authenticated
 * This middleware coordinates with the auth plugin to avoid duplicate initialization
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // テスト環境では認証をバイパス
  if (process.env.PLAYWRIGHT_TEST) {
    return;
  }

  // ログインページへのアクセスは認証チェックをスキップ
  if (to.path === '/login' || to.path === '/register') {
    return;
  }

  const { isAuthenticated, isInitialized, isLoading } = useAuth();

  // クライアントサイドでのみプラグイン初期化状態を確認
  if (import.meta.client) {
    try {
      // Nuxtアプリからプラグイン状態を取得
      const nuxtApp = useNuxtApp();
      const authPluginState = nuxtApp.$authPluginState as unknown;

      if (authPluginState) {
        // プラグインが初期化中の場合は完了を待機
        if ((authPluginState as any)?.isInitializing) {
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.log('ミドルウェア: プラグインの初期化完了を待機中');
          }

          // プラグインの初期化完了を待機（最大5秒）
          let waitCount = 0;
          const maxWait = 50; // 100ms × 50 = 5秒

          while ((authPluginState as any)?.isInitializing && waitCount < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;
          }
        }

        // プラグインが初期化されていない場合は短時間待機
        if (!(authPluginState as any)?.isInitialized) {
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.log('ミドルウェア: プラグインの初期化を待機中');
          }

          // プラグインの初期化完了を待機（最大3秒）
          let waitCount = 0;
          const maxWait = 30; // 100ms × 30 = 3秒

          while (!(authPluginState as { isInitialized?: boolean })?.isInitialized && waitCount < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;
          }
        }
      }

      // useAuthの初期化が未完了の場合は短時間待機
      if (!isInitialized.value && !isLoading.value) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('ミドルウェア: useAuthの初期化が未完了のため待機');
        }

        // 短時間待機してから再チェック（最大2秒）
        let waitCount = 0;
        const maxWait = 20; // 100ms × 20 = 2秒

        while (!isInitialized.value && !isLoading.value && waitCount < maxWait) {
          await new Promise(resolve => setTimeout(resolve, 100));
          waitCount++;
        }

        // まだ初期化されていない場合は警告ログを出力
        if (!isInitialized.value && process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('ミドルウェア: useAuthの初期化が完了しませんでした');
        }
      }
    }
    catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('ミドルウェア: プラグイン初期化状態の確認に失敗しました:', error);
      }
    }
  }

  // 認証状態をチェック
  if (!isAuthenticated.value) {
    // クライアントサイドでのみクッキーをチェック
    if (import.meta.client) {
      const accessToken = useCookie('access-token');
      const refreshTokenCookie = useCookie('refresh-token');

      // トークンが全くない場合はログインページにリダイレクト
      if (!accessToken.value && !refreshTokenCookie.value) {
        // リダイレクト先を保存
        const { saveRedirectForAuthRequired } = useRedirect();
        saveRedirectForAuthRequired(to.fullPath);

        // 現在のパスをクエリパラメータとして保存
        const redirectPath = to.path !== '/' ? `?redirect=${encodeURIComponent(to.path)}` : '';
        return navigateTo(`/login${redirectPath}`);
      }

      // トークンがある場合は、一時的な問題の可能性があるため
      // ユーザーを現在のページに留めておく
      // （認証状態は未認証として表示される）
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('ミドルウェア: トークンは存在するが認証状態が未認証 - 一時的な問題の可能性');
      }
    }
    else {
      // サーバーサイドでは認証状態のみでリダイレクト判定
      const redirectPath = to.path !== '/' ? `?redirect=${encodeURIComponent(to.path)}` : '';
      return navigateTo(`/login${redirectPath}`);
    }
  }
});
