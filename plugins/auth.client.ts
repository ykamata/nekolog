// プラグイン初期化状態の管理
interface PluginInitializationState {
  isInitialized: boolean;
  isInitializing: boolean;
  initializationError: Error | null;
  initializationPromise: Promise<void> | null;
}

// グローバルな初期化状態（プラグインレベル）
const pluginState: PluginInitializationState = {
  isInitialized: false,
  isInitializing: false,
  initializationError: null,
  initializationPromise: null,
};

/**
 * Client-side authentication plugin
 * Provides authentication state management and user session handling
 */
export default defineNuxtPlugin({
  name: 'auth-client',
  parallel: false,
  async setup() {
    const auth = useAuth();

    // クライアントサイドでのみ実行
    if (import.meta.client) {
      // 既に初期化済みまたは初期化中の場合は既存のPromiseを返す
      if (pluginState.isInitialized) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('認証プラグインは既に初期化済みです');
        }
        return {
          provide: {
            auth,
            authPluginState: readonly(pluginState),
          },
        };
      }

      if (pluginState.isInitializing && pluginState.initializationPromise) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('認証プラグインの初期化を待機中です');
        }
        await pluginState.initializationPromise;
        return {
          provide: {
            auth,
            authPluginState: readonly(pluginState),
          },
        };
      }

      // 新しい初期化を開始
      pluginState.isInitializing = true;
      pluginState.initializationError = null;

      const initPromise = (async () => {
        // 認証プロセスの追跡を開始
        let processId = '';
        if (process.env.NODE_ENV === 'development') {
          try {
            const { startAuthProcess } = useAuthDebug();
            processId = startAuthProcess('PLUGIN_INITIALIZATION');
          }
          catch {
            // デバッグログでエラーが発生しても処理を継続
          }
        }

        try {
          if (process.env.NODE_ENV === 'development') {
            try {
              const { logAuthStep } = useAuthDebug();
              logAuthStep(processId, 'PLUGIN_INIT_START');
            }
            catch {
              // デバッグログでエラーが発生しても処理を継続
            }
            // eslint-disable-next-line no-console
            console.log('認証プラグインの初期化を開始します');
          }

          // 基本的なハイドレーション待機
          await nextTick();

          // デバッグログ: ハイドレーション完了
          if (process.env.NODE_ENV === 'development') {
            try {
              const { logAuthStep } = useAuthDebug();
              logAuthStep(processId, 'HYDRATION_COMPLETE', {}, true);
            }
            catch {
              // デバッグログでエラーが発生しても処理を継続
            }
          }

          // 認証状態の初期化（簡素化）
          if (process.env.NODE_ENV === 'development') {
            try {
              const { logAuthStep } = useAuthDebug();
              logAuthStep(processId, 'AUTH_INIT_START');
            }
            catch {
              // デバッグログでエラーが発生しても処理を継続
            }
            console.log('認証状態の初期化を開始');
          }

          // 認証状態の初期化を実行（エラーが発生しても継続）
          try {
            await auth.initializeAuth();

            if (process.env.NODE_ENV === 'development') {
              console.log('認証状態の初期化完了');
            }
          }
          catch (authError) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('認証状態の初期化でエラーが発生しましたが、処理を継続します:', authError);
            }
          }

          // リダイレクト機能の初期化（簡素化）
          try {
            const { initializeRedirect } = useRedirect();
            initializeRedirect();

            if (process.env.NODE_ENV === 'development') {
              console.log('リダイレクト機能の初期化完了');
            }
          }
          catch (redirectError) {
            if (process.env.NODE_ENV === 'development') {

            }
          }

          // 初期化成功
          pluginState.isInitialized = true;
          pluginState.initializationError = null;

          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.log('認証プラグインの初期化が完了しました');
          }
        }
        catch (error) {
          // 初期化エラーを記録
          pluginState.initializationError = error instanceof Error ? error : new Error(String(error));

          // デバッグログ: プラグイン初期化エラー
          if (process.env.NODE_ENV === 'development') {
            try {
              const { logAuthStep, logAuthError } = useAuthDebug();
              logAuthError(error, 'プラグイン初期化エラー', { processId });
              logAuthStep(processId, 'PLUGIN_INIT_ERROR', {
                errorMessage: error instanceof Error ? error.message : String(error),
              }, false, 'Plugin initialization failed');
            }
            catch {
              // デバッグログでエラーが発生しても処理を継続
            }
          }

          // 初期化に失敗した場合でもエラーを投げない
          // ユーザーが再度ログインできるようにする
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.warn('認証状態の初期化に失敗しました:', error);
          }

          // エラーが発生しても初期化済みとしてマーク（再試行を防ぐため）
          pluginState.isInitialized = true;
        }
        finally {
          pluginState.isInitializing = false;
          pluginState.initializationPromise = null;

          // デバッグログ: プロセス完了
          if (process.env.NODE_ENV === 'development') {
            try {
              const { endAuthProcess } = useAuthDebug();
              endAuthProcess(processId, pluginState.isInitialized && !pluginState.initializationError, {
                finalState: {
                  isInitialized: pluginState.isInitialized,
                  hasError: !!pluginState.initializationError,
                  errorMessage: pluginState.initializationError?.message,
                },
              });
            }
            catch {
              // デバッグログでエラーが発生しても処理を継続
            }
          }
        }
      })();

      pluginState.initializationPromise = initPromise;
      await initPromise;
    }

    // 認証状態とプラグイン状態をグローバルに提供
    return {
      provide: {
        auth,
        authPluginState: readonly(pluginState),
      },
    };
  },
});

/**
 * Nuxtのハイドレーション完了を確実に待機する関数
 * nextTick()だけでは不十分な場合があるため、より堅牢な方法を使用
 */
async function waitForHydration(): Promise<void> {
  // 複数の方法でハイドレーション完了を確認

  // 1. nextTickで基本的なVueの更新サイクルを待機
  await nextTick();

  // 2. Nuxtアプリのハイドレーション状態を確認
  const nuxtApp = useNuxtApp();

  // 3. ハイドレーションが完了するまで待機
  if (nuxtApp.isHydrating) {
    await new Promise<void>((resolve) => {
      // ハイドレーション完了を監視
      const checkHydration = () => {
        if (!nuxtApp.isHydrating) {
          resolve();
        }
        else {
          // 次のフレームで再チェック
          requestAnimationFrame(checkHydration);
        }
      };
      checkHydration();
    });
  }

  // 4. DOMの準備完了も確認（追加の安全性のため）
  if (document.readyState !== 'complete') {
    await new Promise<void>((resolve) => {
      const handleLoad = () => {
        document.removeEventListener('DOMContentLoaded', handleLoad);
        window.removeEventListener('load', handleLoad);
        resolve();
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleLoad);
      }
      else {
        // すでにDOMContentLoadedが発火済みの場合はloadイベントを待機
        window.addEventListener('load', handleLoad);
      }

      // タイムアウト保護（最大5秒）
      setTimeout(handleLoad, 5000);
    });
  }

  // 5. 最終的な安全性のため、もう一度nextTickを実行
  await nextTick();

  // デバッグログ（開発環境のみ）
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('ハイドレーション完了を確認しました');
  }
}
/**
 * プラグイン初期化状態を取得するコンポーザブル
 */
export const useAuthPluginState = () => {
  const nuxtApp = useNuxtApp();

  // プラグインから提供された状態を取得
  const authPluginState = nuxtApp.$authPluginState as typeof pluginState | undefined;

  if (!authPluginState) {
    // プラグインがまだ初期化されていない場合のデフォルト状態
    return {
      isInitialized: ref(false),
      isInitializing: ref(false),
      initializationError: ref(null),
      waitForInitialization: async () => {
        // プラグインの初期化を待機
        while (!nuxtApp.$authPluginState) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      },
    };
  }

  return {
    isInitialized: computed(() => authPluginState.isInitialized),
    isInitializing: computed(() => authPluginState.isInitializing),
    initializationError: computed(() => authPluginState.initializationError),
    waitForInitialization: async () => {
      // 既に初期化済みの場合はすぐに返す
      if (authPluginState.isInitialized) {
        return;
      }

      // 初期化中の場合は完了を待機
      if (authPluginState.isInitializing && authPluginState.initializationPromise) {
        await authPluginState.initializationPromise;
      }
    },
  };
};
