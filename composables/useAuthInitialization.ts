import { useAuthPluginState } from '~/plugins/auth.client';

import type { useAuthPluginState } from '~/plugins/auth.client';

/**
 * 認証初期化状態を管理するコンポーザブル
 * アプリ全体での認証初期化プロセスの状態を提供
 */
export const useAuthInitialization = () => {
  // 認証初期化の状態管理
  const isInitializing = ref(false);
  const initializationError = ref<string | null>(null);
  const initializationMessage = ref('認証状態を確認しています...');

  // 認証とプラグインの状態を取得
  const auth = useAuth();

  // プラグインの初期化状態を取得（クライアントサイドでのみ）
  let pluginState: ReturnType<typeof useAuthPluginState> | null = null;

  if (import.meta.client) {
    try {
      // useAuthPluginStateコンポーザブルを使用
      pluginState = useAuthPluginState();
    }
    catch {
      // プラグインがまだ利用できない場合はnullのまま
      pluginState = null;
    }
  }

  // 初期化状態の計算プロパティ
  const isAuthInitializing = computed(() => {
    // サーバーサイドでは初期化中ではない
    if (!import.meta.client) {
      return false;
    }

    // プラグインが初期化中、またはuseAuthが初期化中の場合
    const pluginInitializing = pluginState?.isInitializing.value ?? false;
    const authLoading = auth.isLoading.value && !auth.isInitialized.value;

    return pluginInitializing || authLoading || isInitializing.value;
  });

  // 初期化エラーの計算プロパティ
  const authInitializationError = computed(() => {
    if (!import.meta.client) {
      return null;
    }

    // プラグインのエラーまたはローカルエラーを返す
    const pluginError = pluginState?.initializationError.value;
    const authError = auth.error.value;
    const localError = initializationError.value;

    return pluginError?.message || authError || localError;
  });

  // 初期化メッセージの計算プロパティ
  const currentInitializationMessage = computed(() => {
    if (!isAuthInitializing.value) {
      return '';
    }

    // エラーがある場合はエラーメッセージを表示
    if (authInitializationError.value) {
      return '認証の初期化でエラーが発生しました';
    }

    // プラグインが初期化中の場合
    if (pluginState?.isInitializing.value) {
      return 'アプリケーションを準備しています...';
    }

    // useAuthが初期化中の場合
    if (auth.isLoading.value && !auth.isInitialized.value) {
      return 'ログイン状態を確認しています...';
    }

    return initializationMessage.value;
  });

  /**
   * 認証初期化の完了を待機（簡素化）
   */
  const waitForInitialization = async (): Promise<void> => {
    if (!import.meta.client) {
      return;
    }

    try {
      isInitializing.value = true;
      initializationError.value = null;
      initializationMessage.value = 'アプリケーションを初期化しています...';

      // 基本的な待機のみ
      await nextTick();

      // useAuthの初期化を試行（エラーが発生しても継続）
      try {
        if (!auth.isInitialized.value) {
          initializationMessage.value = 'ログイン状態を確認しています...';
          await auth.initializeAuth();
        }
      }
      catch (authError) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('認証初期化でエラーが発生しましたが、処理を継続します:', authError);
        }
        // エラーが発生してもアプリケーションを使用可能にする
      }

      // 初期化完了
      if (process.env.NODE_ENV === 'development') {
        console.log('認証初期化プロセス完了');
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : '認証初期化に失敗しました';
      initializationError.value = errorMessage;

      if (process.env.NODE_ENV === 'development') {
        console.error('認証初期化エラー:', error);
      }
    }
    finally {
      isInitializing.value = false;
    }
  };

  /**
   * 初期化エラーをクリア
   */
  const clearInitializationError = () => {
    initializationError.value = null;
    auth.clearError();
  };

  /**
   * 初期化を再試行
   */
  const retryInitialization = async () => {
    clearInitializationError();
    await waitForInitialization();
  };

  return {
    // 状態
    isInitializing: readonly(isAuthInitializing),
    initializationError: readonly(authInitializationError),
    initializationMessage: readonly(currentInitializationMessage),

    // アクション
    waitForInitialization,
    clearInitializationError,
    retryInitialization,
  };
};
