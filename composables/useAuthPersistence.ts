/**
 * 認証状態の永続化を管理するcomposable
 * ブラウザのlocalStorageを使用してログイン状態を記憶する
 */

interface PersistedAuthState {
  isAuthenticated: boolean;
  lastAuthCheck: number;
  userEmail?: string;
  version: string; // スキーマバージョン管理
}

// 古いバージョンのインターフェース（v1.0.0以前）
interface LegacyPersistedAuthState {
  isAuthenticated: boolean;
  lastAuthCheck: number;
  userEmail?: string;
}

const AUTH_STORAGE_KEY = 'nekolog-auth-state';
const AUTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5分
const CURRENT_SCHEMA_VERSION = '1.1.0'; // 現在のスキーマバージョン

export const useAuthPersistence = () => {
  /**
   * 古いバージョンのデータを新しい形式に移行
   */
  const migrateAuthState = (data: unknown): PersistedAuthState | null => {
    try {
      // データ型の基本チェック
      if (typeof data !== 'object' || data === null) {
        return null;
      }

      const dataObj = data as Record<string, unknown>;

      // バージョン情報がない場合は古い形式として扱う
      if (!dataObj.version) {
        // 古い形式の必須フィールドチェック
        if (typeof dataObj.isAuthenticated !== 'boolean'
          || typeof dataObj.lastAuthCheck !== 'number') {
          return null;
        }

        const legacyData: LegacyPersistedAuthState = {
          isAuthenticated: dataObj.isAuthenticated,
          lastAuthCheck: dataObj.lastAuthCheck,
          userEmail: typeof dataObj.userEmail === 'string' ? dataObj.userEmail : undefined,
        };

        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.info('認証状態データを新しい形式に移行しています...');
        }

        return {
          isAuthenticated: legacyData.isAuthenticated,
          lastAuthCheck: legacyData.lastAuthCheck,
          userEmail: legacyData.userEmail,
          version: CURRENT_SCHEMA_VERSION,
        };
      }

      // 既に新しい形式の場合はそのまま返す
      if (dataObj.version === CURRENT_SCHEMA_VERSION) {
        // 新しい形式の必須フィールドチェック
        if (typeof dataObj.isAuthenticated !== 'boolean'
          || typeof dataObj.lastAuthCheck !== 'number'
          || typeof dataObj.version !== 'string') {
          return null;
        }

        return {
          isAuthenticated: dataObj.isAuthenticated,
          lastAuthCheck: dataObj.lastAuthCheck,
          userEmail: typeof dataObj.userEmail === 'string' ? dataObj.userEmail : undefined,
          version: dataObj.version,
        };
      }

      // 将来的に他のバージョンからの移行が必要な場合はここに追加
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn(`未対応のスキーマバージョンです: ${dataObj.version}`);
      }

      return null;
    }
    catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('データ移行中にエラーが発生しました:', error);
      }
      return null;
    }
  };

  /**
   * localStorage操作の安全性をチェック
   */
  const isLocalStorageAvailable = (): boolean => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }

      // localStorage書き込みテスト
      const testKey = '__nekolog_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    }
    catch {
      return false;
    }
  };

  /**
   * 認証状態をlocalStorageに保存
   */
  const saveAuthState = (isAuthenticated: boolean, userEmail?: string) => {
    if (!import.meta.client || !isLocalStorageAvailable()) {
      return;
    }

    try {
      const state: PersistedAuthState = {
        isAuthenticated,
        lastAuthCheck: Date.now(),
        userEmail,
        version: CURRENT_SCHEMA_VERSION,
      };

      const serializedState = JSON.stringify(state);

      // データサイズチェック（localStorageの制限を考慮）
      if (serializedState.length > 5000) { // 5KB制限
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('認証状態データが大きすぎます。保存をスキップします。');
        }
        return;
      }

      localStorage.setItem(AUTH_STORAGE_KEY, serializedState);
    }
    catch (error) {
      // localStorage容量不足やプライベートブラウジングモードなどのエラーハンドリング
      if (error instanceof DOMException) {
        if (error.name === 'QuotaExceededError') {
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.warn('localStorage容量不足のため認証状態を保存できませんでした');
          }
          // 古いデータをクリアして再試行
          try {
            localStorage.clear();
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
              isAuthenticated,
              lastAuthCheck: Date.now(),
              userEmail,
              version: CURRENT_SCHEMA_VERSION,
            }));
          }
          catch (retryError) {
            if (process.env.NODE_ENV === 'development') {
              // eslint-disable-next-line no-console
              console.error('認証状態の保存に完全に失敗しました:', retryError);
            }
          }
        }
        else {
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.warn('localStorage操作が制限されています:', error.message);
          }
        }
      }
      else {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('認証状態の保存中に予期しないエラーが発生しました:', error);
        }
      }
    }
  };

  /**
   * localStorageから認証状態を読み込み
   */
  const loadAuthState = (): PersistedAuthState | null => {
    if (!import.meta.client || !isLocalStorageAvailable()) {
      return null;
    }

    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) {
        return null;
      }

      // JSON解析エラーのハンドリング
      let rawData: unknown;
      try {
        rawData = JSON.parse(stored);
      }
      catch (parseError) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('認証状態データが破損しています。クリアします:', parseError);
        }
        // 破損したデータをクリア
        clearAuthState();
        return null;
      }

      // データ型チェック
      if (typeof rawData !== 'object' || rawData === null) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('認証状態データの形式が不正です。クリアします。');
        }
        clearAuthState();
        return null;
      }

      // データ移行処理を実行
      const migratedState = migrateAuthState(rawData);
      if (!migratedState) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('認証状態データの移行に失敗しました。クリアします。');
        }
        clearAuthState();
        return null;
      }

      // 必須フィールドの存在チェック
      if (typeof migratedState.isAuthenticated !== 'boolean'
        || typeof migratedState.lastAuthCheck !== 'number') {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('認証状態データに必須フィールドが不足しています。クリアします。');
        }
        clearAuthState();
        return null;
      }

      // 古すぎる認証状態は無効とする
      if (Date.now() - migratedState.lastAuthCheck > AUTH_CHECK_INTERVAL) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.info('認証状態が古すぎるため無効化します。');
        }
        clearAuthState();
        return null;
      }

      // 移行されたデータを保存（古い形式から新しい形式に更新）
      const rawDataObj = rawData as Record<string, unknown>;
      if (!rawDataObj.version || rawDataObj.version !== CURRENT_SCHEMA_VERSION) {
        saveAuthState(migratedState.isAuthenticated, migratedState.userEmail);
      }

      return migratedState;
    }
    catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('認証状態の読み込み中に予期しないエラーが発生しました:', error);
      }

      // エラー時は安全のためデータをクリア
      try {
        clearAuthState();
      }
      catch (clearError) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('認証状態のクリアにも失敗しました:', clearError);
        }
      }

      return null;
    }
  };

  /**
   * 認証状態をクリア
   */
  const clearAuthState = () => {
    if (!import.meta.client || !isLocalStorageAvailable()) {
      return;
    }

    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('認証状態のクリアに失敗しました:', error);
      }

      // removeItemが失敗した場合、空の値で上書きを試行
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, '');
      }
      catch (setError) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('認証状態の上書きクリアにも失敗しました:', setError);
        }
      }
    }
  };

  /**
   * 保存された認証状態が有効かチェック
   */
  const hasValidPersistedAuth = (): boolean => {
    const state = loadAuthState();
    return state?.isAuthenticated === true;
  };

  return {
    saveAuthState,
    loadAuthState,
    clearAuthState,
    hasValidPersistedAuth,
  };
};
