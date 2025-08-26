/**
 * リダイレクト管理のためのcomposable
 * 自動ログイン成功時の適切なページ誘導を実装
 */

interface RedirectState {
  pendingRedirect: string | null;
  lastVisitedPath: string | null;
  redirectReason: 'login' | 'auth_required' | 'auto_login' | null;
}

const REDIRECT_STORAGE_KEY = 'nekolog_redirect_state';
const DEFAULT_REDIRECT_PATH = '/';
const EXCLUDED_PATHS = ['/login', '/register', '/logout'];

/**
 * リダイレクト管理composable
 */
export const useRedirect = () => {
  // リダイレクト状態の管理
  const redirectState = useState<RedirectState>('redirect.state', () => ({
    pendingRedirect: null,
    lastVisitedPath: null,
    redirectReason: null,
  }));

  /**
   * localStorage からリダイレクト状態を読み込み
   */
  const loadRedirectState = (): RedirectState | null => {
    if (!import.meta.client) {
      return null;
    }

    try {
      const stored = localStorage.getItem(REDIRECT_STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored);

      // データの有効性をチェック
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          pendingRedirect: typeof parsed.pendingRedirect === 'string' ? parsed.pendingRedirect : null,
          lastVisitedPath: typeof parsed.lastVisitedPath === 'string' ? parsed.lastVisitedPath : null,
          redirectReason: ['login', 'auth_required', 'auto_login'].includes(parsed.redirectReason)
            ? parsed.redirectReason
            : null,
        };
      }
    }
    catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('リダイレクト状態の読み込みに失敗:', error);
      }
    }

    return null;
  };

  /**
   * localStorage にリダイレクト状態を保存
   */
  const saveRedirectState = (state: RedirectState) => {
    if (!import.meta.client) {
      return;
    }

    try {
      localStorage.setItem(REDIRECT_STORAGE_KEY, JSON.stringify(state));
    }
    catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('リダイレクト状態の保存に失敗:', error);
      }
    }
  };

  /**
   * リダイレクト状態をクリア
   */
  const clearRedirectState = () => {
    redirectState.value = {
      pendingRedirect: null,
      lastVisitedPath: null,
      redirectReason: null,
    };

    if (import.meta.client) {
      try {
        localStorage.removeItem(REDIRECT_STORAGE_KEY);
      }
      catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('リダイレクト状態のクリアに失敗:', error);
        }
      }
    }
  };

  /**
   * パスが除外対象かどうかをチェック
   */
  const isExcludedPath = (path: string): boolean => {
    return EXCLUDED_PATHS.some(excludedPath =>
      path === excludedPath || path.startsWith(`${excludedPath}?`),
    );
  };

  /**
   * 有効なリダイレクトパスかどうかをチェック
   */
  const isValidRedirectPath = (path: string): boolean => {
    if (!path || typeof path !== 'string') {
      return false;
    }

    // 相対パスのみ許可（セキュリティ対策）
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
      return false;
    }

    // 除外パスでないことを確認
    if (isExcludedPath(path)) {
      return false;
    }

    // パスが / で始まることを確認
    if (!path.startsWith('/')) {
      return false;
    }

    return true;
  };

  /**
   * 現在のパスを最後に訪問したパスとして保存
   */
  const saveCurrentPath = (reason: RedirectState['redirectReason'] = null) => {
    if (!import.meta.client) {
      return;
    }

    const route = useRoute();
    const currentPath = route.fullPath;

    // 除外パスの場合は保存しない
    if (isExcludedPath(currentPath)) {
      return;
    }

    redirectState.value.lastVisitedPath = currentPath;
    redirectState.value.redirectReason = reason;

    saveRedirectState(redirectState.value);

    if (process.env.NODE_ENV === 'development') {
      console.log('現在のパスを保存:', currentPath, 'reason:', reason);
    }
  };

  /**
   * リダイレクト先を設定
   */
  const setPendingRedirect = (path: string, reason: RedirectState['redirectReason']) => {
    if (!isValidRedirectPath(path)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('無効なリダイレクトパス:', path);
      }
      return;
    }

    redirectState.value.pendingRedirect = path;
    redirectState.value.redirectReason = reason;

    saveRedirectState(redirectState.value);

    if (process.env.NODE_ENV === 'development') {
      console.log('リダイレクト先を設定:', path, 'reason:', reason);
    }
  };

  /**
   * 自動ログイン成功時の適切なリダイレクト先を取得
   */
  const getAutoLoginRedirectPath = (): string => {
    // 保存された状態を読み込み
    const savedState = loadRedirectState();
    if (savedState) {
      redirectState.value = savedState;
    }

    // 1. 保留中のリダイレクトがある場合はそれを優先
    if (redirectState.value.pendingRedirect && isValidRedirectPath(redirectState.value.pendingRedirect)) {
      const path = redirectState.value.pendingRedirect;
      if (process.env.NODE_ENV === 'development') {
        console.log('保留中のリダイレクトを使用:', path);
      }
      return path;
    }

    // 2. 最後に訪問したパスがある場合はそれを使用
    if (redirectState.value.lastVisitedPath && isValidRedirectPath(redirectState.value.lastVisitedPath)) {
      const path = redirectState.value.lastVisitedPath;
      if (process.env.NODE_ENV === 'development') {
        console.log('最後に訪問したパスを使用:', path);
      }
      return path;
    }

    // 3. クエリパラメータからリダイレクト先を取得
    if (import.meta.client) {
      const route = useRoute();
      const queryRedirect = route.query.redirect as string;
      if (queryRedirect && isValidRedirectPath(queryRedirect)) {
        if (process.env.NODE_ENV === 'development') {
          console.log('クエリパラメータのリダイレクトを使用:', queryRedirect);
        }
        return queryRedirect;
      }
    }

    // 4. デフォルトパスを返す
    if (process.env.NODE_ENV === 'development') {
      console.log('デフォルトパスを使用:', DEFAULT_REDIRECT_PATH);
    }
    return DEFAULT_REDIRECT_PATH;
  };

  /**
   * 自動ログイン成功時のリダイレクトを実行
   */
  const handleAutoLoginRedirect = async () => {
    if (!import.meta.client) {
      return;
    }

    const redirectPath = getAutoLoginRedirectPath();

    try {
      // リダイレクト状態をクリア（リダイレクト実行前）
      clearRedirectState();

      // リダイレクトを実行
      await navigateTo(redirectPath);

      if (process.env.NODE_ENV === 'development') {
        console.log('自動ログイン後のリダイレクト完了:', redirectPath);
      }
    }
    catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('自動ログイン後のリダイレクトに失敗:', error);
      }

      // フォールバックとしてホームページにリダイレクト
      try {
        await navigateTo(DEFAULT_REDIRECT_PATH);
      }
      catch (fallbackError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('フォールバックリダイレクトに失敗:', fallbackError);
        }
      }
    }
  };

  /**
   * 認証が必要なページへのアクセス時にリダイレクト先を保存
   */
  const saveRedirectForAuthRequired = (currentPath?: string) => {
    const route = useRoute();
    const pathToSave = currentPath || route.fullPath;

    if (isValidRedirectPath(pathToSave)) {
      setPendingRedirect(pathToSave, 'auth_required');
    }
  };

  /**
   * ログイン成功時のリダイレクトを実行
   */
  const handleLoginRedirect = async () => {
    if (!import.meta.client) {
      return;
    }

    const route = useRoute();
    const queryRedirect = route.query.redirect as string;

    // クエリパラメータのリダイレクト先を優先
    if (queryRedirect && isValidRedirectPath(queryRedirect)) {
      clearRedirectState();
      await navigateTo(queryRedirect);
      return;
    }

    // 保存されたリダイレクト先を使用
    const redirectPath = getAutoLoginRedirectPath();
    clearRedirectState();
    await navigateTo(redirectPath);
  };

  /**
   * 初期化処理（クライアントサイドでのみ実行）
   */
  const initializeRedirect = () => {
    if (!import.meta.client) {
      return;
    }

    // 保存された状態を読み込み
    const savedState = loadRedirectState();
    if (savedState) {
      redirectState.value = savedState;
    }
  };

  return {
    // 状態
    pendingRedirect: readonly(computed(() => redirectState.value.pendingRedirect)),
    lastVisitedPath: readonly(computed(() => redirectState.value.lastVisitedPath)),
    redirectReason: readonly(computed(() => redirectState.value.redirectReason)),

    // アクション
    saveCurrentPath,
    setPendingRedirect,
    getAutoLoginRedirectPath,
    handleAutoLoginRedirect,
    saveRedirectForAuthRequired,
    handleLoginRedirect,
    clearRedirectState,
    initializeRedirect,
    isValidRedirectPath,
  };
};
